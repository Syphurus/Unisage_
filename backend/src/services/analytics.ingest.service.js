/**
 * @fileoverview Analytics ingestion service.
 *
 * Three write paths:
 *   1. recordHeartbeat()        — reading-time / scroll / sections
 *   2. recordEvents()           — generic learning_events bulk insert
 *   3. recordFlashcardReviews() — flashcard rating batch insert
 *
 * All three are write-optimized: bounded request size, no extra reads where
 * a single upsert / insert will do, no recomputation. Aggregation happens
 * later in pg_cron (see migration 003).
 */

const { supabase } = require("../config/database");
const logger = require("../utils/logger");

// Cap the time we'll accept between two heartbeats for the same in-flight
// session. If the gap is bigger, the client probably backgrounded for a
// long time — we end the old session so the new delta starts a clean one.
const STALE_HEARTBEAT_MS = 5 * 60 * 1000; // 5 min

/**
 * Resolve subject_id for a content row. Cheap targeted lookup; result is
 * cached on the supabase HTTP layer indirectly. Returns null if the content
 * has no subject (shouldn't happen but defensive).
 *
 * @param {string} contentId
 * @returns {Promise<string|null>}
 */
async function resolveSubjectIdForContent(contentId) {
  if (!contentId) return null;
  const { data, error } = await supabase
    .from("content")
    .select("subject_id, units!content_unit_id_fkey(subject_id)")
    .eq("id", contentId)
    .maybeSingle();
  if (error || !data) return null;
  return data.subject_id || data.units?.subject_id || null;
}

/**
 * Upsert a heartbeat into reading_sessions.
 *
 * Behavior:
 *  - If an in-flight (ended_at IS NULL) session exists for (user, content)
 *    AND its last_heartbeat_at is recent: accumulate into it.
 *  - Otherwise: insert a new in-flight row.
 *  - When end=true: close the row (set ended_at).
 *
 * The dual lookup-then-write is two round-trips, but each is an indexed
 * point-read and the alternative (DB-side upsert with ON CONFLICT on a
 * partial uniqueness predicate) requires a Postgres feature Supabase JS
 * doesn't expose cleanly. The cron's stale-session reaper backstops any
 * orphans, so correctness is preserved.
 *
 * @param {string} userId
 * @param {{
 *   contentId: string,
 *   subjectId?: string|null,
 *   sessionId?: string|null,
 *   deltaActiveSeconds: number,
 *   maxScrollPct?: number,
 *   sectionsViewed?: string[],
 *   clientMeta?: object,
 *   end?: boolean,
 * }} body
 * @returns {Promise<{ sessionId: string, totalActiveSeconds: number }>}
 */
