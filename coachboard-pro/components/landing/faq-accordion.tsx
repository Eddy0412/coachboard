"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const FAQ_ITEMS = [
  {
    q: "Is there a free plan?",
    a: "Yes. The Free plan lets you create projects with core video breakdown and telestration tools — no credit card required.",
  },
  {
    q: "Is my game film private?",
    a: "Yes. Only your team and the coaches or athletes you invite can see a project. Film is never public.",
  },
  {
    q: "What sports does this work for?",
    a: "Coachboard Pro is built around football workflows — down/distance, formations, pass-target tracking — but the core timestamp and telestration tools work for any sport on video.",
  },
  {
    q: "Can my whole coaching staff use it?",
    a: "Yes. Invite coaches and athletes to your team — everyone sees the same film, timestamps, and drawings in real time.",
  },
  {
    q: "What is CoachIQ?",
    a: "CoachIQ is our AI scouting assistant. Tag plays as you break down film and it automatically builds heatmaps and a written scouting report.",
  },
];

export function LandingFaq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-2 px-6">
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
                className={`h-4 w-4 shrink-0 text-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
              />
            </button>
            {isOpen && <p className="px-4 pb-4 text-sm text-muted">{item.a}</p>}
          </div>
        );
      })}
    </div>
  );
}
