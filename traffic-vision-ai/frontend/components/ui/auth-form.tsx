"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { authApi } from "@/lib/api";
import { saveAuth } from "@/lib/auth";

type Mode = "login" | "register";

const heroContent = {
  login: {
    eyebrow: "Aqlli Yo'l Nazorati",
    title: "Harakatni kuzating, muhim belgilarni bir qarashda biling.",
    description:
      "Traffic Vision haydovchi va operator uchun yo'l belgilarini tez ko'rsatadi, muhim ogohlantirishlarni ajratadi va nazoratni soddalashtiradi.",
    highlights: [
      "Jonli kuzatuv va rasm bo'yicha tezkor aniqlash",
      "Muhim belgilar uchun aniq ogohlantirishlar",
      "Bitta panelda tarix, natija va monitoring",
    ],
  },
  register: {
    eyebrow: "Boshlashga Tayyor",
    title: "Bir necha daqiqada kuzatuv panelini ishga tushiring.",
    description:
      "Yangi akkaunt oching va Traffic Vision bilan yo'l belgilarini aniqlash, tarixni ko'rish hamda live rejimni boshqarishni boshlang.",
    highlights: [
      "Dashboard, detect va live rejimlar bir joyda",
      "Natijalar saqlanadi va keyin qayta ko'riladi",
      "Jamoa uchun sodda va tezkor ish jarayoni",
    ],
  },
} as const;

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isLogin = mode === "login";
  const hero = heroContent[mode];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = isLogin
        ? await authApi.login({ email, password })
        : await authApi.register({ username, email, password });

      saveAuth(response.token, {
        username: response.username,
        email: response.email,
        role: response.role,
      });

      router.replace("/dashboard");
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Auth so'rovida xato yuz berdi.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
      <section className="relative overflow-hidden rounded-[36px] bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.22),_transparent_34%),linear-gradient(145deg,#020617_0%,#0f172a_45%,#172033_100%)] p-8 text-white shadow-2xl sm:p-10">
        <div className="absolute -right-16 top-10 h-40 w-40 rounded-full bg-amber-300/15 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-36 w-36 rounded-full bg-sky-400/10 blur-3xl" />
        <div className="relative">
          <p className="font-mono text-xs uppercase tracking-[0.45em] text-amber-300">
            {hero.eyebrow}
          </p>
          <h1 className="mt-4 max-w-xl font-heading text-4xl font-bold tracking-tight sm:text-5xl">
            {hero.title}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">
            {hero.description}
          </p>

          <div className="mt-8 grid gap-3">
            {hero.highlights.map((highlight) => (
              <div
                key={highlight}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/6 px-4 py-3 backdrop-blur"
              >
                <span className="inline-flex h-2.5 w-2.5 rounded-full bg-amber-300 shadow-[0_0_18px_rgba(252,211,77,0.9)]" />
                <span className="text-sm text-slate-100">{highlight}</span>
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
              <div className="font-mono text-xs uppercase tracking-[0.28em] text-slate-400">
                Rejim
              </div>
              <div className="mt-2 text-2xl font-semibold">Aniqlash</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
              <div className="font-mono text-xs uppercase tracking-[0.28em] text-slate-400">
                Rejim
              </div>
              <div className="mt-2 text-2xl font-semibold">Jonli</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
              <div className="font-mono text-xs uppercase tracking-[0.28em] text-slate-400">
                Kuzatuv
              </div>
              <div className="mt-2 text-2xl font-semibold">Tarix</div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[32px] border border-black/10 bg-white/85 p-8 shadow-xl backdrop-blur sm:p-10">
        <div className="mb-6">
          <h2 className="font-heading text-3xl font-semibold tracking-tight">
            {isLogin ? "Tizimga kirish" : "Ro'yxatdan o'tish"}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {isLogin
              ? "Akkauntingizga kiring va kuzatuv panelini davom ettiring."
              : "Yangi akkaunt yarating va Traffic Vision imkoniyatlarini ishga tushiring."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin ? (
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Ism
              </span>
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-slate-400"
                placeholder="mavlon"
                required
              />
            </label>
          ) : null}

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">
              Email
            </span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-slate-400"
              placeholder="user@example.com"
              required
            />
          </label>

          <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Password
              </span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-slate-400"
              placeholder="********"
              required
            />
          </label>

          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-amber-400 px-4 py-3 font-medium text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Yuborilmoqda..." : isLogin ? "Kirish" : "Akkaunt yaratish"}
          </button>
        </form>

        <p className="mt-5 text-sm text-slate-600">
          {isLogin ? "Akkaunt yo'qmi?" : "Akkaunt bormi?"}{" "}
          <Link
            href={isLogin ? "/register" : "/login"}
            className="font-medium text-slate-950 underline"
          >
            {isLogin ? "Ro'yxatdan o'ting" : "Kirish"}
          </Link>
        </p>
      </section>
    </div>
  );
}
