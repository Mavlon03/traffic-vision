"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { authApi } from "@/lib/api";
import { saveAuth } from "@/lib/auth";

type Mode = "login" | "register";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isLogin = mode === "login";

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
      <section className="rounded-[32px] bg-slate-950 p-8 text-white shadow-2xl sm:p-10">
        <p className="font-mono text-xs uppercase tracking-[0.35em] text-amber-300">
          Traffic Vision Stack
        </p>
        <h1 className="mt-4 max-w-xl font-heading text-4xl font-bold tracking-tight sm:text-5xl">
          Java, Python va YOLOv8 oqimini bitta panelga yig&apos;amiz.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">
          Login qiling, rasm yuboring va model chiqargan belgilarni bir joyda
          ko&apos;ring. Bu scaffold backend contractni tez tekshirish uchun
          tuzilgan.
        </p>
      </section>

      <section className="rounded-[32px] border border-black/10 bg-white/85 p-8 shadow-xl backdrop-blur sm:p-10">
        <div className="mb-6">
          <h2 className="font-heading text-3xl font-semibold tracking-tight">
            {isLogin ? "Tizimga kirish" : "Ro&apos;yxatdan o&apos;tish"}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {isLogin
              ? "JWT token olish uchun email va parol kiriting."
              : "Yangi foydalanuvchi yaratib, darhol dashboardga o'ting."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin ? (
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Username
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
            {loading ? "Yuborilmoqda..." : isLogin ? "Login" : "Register"}
          </button>
        </form>

        <p className="mt-5 text-sm text-slate-600">
          {isLogin ? "Akkaunt yo&apos;qmi?" : "Akkaunt bormi?"}{" "}
          <Link
            href={isLogin ? "/register" : "/login"}
            className="font-medium text-slate-950 underline"
          >
            {isLogin ? "Ro&apos;yxatdan o&apos;ting" : "Login qiling"}
          </Link>
        </p>
      </section>
    </div>
  );
}
