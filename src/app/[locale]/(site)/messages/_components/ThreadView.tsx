"use client";

import { useLocale, useTranslations } from "next-intl";
import { intlLocale } from "@/i18n/routing";
import { useRealtimeRefresh } from "@/components/useRealtimeRefresh";
import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { markConversationRead, sendMessage } from "@/app/actions/messages";
import { clockTime, dayKey, dayLabel } from "./time";

export type ThreadMessage = { id: string; body: string; mine: boolean; createdAt: string; sending?: boolean };

const MAX = 2000;

export function ThreadView({
  conversationId,
  messages,
  otherFirstName,
  tz,
}: {
  conversationId: string;
  messages: ThreadMessage[];
  otherFirstName: string;
  tz: string;
}) {
  const t = useTranslations("chat.thread");
  const locale = useLocale();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [, startReadTransition] = useTransition();
  const [shown, addOptimistic] = useOptimistic(messages, (state, m: ThreadMessage) => [...state, m]);
  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  // Mark my side read whenever a new incoming message appears (and on open).
  const lastIncoming = [...messages].reverse().find((m) => !m.mine)?.id;
  useEffect(() => {
    if (!lastIncoming) return;
    startReadTransition(() => markConversationRead(conversationId));
  }, [conversationId, lastIncoming]);

  // Live updates: the server pings this conversation's channel on every new message (fallback poll every 60 s).
  useRealtimeRefresh(`conv:${conversationId}`);

  // Stick to the bottom when messages are added.
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [shown.length]);

  // Give focus back to the composer once a send finishes.
  const wasSending = useRef(false);
  useEffect(() => {
    if (isPending) wasSending.current = true;
    else if (wasSending.current) {
      wasSending.current = false;
      input.current?.focus({ preventScroll: true });
    }
  }, [isPending]);

  // Auto-grow the composer up to ~6 lines.
  useEffect(() => {
    const el = input.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [text]);

  const trimmed = text.trim();
  const tooLong = trimmed.length > MAX;
  const canSend = trimmed.length > 0 && !tooLong && !isPending;

  function send() {
    if (!canSend) return;
    const body = trimmed;
    setError(null);
    setText("");
    startTransition(async () => {
      addOptimistic({ id: `tmp-${Date.now()}`, body, mine: true, createdAt: new Date().toISOString(), sending: true });
      const res = await sendMessage(conversationId, body);
      if (!res.ok) {
        setError(res.error);
        setText(body);
      }
    });
  }

  const days = shown.map((m) => dayKey(new Date(m.createdAt), tz));
  return (
    <>
      <div className="flex-1 min-h-0 overflow-y-auto bg-background/60 px-space-md md:px-space-lg py-space-lg" ref={scroller}>
        {shown.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center gap-space-sm">
            <span className="w-14 h-14 rounded-2xl bg-surface-container-low text-secondary flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl">waving_hand</span>
            </span>
            <p className="font-title-md text-title-md text-on-surface">{t("sayHello", { name: otherFirstName })}</p>
            <p className="font-body-sm text-body-sm text-on-surface-variant max-w-sm">
              {t("helloText")}
            </p>
          </div>
        ) : (
          <ol aria-live="polite" className="flex flex-col gap-space-sm">
            {shown.map((m, i) => {
              const d = new Date(m.createdAt);
              const sep = i === 0 || days[i] !== days[i - 1];
              return (
                <li className="flex flex-col" key={m.id}>
                  {sep && (
                    <div className="flex items-center gap-space-md my-space-sm" role="separator">
                      <span className="flex-1 h-px bg-[#EFE7DE]" />
                      <span className="font-label-sm text-label-sm text-on-surface-variant px-space-sm py-0.5 rounded-full bg-surface-container-low" suppressHydrationWarning>
                        {dayLabel(d, tz, undefined, locale)}
                      </span>
                      <span className="flex-1 h-px bg-[#EFE7DE]" />
                    </div>
                  )}
                  <div className={`flex flex-col max-w-[85%] sm:max-w-[70%] ${m.mine ? "self-end items-end" : "self-start items-start"}`}>
                    <div
                      className={`px-space-md py-space-sm rounded-2xl font-body-md text-body-md whitespace-pre-wrap break-words [overflow-wrap:anywhere] ${
                        m.mine
                          ? "bg-primary text-on-primary rounded-br-md"
                          : "bg-surface-container-lowest text-on-surface border border-[#EFE7DE] shadow-[0_4px_16px_-2px_rgba(83,72,62,0.05)] rounded-bl-md"
                      } ${m.sending ? "opacity-70" : ""}`}
                    >
                      {m.body}
                    </div>
                    <time className="mt-1 px-1 font-label-sm text-label-sm text-outline" dateTime={m.createdAt} suppressHydrationWarning>
                      {m.sending ? t("sending") : clockTime(d, tz, locale)}
                    </time>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
      <form
        className="border-t border-[#EFE7DE] bg-surface-container-lowest px-space-md md:px-space-lg py-space-md flex flex-col gap-space-xs"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        {error && (
          <p className="flex items-center gap-1 font-body-sm text-body-sm text-error" role="alert">
            <span className="material-symbols-outlined text-base">error</span>
            {error}
          </p>
        )}
        <div className="flex items-end gap-space-sm">
          <label className="sr-only" htmlFor="composer">
            {t("composerLabel", { name: otherFirstName })}
          </label>
          <textarea
            className="flex-1 min-h-[48px] max-h-40 resize-none px-space-md py-3 rounded-2xl bg-surface-container-lowest border-[1.5px] border-[#EFE7DE] font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:border-primary-container focus:ring-[3px] focus:ring-primary-container/15 transition-all disabled:opacity-60"
            disabled={isPending}
            id="composer"
            maxLength={MAX + 200}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={t("composerPlaceholder", { name: otherFirstName })}
            ref={input}
            rows={1}
            value={text}
          />
          <button
            aria-label={t("send")}
            className="w-12 h-12 shrink-0 rounded-full bg-primary text-on-primary flex items-center justify-center hover:bg-primary-container transition-all disabled:opacity-50"
            disabled={!canSend}
            type="submit"
          >
            <span className={`material-symbols-outlined ${isPending ? "animate-spin" : ""}`}>{isPending ? "autorenew" : "send"}</span>
          </button>
        </div>
        <div className="flex items-center justify-between gap-space-sm font-label-sm text-label-sm text-outline">
          <span className="hidden sm:inline">{t("hint")}</span>
          <span className={`ml-auto ${tooLong ? "text-error font-bold" : ""}`}>
            {trimmed.length > MAX - 300 ? `${trimmed.length.toLocaleString(intlLocale(locale))} / ${MAX.toLocaleString(intlLocale(locale))}` : ""}
          </span>
        </div>
      </form>
    </>
  );
}
