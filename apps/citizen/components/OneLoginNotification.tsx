"use client";

import { useAppStore } from "@/lib/store";

/**
 * An iOS-style push notification pinned to the top of the phone screen — this
 * is the persona's phone receiving the GOV.UK One Login security code. Because
 * the phone frame is an iframe, `position: fixed` pins to the device edges.
 *
 * The code is shown in the notification preview, exactly as a real phone would.
 * Tapping dismisses it.
 */
export function OneLoginNotification() {
  const notification = useAppStore((s) => s.phoneNotification);
  const dismiss = useAppStore((s) => s.dismissPhoneNotification);

  if (!notification || notification.consumed) return null;

  return (
    <button
      type="button"
      onClick={dismiss}
      className="fixed top-3 inset-x-3 z-[9999] text-left animate-[slideDown_0.3s_ease-out]"
    >
      <div className="rounded-2xl bg-white/85 backdrop-blur-xl shadow-lg border border-black/5 px-4 py-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-5 h-5 rounded bg-govuk-black flex items-center justify-center">
            <span className="text-[7px] font-bold text-white leading-none">
              GOV
            </span>
          </div>
          <span className="text-xs font-semibold text-govuk-black flex-1">
            {notification.title}
          </span>
          <span className="text-[11px] text-govuk-mid-grey">now</span>
        </div>
        <p className="text-sm text-govuk-black leading-snug">
          {notification.body}
        </p>
      </div>
    </button>
  );
}
