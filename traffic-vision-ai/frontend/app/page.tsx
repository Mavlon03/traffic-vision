import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";

const checkpoints = [
  "PostgreSQL va Spring Boot auth tayyor",
  "FastAPI YOLOv8 inference tayyor",
  "JWT bilan protected route oqimi tayyor",
  "Image upload orqali detection sahifasi tayyor",
  "Telefon kamera uchun live detection va voice alert qo'shildi",
];

export default function Home() {
  return (
    <AppShell requireAuth={false}>
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[34px] bg-slate-950 p-8 text-white shadow-2xl sm:p-10">
          <p className="font-mono text-xs uppercase tracking-[0.35em] text-amber-300">
            End-to-End Chain
          </p>
          <h1 className="mt-4 max-w-2xl font-heading text-5xl font-bold tracking-tight sm:text-6xl">
            Java to Python to YOLOv8 to Java.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-slate-300">
            Hozir frontend qatlami qo&apos;shildi. Bu panel orqali auth, detection va
            history endpointlarini bir joydan sinash mumkin.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/login"
              className="rounded-full bg-amber-400 px-5 py-3 font-medium text-slate-950"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="rounded-full border border-white/15 px-5 py-3 font-medium text-white"
            >
              Register
            </Link>
          </div>
        </section>

        <section className="rounded-[34px] border border-black/10 bg-white/85 p-8 shadow-xl backdrop-blur sm:p-10">
          <p className="font-mono text-xs uppercase tracking-[0.35em] text-slate-500">
            Current Status
          </p>
          <div className="mt-5 space-y-3">
            {checkpoints.map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700"
              >
                {item}
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
