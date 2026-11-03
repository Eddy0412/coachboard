const STEPS = [
  {
    step: "1",
    title: "Load your film",
    desc: "Paste a YouTube link or upload your game video — no special equipment needed.",
  },
  {
    step: "2",
    title: "Tag & draw",
    desc: "Timestamp key plays, tag athletes, and draw directly on the frame as you break down film.",
  },
  {
    step: "3",
    title: "Share with your staff",
    desc: "Invite coaches, get comments and notifications, and keep everyone on the same film.",
  },
];

export function HowItWorks() {
  return (
    <div className="mx-auto w-full max-w-4xl px-6">
      <div className="mb-8 text-center">
        <p className="mb-2 text-xs font-bold tracking-wide text-primary">HOW IT WORKS</p>
        <h2 className="text-3xl font-extrabold leading-tight sm:text-4xl">From film to film study in minutes.</h2>
      </div>
      <div className="grid gap-6 sm:grid-cols-3">
        {STEPS.map((s) => (
          <div key={s.step} className="flex flex-col items-start gap-2 rounded-2xl border border-border bg-card p-6 text-left">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-bg text-sm font-extrabold text-primary">
              {s.step}
            </div>
            <h3 className="font-bold">{s.title}</h3>
            <p className="text-sm text-muted">{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