async function recordHeartbeat(userId, body) {
  const {
    contentId,
    subjectId: explicitSubjectId,
    sessionId: incomingSessionId,
    deltaActiveSeconds,
    maxScrollPct = 0,
    sectionsViewed = [],
    clientMeta,
    end = false,
  } = body;

  // Resolve subject if not provided. Don't fail the heartbeat if we can't —
  // tracking still works, just without subject roll-up.
  let subjectId = explicitSubjectId || null;
  if (!subjectId) {
    subjectId = await resolveSubjectIdForContent(contentId);
  }

  // Find the open session — preferring the explicit sessionId from the
  // client (set after the first heartbeat returns one), falling back to
  // "most recent open row for this (user, content)".
  let existing = null;
  if (incomingSessionId) {
    const { data } = await supabase
      .from("reading_sessions")
      .select("id, active_seconds, max_scroll_pct, sections_viewed, last_heartbeat_at, ended_at")
      .eq("id", incomingSessionId)
      .eq("user_id", userId)
      .maybeSingle();
    if (data && !data.ended_at) existing = data;
  }
  if (!existing) {
    const { data } = await supabase
      .from("reading_sessions")
      .select("id, active_seconds, max_scroll_pct, sections_viewed, last_heartbeat_at")
      .eq("user_id", userId)
      .eq("content_id", contentId)
      .is("ended_at", null)
      .order("last_heartbeat_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) existing = data;
  }

  // If the existing session has gone stale, close it first and start fresh.
  if (existing && existing.last_heartbeat_at) {
    const ageMs = Date.now() - new Date(existing.last_heartbeat_at).getTime();
    if (ageMs > STALE_HEARTBEAT_MS) {
      await supabase
        .from("reading_sessions")
        .update({ ended_at: existing.last_heartbeat_at })
        .eq("id", existing.id);
      existing = null;
    }
  }

  const nowIso = new Date().toISOString();

  if (!existing) {
    // Open a new session row.
    const { data, error } = await supabase
      .from("reading_sessions")
      .insert({
        user_id: userId,
        content_id: contentId,
        subject_id: subjectId,
        started_at: nowIso,
        last_heartbeat_at: nowIso,
        ended_at: end ? nowIso : null,
        active_seconds: Math.max(0, deltaActiveSeconds | 0),
        max_scroll_pct: Math.min(100, Math.max(0, maxScrollPct | 0)),
        sections_viewed: dedupSections(sectionsViewed),
        client_meta: clientMeta || null,
      })
      .select("id, active_seconds")
      .single();
    if (error) throw error;
    return { sessionId: data.id, totalActiveSeconds: data.active_seconds };
  }

  // Accumulate into the existing session.
  const mergedSections = mergeSections(existing.sections_viewed || [], sectionsViewed);
  const newActive = (existing.active_seconds | 0) + Math.max(0, deltaActiveSeconds | 0);
  const newScroll = Math.min(
    100,
    Math.max(existing.max_scroll_pct | 0, maxScrollPct | 0)
  );

  const { error } = await supabase
    .from("reading_sessions")
    .update({
      last_heartbeat_at: nowIso,
      active_seconds: newActive,
      max_scroll_pct: newScroll,
      sections_viewed: mergedSections,
      ...(end ? { ended_at: nowIso } : {}),
    })
    .eq("id", existing.id);
  if (error) throw error;

  return { sessionId: existing.id, totalActiveSeconds: newActive };
}

function dedupSections(arr) {
  if (!Array.isArray(arr)) return [];
  return Array.from(new Set(arr.filter((s) => typeof s === "string"))).slice(0, 200);
}

function mergeSections(prev, incoming) {
  const out = new Set(Array.isArray(prev) ? prev : []);
  if (Array.isArray(incoming)) {
    for (const s of incoming) {
      if (typeof s === "string") out.add(s);
      if (out.size >= 200) break;
    }
  }
  return Array.from(out);
}


/**
 * Bulk-insert learning_events. Server normalizes occurredAt and resolves
 * subject_id from contentId where missing.
 *
 * @param {string} userId
 * @param {Array<{ type: string, contentId?: string, subjectId?: string, payload?: object, occurredAt?: string }>} events
 * @returns {Promise<number>} number of rows inserted
 */
async function recordEvents(userId, events) {
  if (!Array.isArray(events) || events.length === 0) return 0;

  // Collect unique contentIds that are missing subjectId so we can resolve
  // them in one batched lookup instead of N round-trips.
  const contentIdsNeedingSubject = Array.from(
    new Set(
      events
        .filter((e) => e.contentId && !e.subjectId)
        .map((e) => e.contentId)
    )
  );

  let subjectByContent = new Map();
  if (contentIdsNeedingSubject.length > 0) {
    const { data } = await supabase
      .from("content")
      .select("id, subject_id, units!content_unit_id_fkey(subject_id)")
      .in("id", contentIdsNeedingSubject);
    for (const row of data || []) {
      const sid = row.subject_id || row.units?.subject_id || null;
      if (sid) subjectByContent.set(row.id, sid);
    }
  }

  const nowMs = Date.now();
  const rows = events.map((e) => {
    let occurredAt = nowMs;
    if (e.occurredAt) {
      const parsed = Date.parse(e.occurredAt);
      // Reject obviously bad timestamps; default to "now".
      if (
        Number.isFinite(parsed) &&
        parsed <= nowMs + 60_000 &&
        parsed >= nowMs - 60 * 60 * 1000
      ) {
        occurredAt = parsed;
      }
    }
    return {
      user_id: userId,
      content_id: e.contentId || null,
      subject_id:
        e.subjectId ||
        (e.contentId ? subjectByContent.get(e.contentId) || null : null),
      type: String(e.type).slice(0, 64),
      payload: e.payload && typeof e.payload === "object" ? e.payload : null,
      occurred_at: new Date(occurredAt).toISOString(),
    };
  });

  const { error } = await supabase.from("learning_events").insert(rows);
  if (error) throw error;
  return rows.length;
}


/**
 * Bulk-insert flashcard reviews from a finished review session.
 *
 * @param {string} userId
 * @param {string} contentId
 * @param {Array<{ cardIndex: number, rating: 'forgot'|'shaky'|'confident', responseMs?: number|null }>} reviews
 * @returns {Promise<number>}
 */
async function recordFlashcardReviews(userId, contentId, reviews) {
  if (!Array.isArray(reviews) || reviews.length === 0) return 0;

  const rows = reviews.map((r) => ({
    user_id: userId,
    content_id: contentId,
    card_index: r.cardIndex | 0,
    rating: r.rating,
    response_ms: r.responseMs == null ? null : r.responseMs | 0,
  }));

  const { error } = await supabase.from("flashcard_reviews").insert(rows);
  if (error) throw error;

  // Best-effort: also mark the deck as completed in user_progress so
  // existing "% complete" computations and the rollup pick it up.
  // Fire-and-forget; failure here doesn't fail the request.
  supabase
    .from("user_progress")
    .upsert(
      {
        user_id: userId,
        content_id: contentId,
        completed: true,
        time_spent: 0,
        last_accessed: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      },
      { onConflict: "user_id,content_id", ignoreDuplicates: false }
    )
    .then(() => {})
    .catch((err) =>
      logger.warn("flashcard_reviews progress upsert failed", {
        error: err.message,
      })
    );

  return rows.length;
}

module.exports = {
  recordHeartbeat,
  recordEvents,
  recordFlashcardReviews,
};
