"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { getUser, isAuthenticated, logout } from "@/lib/auth";
import type { User } from "@/types";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/detect", label: "Detect" },
  { href: "/history", label: "History" },
];

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

  useEffect(() => {
    const authed = isAuthenticated();

    if (requireAuth && !authed) {
      router.replace("/login");
      return;
    }

    if (!requireAuth && authed) {
      router.replace("/dashboard");
      return;
    }
  }, [requireAuth, router]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#ffe08a_0%,#f4f1e8_45%,#d9e6f2_100%)] text-slate-950">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-6">
        <header className="mb-8 flex flex-col gap-4 rounded-[28px] border border-black/10 bg-white/75 p-5 backdrop-blur md:flex-row md:items-center md:justify-between">
          <div>
            <Link href="/" className="font-heading text-2xl font-bold tracking-tight">
              Traffic Vision
            </Link>
            <p className="mt-1 text-sm text-slate-600">
              YOLOv8 detection, Java auth va FastAPI inference oqimi.
            </p>
          </div>

          <div className="flex flex-col gap-4 md:items-end">
            {requireAuth ? (
              <>
                <nav className="flex flex-wrap gap-2 text-sm">
                  {navItems.map((item) => {
                    const active = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`rounded-full px-4 py-2 transition ${
                          active
                            ? "bg-slate-950 text-white"
                            : "bg-slate-900/5 text-slate-700 hover:bg-slate-900/10"
                        }`}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>
                <div className="flex items-center gap-3 text-sm">
                  <div className="text-right">
                    <div className="font-medium" suppressHydrationWarning>
                      {user?.username ?? "User"}
                    </div>
                    <div className="text-slate-500" suppressHydrationWarning>
                      {user?.email ?? ""}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={logout}
                    className="rounded-full border border-slate-300 px-4 py-2 hover:bg-slate-100"
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <nav className="flex gap-2 text-sm">
                <Link
                  href="/login"
                  className="rounded-full bg-slate-950 px-4 py-2 text-white"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="rounded-full border border-slate-300 px-4 py-2"
                >
                  Register
                </Link>
              </nav>
            )}
          </div>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
