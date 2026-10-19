"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";

// Generic dismissible top banner for marketing campaigns. Pass a new
// dismissKey per campaign so an earlier dismissal doesn't hide a new one.
export function CampaignBanner({
  message,
  ctaLabel,
  href,
  dismissKey,
}: {
  message: string;
  ctaLabel: string;
  href: string;
  dismissKey: string;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(`banner-dismissed:${dismissKey}`) !== "1") {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, [dismissKey]);

  if (!visible) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(`banner-dismissed:${dismissKey}`, "1");
    } catch {
      // ignore
    }
    setVisible(false);
  };

  return (
    <div className="flex items-center justify-center gap-3 bg-primary px-4 py-2.5 text-center text-sm font-medium text-white">
      <Link href={href} className="underline-offset-2 hover:underline">
        {message} <span className="font-bold">{ctaLabel} &rarr;</span>
      </Link>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={dismiss}
        className="shrink-0 opacity-80 hover:opacity-100"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
