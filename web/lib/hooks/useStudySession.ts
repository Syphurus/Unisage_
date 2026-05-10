"use client";

import { useEffect, useRef } from "react";
import { sessionsAPI } from "@/lib/api";

/**
 * Lightweight study-session lifecycle.
 *
 * Calls POST /api/sessions/start on mount, PUT /api/sessions/:id/end on
 * unmount AND on `pagehide`. The end call uses fetch with keepalive so the
 * server-recorded duration is correct even when the user closes the tab.
 *
 * Use this on subject-scoped pages (subject hub, content reader inside a
 * subject) — NOT on the dashboard or generic listings, where there's no
 * meaningful subject to attribute time to.
 *
 * @example
 *   useStudySession(subjectId);
 */
export function useStudySession(subjectId: string | null | undefined) {
  // Persist across React strict-mode double-invocations and navigation
  // within the same subject by holding the session id in a ref.
  const sessionIdRef = useRef<string | null>(null);
  // Capture which subject this session is bound to so a navigation between
  // two different subjects does the right thing (end old, start new).
  const boundSubjectRef = useRef<string | null>(null);
  // Track whether we've already ended this session — avoids double-ending
  // when both unmount and pagehide fire.
  const endedRef = useRef(false);

  useEffect(() => {
    if (!subjectId) return;
    if (typeof window === "undefined") return;

    let cancelled = false;
    endedRef.current = false;
    boundSubjectRef.current = subjectId;

    sessionsAPI
      .start(subjectId)
      .then((res: any) => {
        if (cancelled) return;
        const id = res?.data?.id || res?.id;
        if (id) sessionIdRef.current = id;
      })
      .catch(() => {
        // best-effort; session telemetry is non-critical
      });

    const endSession = () => {
      if (endedRef.current) return;
      const id = sessionIdRef.current;
      if (!id) return;
      endedRef.current = true;
      sessionsAPI.endKeepalive(id);
    };

    window.addEventListener("pagehide", endSession);
    window.addEventListener("beforeunload", endSession);

    return () => {
      cancelled = true;
      window.removeEventListener("pagehide", endSession);
      window.removeEventListener("beforeunload", endSession);
      endSession();
      sessionIdRef.current = null;
      boundSubjectRef.current = null;
    };
  }, [subjectId]);
}
