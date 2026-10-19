"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { PRO_ACCESS_UNTIL } from "@/lib/promo";

const PRO_ACCESS_UNTIL_LABEL = PRO_ACCESS_UNTIL.toLocaleDateString("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
});

const FAQ_ITEMS = [
  {
    q: "How long do I get Pro access for?",
    a: `Your one-time payment unlocks Pro access through ${PRO_ACCESS_UNTIL_LABEL}. After that, you'll get a renewal reminder with a link to continue at the regular price — you're never charged automatically.`,
  },
  {
    q: "Is this a subscription?",
    a: "No. This is a single one-time payment, not a recurring subscription. There's nothing to cancel.",
  },
  {
    q: "What happens after the offer ends?",
    a: "Your account keeps full Pro access until the date above. Near the end of that period, you'll be able to renew at the regular subscription price if you'd like to keep Pro — otherwise your account simply moves to the Free plan.",
  },
  {
    q: "What payment methods can I use?",
    a: "Yappy. Submit your payment details and we manually confirm and activate your account, usually within 24 hours.",
  },
];

export function PromoFaq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-2 px-6">
      {FAQ_ITEMS.map((item, i) => {
        const isOpen = openIndex === i;
        return (
          <div key={item.q} className="rounded-2xl border border-border bg-card">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-4 p-4 text-left"
              onClick={() => setOpenIndex(isOpen ? null : i)}
              aria-expanded={isOpen}
            >
              <span className="text-sm font-bold">{item.q}</span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-muted transition-transform ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            {isOpen && (
              <p className="px-4 pb-4 text-sm text-muted">{item.a}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
