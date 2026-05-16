import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";

const highlights = [
  {
    title: "Yo'l belgilarini aniqlash",
    description: "Rasm yoki video orqali belgilarni tez ko'rsatadi.",
    accent: "bg-amber-300",
  },
  {
    title: "Kamera orqali",
    description: "Jonli kuzatuvda belgilarni real vaqt rejimida topadi.",
    accent: "bg-sky-400",
  },
  {
    title: "Tezkor nazorat",
    description: "Muhim holatlarda natijani tez ko'rish uchun mos.",
    accent: "bg-emerald-400",
  },
];

const steps = [
  "Farqli rejim tanlang: rasm, jonli kamera yoki tarix bo'limi.",
  "Har bir bo'limda topilgan belgilarni aniq va sodda ko'ring.",
  "Muhim holat bo'lsa, tez qaror olish uchun tizimdan foydalaning.",
];

const cards = [
  {
    label: "Tasvir bo'limi",
    title: "Rasm orqali aniqlash",
    description:
      "Tayyor rasm yuklang va tizim topgan yo'l belgilarini bir necha soniyada ko'ring.",
    href: "/detect",
    cta: "Rasm yuklash",
    accent: "bg-amber-300 text-slate-950",
  },
  {
    label: "Kamera oqimi",
    title: "Jonli kuzatuv",
    description:
      "Kamera orqali real vaqt rejimida yo'l belgilarini kuzating va natijani darhol oling.",
    href: "/live",
    cta: "Jonli rejimni ochish",
    accent: "bg-blue-500 text-white",
  },
];

export default function DashboardPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <section className="rounded-[28px] border border-white/8 bg-[#111111] p-6 shadow-[0_25px_70px_rgba(0,0,0,0.28)] sm:p-8">
          <div className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
            <div>
              <div className="inline-flex rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-300">
                Traffic Vision
              </div>
              <h1 className="mt-5 max-w-3xl font-heading text-4xl font-semibold leading-tight tracking-tight text-white sm:text-6xl">
                Yo&apos;l belgilarini tez aniqlash va kuzatuvni boshqarish uchun zamonaviy panel.
              </h1>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
                Rasm yuklash, jonli kamera va tarix bo&apos;limlari yordamida haydovchi,
                operator va nazorat qiluvchi foydalanuvchi uchun sodda, aniq va
                qulay boshqaruv muhiti yaratilgan.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/detect"
                  className="rounded-xl border border-white/10 bg-white/6 px-5 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/10"
                >
                  Rasm orqali boshlash
                </Link>
                <Link
                  href="/live"
                  className="rounded-xl border border-white/10 bg-[#1b1b1b] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#222222]"
                >
                  Jonli kuzatuvni ochish
                </Link>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              {highlights.map((item) => (
                <div
                  key={item.title}
                  className="flex gap-4 rounded-2xl border border-white/8 bg-[#151515] px-4 py-4"
                >
                  <div className={`mt-1 h-12 w-1.5 rounded-full ${item.accent}`} />
                  <div>
                    <div className="text-sm font-semibold text-white">{item.title}</div>
                    <p className="mt-1 text-sm leading-6 text-slate-400">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-[24px] border border-white/8 bg-[#111111] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
          <div className="text-sm font-semibold uppercase tracking-[0.22em] text-white">
            Qisqa yo&apos;riqnoma
          </div>
          <div className="mt-5 space-y-3">
            {steps.map((step, index) => (
              <div
                key={step}
                className="flex items-center justify-between gap-4 rounded-2xl border border-white/6 bg-[#151515] px-4 py-4"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/8 text-xs font-semibold text-slate-300">
                    {index + 1}
                  </div>
                  <p className="text-sm leading-6 text-slate-300">{step}</p>
                </div>
                <div
                  className={`h-3 w-3 shrink-0 rounded-full ${
                    index === 0
                      ? "bg-amber-300"
                      : index === 1
                        ? "bg-blue-500"
                        : "bg-emerald-400"
                  }`}
                />
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          {cards.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className="rounded-[24px] border border-white/8 bg-[#111111] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.22)] transition hover:border-white/14 hover:bg-[#141414]"
            >
              <div className="text-xs text-slate-500">{card.label}</div>
              <h2 className="mt-3 font-heading text-3xl font-semibold text-white">
                {card.title}
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-slate-400">
                {card.description}
              </p>
              <div className="mt-6">
                <span className={`inline-flex rounded-xl px-4 py-2 text-sm font-semibold ${card.accent}`}>
                  {card.cta}
                </span>
              </div>
            </Link>
          ))}
        </section>
      </div>
    </AppShell>
  );
}
