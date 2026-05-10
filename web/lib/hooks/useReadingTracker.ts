"use client";

import { useEffect, useRef } from "react";
import { analyticsAPI } from "@/lib/api";

/**
 * Active-reading tracker.
 *
 * Counts ONLY "active" seconds — the user must be on this tab AND not
 * idle. The previous naive approach (`setInterval(post 15s, every 15s)`)
 * billed open-but-untouched tabs as study time; this hook eliminates that
 * inflation by gating accumulation on:
 *
 *   - Page Visibility (tab is visible)
 *   - User input within the last `idleThresholdMs`
 *
 * Sends a delta heartbeat at most every `heartbeatIntervalMs`, and a final
 * flush via `fetch(..., { keepalive: true })` on `pagehide` so the last
 * delta is captured even when the user closes the tab. Returns nothing —
 * the hook is purely a side-effect.
 *
 * Server bounds the accepted delta to 330s (validators.heartbeat) so a
 * misbehaving client can't inflate metrics.
 *
 * @example
 *   useReadingTracker({ contentId, subjectId });
 */
export interface ReadingTrackerOptions {
  contentId: string;
  subjectId?: string | null;
  /** Default 30s — heartbeat cadence when there's something to report. */
  heartbeatIntervalMs?: number;
  /** Default 60s — no input for this long → user is "idle". */
  idleThresholdMs?: number;
  /**
   * Optional: provide a function that returns the current scroll/section
   * state from the reader UI. Called inside each heartbeat tick.
   */
  getViewState?: () => { maxScrollPct?: number; sectionsViewed?: string[] };
}

export function useReadingTracker(opts: ReadingTrackerOptions) {
  const {
    contentId,
    subjectId,
    heartbeatIntervalMs = 30_000,
    idleThresholdMs = 60_000,
    getViewState,
  } = opts;

  // Ref instead of state — none of these values should re-render the host.
  const stateRef = useRef({
    sessionId: null as string | null,
    activeSinceMs: null as number | null, // ms timestamp when "active" began
    pendingActiveMs: 0,                    // accumulated but not yet flushed
    lastInteractionMs: Date.now(),
    visible: typeof document !== "undefined" ? !document.hidden : true,
  });

  useEffect(() => {
    if (!contentId) return;
    if (typeof window === "undefined") return;

    const s = stateRef.current;
    s.sessionId = null;
    s.pendingActiveMs = 0;
    s.activeSinceMs = null;
    s.lastInteractionMs = Date.now();
    s.visible = !document.hidden;

    // ── Active-time bookkeeping ─────────────────────────────────────
    const isIdle = () =>
      Date.now() - s.lastInteractionMs > idleThresholdMs;

    const shouldBeActive = () => s.visible && !isIdle();

    const transitionActive = () => {
      // Start the active interval if we should be, end it if we shouldn't.
      if (shouldBeActive()) {
        if (s.activeSinceMs == null) s.activeSinceMs = Date.now();
      } else if (s.activeSinceMs != null) {
        s.pendingActiveMs += Date.now() - s.activeSinceMs;
        s.activeSinceMs = null;
      }
    };

    // ── Drain (compute current pending + still-active interval) ─────
    const drainActiveSeconds = () => {
      let total = s.pendingActiveMs;
      if (s.activeSinceMs != null) {
        total += Date.now() - s.activeSinceMs;
        s.activeSinceMs = Date.now(); // restart interval seamlessly
      }
      const seconds = Math.floor(total / 1000);
      // Subtract what we sent — keep the sub-second remainder.
      s.pendingActiveMs = total - seconds * 1000;
      return seconds;
    };

    // ── Heartbeat ───────────────────────────────────────────────────
    const sendHeartbeat = (opts: { final?: boolean } = {}) => {
      const delta = drainActiveSeconds();
      // Skip empty heartbeats unless this is the final flush.
      if (delta <= 0 && !opts.final) return;

      const view = getViewState ? getViewState() : {};
      const body = {
        contentId,
        subjectId: subjectId || undefined,
        sessionId: s.sessionId || undefined,
        deltaActiveSeconds: Math.min(delta, 330),
        maxScrollPct: clampPct(view.maxScrollPct),
        sectionsViewed: dedup(view.sectionsViewed),
        end: !!opts.final,
      };

      if (opts.final) {
        // Use fetch with keepalive so the request survives page unload.
        // sendBeacon would also work but doesn't support custom headers,
        // and we need the Authorization header.
        try {
          analyticsAPI.heartbeatKeepalive(body);
        } catch {
          // best-effort; nothing else to do during unload
        }
        return;
      }

      analyticsAPI
        .heartbeat(body)
        .then((res: any) => {
          if (res?.data?.sessionId) s.sessionId = res.data.sessionId;
        })
        .catch(() => {
          // Swallow tracking failures — analytics must never break UX.
        });
    };

    // ── Wire up listeners ───────────────────────────────────────────
    const onActivity = () => {
      s.lastInteractionMs = Date.now();
      transitionActive();
    };

    const onVisibility = () => {
      s.visible = !document.hidden;
      transitionActive();
    };

    const onPageHide = () => {
      transitionActive(); // close out the active interval
      sendHeartbeat({ final: true });
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("mousemove", onActivity, { passive: true });
    window.addEventListener("keydown", onActivity);
    window.addEventListener("scroll", onActivity, { passive: true, capture: true });
    window.addEventListener("touchstart", onActivity, { passive: true });
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("beforeunload", onPageHide);

    transitionActive(); // initial state

    // Two timers:
    //   - check every second whether idleness has just kicked in (so we
    //     stop counting time without waiting for the next user event)
    //   - heartbeat at the configured cadence
    const idleTickId = window.setInterval(() => {
      transitionActive();
    }, 1000);

    const heartbeatId = window.setInterval(() => {
      sendHeartbeat();
    }, heartbeatIntervalMs);

    return () => {
      window.clearInterval(idleTickId);
      window.clearInterval(heartbeatId);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("mousemove", onActivity);
      window.removeEventListener("keydown", onActivity);
      window.removeEventListener("scroll", onActivity, true as any);
      window.removeEventListener("touchstart", onActivity);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("beforeunload", onPageHide);

      // Component unmount (route change) — close the session cleanly.
      transitionActive();
      sendHeartbeat({ final: true });
    };
    // We intentionally exclude getViewState from deps — it's a stable
    // function read inside the heartbeat closure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentId, subjectId, heartbeatIntervalMs, idleThresholdMs]);
}

function clampPct(n: unknown): number {
  const v = typeof n === "number" && Number.isFinite(n) ? n : 0;
  return Math.max(0, Math.min(100, Math.round(v)));
}

function dedup(arr: unknown): string[] {
  if (!Array.isArray(arr)) return [];
  return Array.from(new Set(arr.filter((x) => typeof x === "string"))).slice(0, 200);
}
