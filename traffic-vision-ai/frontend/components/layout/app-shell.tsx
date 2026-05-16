"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { getUser, isAuthenticated, logout } from "@/lib/auth";
import type { User } from "@/types";

const navItems = [
  { href: "/dashboard", label: "Bosh sahifa" },
  { href: "/detect", label: "Rasm orqali" },
  { href: "/live", label: "Jonli kuzatuv" },
  { href: "/history", label: "Tarix" },
  { href: "/models", label: "Model boshqaruvi" },
];

function UserInitial({ user }: { user: User | null }) {
  const letter = user?.username?.trim()?.charAt(0)?.toUpperCase() ?? "U";

  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-300 text-sm font-semibold text-slate-950">
      {letter}
    </div>
  );
}

type ThemeMode = "light" | "dark";

export function AppShell({
  children,
  requireAuth = true,
}: {
  children: React.ReactNode;
  requireAuth?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user] = useState<User | null>(() => getUser());
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>("light");

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setMounted(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const authed = isAuthenticated();

    if (requireAuth && !authed) {
      router.replace("/login");
      return;
    }

    if (!requireAuth && authed) {
      router.replace("/dashboard");
    }
  }, [requireAuth, router]);

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;

    const frame = window.requestAnimationFrame(() => {
      const savedTheme = window.localStorage.getItem("theme-mode");
      if (savedTheme === "light" || savedTheme === "dark") {
        setTheme(savedTheme);
        return;
      }

      setTheme(
        window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
      );
    });

    return () => window.cancelAnimationFrame(frame);
  }, [mounted]);

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;
    window.localStorage.setItem("theme-mode", theme);
  }, [mounted, theme]);

  const isDark = mounted && theme === "dark";
  const shellTheme = isDark
    ? "bg-[#050505] text-white"
    : "bg-[radial-gradient(circle_at_top,#ffe08a_0%,#f4f1e8_45%,#d9e6f2_100%)] text-slate-950";
  const authHeaderTheme = isDark
    ? "border-white/8 bg-[#0f0f10]/88 text-white"
    : "border-black/10 bg-white/75 text-slate-950";
  const authSubtextTheme = isDark ? "text-slate-400" : "text-slate-600";
  const authAltButtonTheme = isDark
    ? "border-white/10 text-white hover:bg-white/6"
    : "border-slate-300 text-slate-950 hover:bg-slate-50";
  const topbarTheme = isDark
    ? "border-white/8 bg-[#0b0b0b]/95"
    : "border-black/8 bg-white/88";
  const topbarSubtextTheme = isDark ? "text-slate-500" : "text-slate-600";
  const sidebarTheme = isDark
    ? "border-white/8 bg-[#070707]"
    : "border-black/8 bg-white/88";
  const sidebarMutedTheme = "text-slate-500";
  const sidebarNavActiveTheme = isDark
    ? "bg-white/10 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"
    : "bg-slate-950 text-white";
  const sidebarNavIdleTheme = isDark
    ? "text-slate-400 hover:bg-white/6 hover:text-white"
    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950";

  const themeLabel = isDark ? "Yorug' rejim" : "Tungi rejim";

  if (!requireAuth) {
    return (
      <div className={`min-h-screen ${shellTheme}`}>
        <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-6">
          <header
            className={`mb-8 flex flex-col gap-4 rounded-[28px] border p-5 backdrop-blur md:flex-row md:items-center md:justify-between ${authHeaderTheme}`}
          >
            <div>
              <Link href="/" className="font-heading text-2xl font-bold tracking-tight">
                Traffic Vision
              </Link>
              <p className={`mt-1 text-sm ${authSubtextTheme}`}>
                Yo&apos;l belgilarini tez aniqlash va kuzatuvni bir joyda boshqarish paneli.
              </p>
            </div>

            <nav className="flex flex-wrap gap-2 text-sm">
              <button
                type="button"
                onClick={() => setTheme(isDark ? "light" : "dark")}
                className={`rounded-full border px-4 py-2 ${authAltButtonTheme}`}
              >
                {themeLabel}
              </button>
              <Link
                href="/login"
                className="rounded-full bg-slate-950 px-4 py-2 text-white"
              >
                Kirish
              </Link>
              <Link
                href="/register"
                className={`rounded-full border px-4 py-2 ${authAltButtonTheme}`}
              >
                Ro&apos;yxatdan o&apos;tish
              </Link>
            </nav>
          </header>

          <main className="flex-1">{children}</main>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${shellTheme}`}>
      <div className="flex min-h-screen">
        <aside
          className={`hidden w-[248px] shrink-0 border-r xl:flex xl:flex-col ${sidebarTheme}`}
        >
          <div className="border-b border-inherit px-6 py-6">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-300 text-sm font-bold text-slate-950">
                TV
              </div>
              <div>
                <div className={`font-heading text-lg font-semibold ${isDark ? "text-white" : "text-slate-950"}`}>
                  Traffic
                </div>
                <div className={`text-xs uppercase tracking-[0.24em] ${sidebarMutedTheme}`}>
                  Vision
                </div>
              </div>
            </Link>
          </div>

          <nav className="flex-1 px-4 py-5">
            <div className="space-y-2">
              {navItems.map((item) => {
                const active = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center rounded-2xl px-4 py-3 text-sm font-medium transition ${
                      active ? sidebarNavActiveTheme : sidebarNavIdleTheme
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>

          <div className="border-t border-inherit px-6 py-5">
            <div
              className={`text-sm font-medium ${isDark ? "text-white" : "text-slate-950"}`}
              suppressHydrationWarning
            >
              {user?.username ?? "Foydalanuvchi"}
            </div>
            <div className={`mt-1 text-xs ${sidebarMutedTheme}`} suppressHydrationWarning>
              {user?.email ?? ""}
            </div>
            <button
              type="button"
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className={`mt-4 block text-sm ${isDark ? "text-slate-300 hover:text-white" : "text-slate-700 hover:text-slate-950"}`}
            >
              {themeLabel}
            </button>
            <button
              type="button"
              onClick={logout}
              className={`mt-4 text-sm transition ${isDark ? "text-slate-300 hover:text-white" : "text-slate-700 hover:text-slate-950"}`}
            >
              Chiqish
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className={`border-b backdrop-blur ${topbarTheme}`}>
            <div className="flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
              <div>
                <div className={`font-heading text-2xl font-semibold ${isDark ? "text-white" : "text-slate-950"}`}>
                  Boshqaruv paneli
                </div>
                <div className={`mt-1 text-sm ${topbarSubtextTheme}`}>
                  Kuzatuv, aniqlash va tarix bo&apos;limlari bir joyda.
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setTheme(isDark ? "light" : "dark")}
                  className={`rounded-full border px-4 py-2 text-sm ${authAltButtonTheme}`}
                >
                  {themeLabel}
                </button>
                <div className="hidden text-right sm:block">
                  <div
                    className={`text-sm font-medium ${isDark ? "text-white" : "text-slate-950"}`}
                    suppressHydrationWarning
                  >
                    {user?.username ?? "Foydalanuvchi"}
                  </div>
                  <div className={`text-xs ${topbarSubtextTheme}`} suppressHydrationWarning>
                    {user?.email ?? ""}
                  </div>
                </div>
                <UserInitial user={user} />
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
