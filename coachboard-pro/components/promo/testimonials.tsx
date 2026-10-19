import { Card } from "@/components/ui/card";

const TESTIMONIALS = [
  {
    quote:
      "This tool helps us analyze tendencies and pass target zones with heatmaps. Ideal to prepare our DBs for each game.",
    name: "Coach Howell",
    role: "DB Coach, Kiwanis Kolts Varsity",
  },
  {
    quote:
      "Esta herramienta me ayuda a llevar la ofensa en mejora semana tras semana.",
    name: "Coach Martinez",
    role: "Offensive Assistant, Panama Raptors",
  },
  {
    quote:
      "Me ayuda a tener weekly scout reports para guiar a mis atletas. Y facilita film study.",
    name: "Coach Franco",
    role: "Head Coach, Kiwanis Kolts",
  },
];

export function PromoTestimonials() {
  return (
    <div className="mx-auto grid w-full max-w-4xl gap-4 px-6 sm:grid-cols-3">
      {TESTIMONIALS.map((t, i) => (
        <Card key={i} className="flex flex-col gap-3 p-6">
          <p className="text-sm text-muted">&ldquo;{t.quote}&rdquo;</p>
          <div>
            <p className="text-sm font-bold">{t.name}</p>
            <p className="text-xs text-muted">{t.role}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}
