import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";

const cards = [
  {
    title: "Image Detection",
    description: "Rasm yuklab YOLOv8 inferenceni tekshiring.",
    href: "/detect",
  },
  {
    title: "Detection History",
    description: "Java backend saqlagan detection yozuvlarini ko'ring.",
    href: "/history",
  },
  {
    title: "Realtime Next Step",
    description: "Keyingi bosqich sifatida `/ws/detect` uchun live camera UI qo'shiladi.",
    href: "/detect",
  },
];

export default function DashboardPage() {
  return (
    <AppShell>
      <section className="rounded-[34px] bg-slate-950 p-8 text-white shadow-2xl sm:p-10">
        <p className="font-mono text-xs uppercase tracking-[0.35em] text-amber-300">
          Dashboard
        </p>
        <h1 className="mt-4 font-heading text-4xl font-bold tracking-tight sm:text-5xl">
          Frontend integratsiya paneli tayyor.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
          Bu sahifa auth va detection oqimlarini sinash uchun bazaviy boshqaruv
          nuqtasi bo&apos;lib turadi.
        </p>
      </section>

      <section className="mt-6 grid gap-6 md:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.title}
            href={card.href}
            className="rounded-[30px] border border-black/10 bg-white/85 p-6 shadow-xl backdrop-blur transition hover:-translate-y-1"
          >
            <h2 className="font-heading text-2xl font-semibold">{card.title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {card.description}
            </p>
          </Link>
        ))}
      </section>
    </AppShell>
  );
}
