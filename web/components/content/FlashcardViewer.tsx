"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useSWRConfig } from "swr";
import { useRouter } from "next/navigation";
import { ChevronLeft, Check, Trophy, RotateCcw } from "lucide-react";
import { Pill, PrimaryButton } from "@/components/unisage/primitives";
import type { Content } from "@/lib/types";
import { cn } from "@/lib/utils";
import { flashcardsAPI } from "@/lib/api";

interface FlashcardViewerProps {
  flashcards: Content[];
  subjectId?: string;
  backHref?: string;
  title?: string;
  subjectCode?: string;
}

// Cards passed in are ALREADY expanded by the page (each prop card is one
// flashcard with its own synthetic id of `${parentContentId}-${idx}`). We
// derive the parent contentId + per-card index by parsing the suffix off
// the synthetic id — that's the contract used by expandFlashcards on the
// content page.
function parseSyntheticCard(
  id: string
): { parentId: string; cardIndex: number } | null {
  const m = id.match(/^(.+)-(\d+)$/);
  if (!m) return null;
  const cardIndex = Number.parseInt(m[2], 10);
  if (!Number.isFinite(cardIndex)) return null;
  return { parentId: m[1], cardIndex };
}

export function FlashcardViewer({
  flashcards,
  backHref,
  title,
  subjectCode,
}: FlashcardViewerProps) {
  const router = useRouter();
  const [cards, setCards] = useState(flashcards);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [confident, setConfident] = useState<Set<string>>(new Set());
  const [shaky, setShaky] = useState<Set<string>>(new Set());
  const [forgot, setForgot] = useState<Set<string>>(new Set());
  const [done, setDone] = useState(false);

  // Per-card timing + ordered rating list — the payload we POST when the
  // session ends. Refs so updates don't trigger re-renders.
  const cardShownAtRef = useRef<number>(0);
  const reviewBatchRef = useRef<
    Map<
      string,
      {
        cardIndex: number;
        rating: "forgot" | "shaky" | "confident";
        responseMs: number;
      }[]
    >
  >(new Map());
  const persistedRef = useRef(false);

  useEffect(() => {
    if (flashcards.length > 0) {
      setCards(flashcards);
      setIdx(0);
      setRevealed(false);
      setConfident(new Set());
      setShaky(new Set());
      setForgot(new Set());
      setDone(false);
      cardShownAtRef.current = Date.now();
      reviewBatchRef.current = new Map();
      persistedRef.current = false;
    }
  }, [flashcards]);

  const card = cards[idx];

  // Reset the timer each time a new card is shown.
  useEffect(() => {
    cardShownAtRef.current = Date.now();
  }, [idx]);

  const { mutate } = useSWRConfig();

  const persistReviews = useCallback(() => {
    if (persistedRef.current) return;
    persistedRef.current = true;
    // Group by parent content id (a deck can be split across multiple
    // content rows when the unit holds several flashcard decks).
    for (const [parentId, batch] of reviewBatchRef.current.entries()) {
      if (batch.length === 0) continue;
      // Persist reviews and then revalidate related caches so UI shows
      // updated completion immediately. Best-effort — analytics never
      // blocks UX, but we attempt to trigger SWR mutate on success.
      (async () => {
        try {
          await flashcardsAPI.submitReviews(parentId, batch);
          // Revalidate global caches used by progress and analytics hooks
          mutate("progress");
          if (subjectId) {
            mutate(`progress-${subjectId}`);
            mutate(`subject-aggregate-v2-${subjectId}`);
          }
          // Revalidate analytics rollup keys too
          mutate("analytics-me");
          mutate("analytics-me-subjects");
        } catch (e) {
          // swallow — do not block UX on analytics failures
        }
      })();
    }
    reviewBatchRef.current = new Map();
  }, [mutate, subjectCode]);

  const goNext = useCallback(() => {
    if (idx >= cards.length - 1) {
      setDone(true);
      // Persist on session completion. This runs before the user clicks
      // "Run cycle again" / "Back to subject" so server has the data
      // regardless of where they go next.
      persistReviews();
    } else {
      setIdx((i) => i + 1);
      setRevealed(false);
    }
  }, [idx, cards.length, persistReviews]);

  // Also flush on unmount or page hide (covers tab close mid-session).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onHide = () => persistReviews();
    window.addEventListener("pagehide", onHide);
    window.addEventListener("beforeunload", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      window.removeEventListener("beforeunload", onHide);
      persistReviews();
    };
  }, [persistReviews]);

  const recordReview = (rating: "forgot" | "shaky" | "confident") => {
    if (!card) return;
    const responseMs = Math.max(0, Date.now() - cardShownAtRef.current);
    const parsed = parseSyntheticCard(card.id);
    const parentId = parsed?.parentId || card.id;
    const cardIndex = parsed?.cardIndex ?? 0;

    const batch = reviewBatchRef.current.get(parentId) || [];
    batch.push({ cardIndex, rating, responseMs });
    reviewBatchRef.current.set(parentId, batch);
  };

  const rate = (rating: "solid" | "shaky" | "forgot") => {
    if (!card) return;
    if (rating === "solid") setConfident((s) => new Set(s).add(card.id));
    if (rating === "shaky") setShaky((s) => new Set(s).add(card.id));
    if (rating === "forgot") setForgot((s) => new Set(s).add(card.id));
    // Persist the decision into the batch (UI-side rating "solid" maps to
    // the server's "confident" canonical value).
    recordReview(rating === "solid" ? "confident" : rating);
    goNext();
  };

  const reset = () => {
    setIdx(0);
    setRevealed(false);
    setConfident(new Set());
    setShaky(new Set());
    setForgot(new Set());
    setDone(false);
    cardShownAtRef.current = Date.now();
    reviewBatchRef.current = new Map();
    persistedRef.current = false;
  };

  const onBack = () => {
    if (backHref) router.push(backHref);
    else router.back();
  };

  if (cards.length === 0) {
    return (
      <div className="px-5 py-12 text-center text-[14px] text-chalk-400">
        No cards available.
      </div>
    );
  }

  if (done) {
    const score = Math.round((confident.size / cards.length) * 100);
    return (
      <div className="min-h-screen px-5 pt-12 pb-32 text-center mx-auto w-full lg:max-w-2xl">
        <Trophy className="mx-auto h-12 w-12 text-mint-400" />
        <h1 className="mt-6 text-[28px] font-bold text-[rgb(var(--fg))]">
          Cycle complete
        </h1>
        <p className="mt-2 text-[14px] text-chalk-300">
          {confident.size} confident · {shaky.size} shaky · {forgot.size} forgot
        </p>
        <div className="mt-8 grid grid-cols-3 gap-3">
          <Stat tone="mint" value={confident.size} label="Solid" />
          <Stat tone="ember" value={shaky.size} label="Shaky" />
          <Stat tone="flame" value={forgot.size} label="Forgot" />
        </div>
        <div className="mt-8 mx-auto max-w-sm space-y-3">
          <PrimaryButton onClick={reset}>
            <RotateCcw className="h-4 w-4" /> Run cycle again
          </PrimaryButton>
          <button onClick={onBack} className="btn-outline">
            Back to subject
          </button>
        </div>
        <p className="mt-4 text-[11px] uppercase tracking-cap text-chalk-500">
          Recall · {score}%
        </p>
      </div>
    );
  }

  const data = card.data as any;
  const front = data?.front || "";
  const back = data?.back || "";
  const decay = Math.min(95, 30 + idx * 4);

  // Lightweight markdown → HTML for flashcard answers. Admins write content
  // like **FORMULA:** and *italics*; rendering them as literal asterisks
  // breaks trust on first reveal. Inline-only — no full markdown engine.
  const renderInlineMd = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\n/g, "<br/>");

  return (
    <div className="min-h-screen pb-32 mx-auto w-full lg:max-w-2xl">
      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-5">
        <button
          onClick={onBack}
          aria-label="Back"
          className="-ml-2 grid h-9 w-9 place-items-center rounded-full text-[rgb(var(--fg))] hover:bg-white/[0.05]"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-3">
          <span className="text-[12px] font-semibold tabular-nums text-[rgb(var(--fg))]">
            {idx + 1} / {cards.length}
          </span>
          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-mint-400 transition-all"
              style={{ width: `${((idx + 1) / cards.length) * 100}%` }}
            />
          </div>
        </div>
      </header>

      <div className="px-5 pt-2">
        <p className="caption mb-3">
          {subjectCode ? `${subjectCode} · ` : ""}CYCLE 1 OF 5
        </p>
        <h1 className="text-[28px] font-bold leading-tight tracking-[-0.01em] text-[rgb(var(--fg))]">
          Recall Cycles
        </h1>
      </div>

      <div className="px-5 mt-6">
        <article className="rounded-card border border-white/[0.06] bg-[rgb(var(--bg-elev))] p-6 min-h-[320px] flex flex-col">
          <div className="flex items-center justify-between gap-2">
            <p className="caption">
              CARD {String(idx + 1).padStart(2, "0")} · {title || "Topic"}
            </p>
            <Pill variant="mint">HIGH RECALL</Pill>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
            <p className="caption">{revealed ? "ANSWER" : "QUESTION"}</p>
            <p
              className={cn(
                "leading-snug whitespace-pre-wrap",
                revealed
                  ? "text-[18px] text-[rgb(var(--fg))]"
                  : "text-[22px] font-semibold text-[rgb(var(--fg))]"
              )}
              dangerouslySetInnerHTML={{
                __html: renderInlineMd(revealed ? back : front),
              }}
            />
          </div>

          <div className="mt-2 flex items-center justify-between gap-3 pt-4 border-t border-white/[0.05]">
            <p className="text-[10px] uppercase tracking-cap text-chalk-500">
              Decay · {decay}%
            </p>
          </div>
        </article>

        {!revealed ? (
          <div className="mt-5">
            <PrimaryButton onClick={() => setRevealed(true)}>
              Reveal answer
            </PrimaryButton>
          </div>
        ) : (
          <div className="mt-5">
            <p className="caption mb-3">Confidence</p>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                onClick={() => rate("forgot")}
                className="rounded-pill border border-flame-500/30 bg-flame-500/10 px-3 py-2.5 text-[13px] font-semibold text-flame-500"
              >
                Forgot
              </button>
              <button
                onClick={() => rate("shaky")}
                className="rounded-pill border border-ember-400/30 bg-ember-400/10 px-3 py-2.5 text-[13px] font-semibold text-ember-400"
              >
                Shaky
              </button>
              <button
                onClick={() => rate("solid")}
                className="rounded-pill border border-mint-500/30 bg-mint-500/10 px-3 py-2.5 text-[13px] font-semibold text-mint-400"
              >
                Solid
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({
  value,
  label,
  tone,
}: {
  value: number;
  label: string;
  tone: "mint" | "ember" | "flame";
}) {
  return (
    <div className="rounded-card border border-white/[0.06] bg-[rgb(var(--bg-elev))] py-4">
      <p
        className={cn(
          "text-[24px] font-bold tabular-nums",
          tone === "mint" && "text-mint",
          tone === "ember" && "text-ember-400",
          tone === "flame" && "text-flame-500"
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-[10px] uppercase tracking-cap text-chalk-500">
        {label}
      </p>
    </div>
  );
}

// Default export for compatibility
export default FlashcardViewer;
