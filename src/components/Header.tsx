"use client";

import { useAuth } from "@/lib/auth";
import { LogOut, LayoutDashboard, Archive, Bell, Home } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import Logo3D from "./Logo3D";
import { getProjects, getProjectMembers } from "@/lib/supabase";

export default function Header() {
  const { user, signOut, supabase } = useAuth();
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState(0);

  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "";
  const userAvatar = user?.user_metadata?.avatar_url || "";
  const userInitials = userName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  // Load pending votes count
  useEffect(() => {
    if (!supabase || !user?.email) return;
    let cancelled = false;

    (async () => {
      try {
        const projects = await getProjects(supabase);
        const votingProjects = projects.filter((p) => p.status === "voting");
        let count = 0;

        for (const p of votingProjects) {
          const members = await getProjectMembers(supabase, p.id);
          const me = members.find((m) => m.user_email === user.email);
          if (me && !me.has_finalized) count++;
        }

        if (!cancelled) setPendingCount(count);
      } catch { /* ignore */ }
    })();

    return () => { cancelled = true; };
  }, [supabase, user?.email]);

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + "/");

  return (
    <header
      className="sticky top-0 z-40"
      style={{
        background: "rgba(255, 255, 255, 0.92)",
        backdropFilter: "blur(14px)",
        borderBottom: "1px solid var(--border-light)",
      }}
    >
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-2 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3" style={{ textDecoration: "none" }}>
          <Logo3D size={36} />
          <div>
            <h1 className="text-base font-bold leading-tight" style={{ color: "var(--foreground)" }}>
              Votação
            </h1>
            <p className="text-[11px] font-medium" style={{ color: "var(--foreground-muted)" }}>
              Centro de Aprovação
            </p>
          </div>
        </Link>

        {/* Nav + Actions */}
        <div className="flex items-center gap-2">
          {/* Nav Links */}
          <Link
            href="/"
            className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all"
            style={{
              background: pathname === "/" ? "rgba(0,144,208,0.12)" : "transparent",
              color: pathname === "/" ? "var(--fips-blue)" : "var(--foreground-muted)",
              textDecoration: "none",
              border: pathname === "/" ? "1px solid rgba(0,144,208,0.2)" : "1px solid transparent",
            }}
          >
            <Home size={14} />
            Dashboard
          </Link>
          <Link
            href="/projetos"
            className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all"
            style={{
              background: isActive("/projetos") ? "rgba(0,144,208,0.12)" : "transparent",
              color: isActive("/projetos") ? "var(--fips-blue)" : "var(--foreground-muted)",
              textDecoration: "none",
              border: isActive("/projetos") ? "1px solid rgba(0,144,208,0.2)" : "1px solid transparent",
            }}
          >
            <LayoutDashboard size={14} />
            Projetos
          </Link>
          <Link
            href="/acervo"
            className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all"
            style={{
              background: isActive("/acervo") ? "rgba(0,144,208,0.12)" : "transparent",
              color: isActive("/acervo") ? "var(--fips-blue)" : "var(--foreground-muted)",
              textDecoration: "none",
              border: isActive("/acervo") ? "1px solid rgba(0,144,208,0.2)" : "1px solid transparent",
            }}
          >
            <Archive size={14} />
            Acervo
          </Link>

          {/* Notification Bell */}
          <Link
            href="/projetos"
            className="relative p-2 rounded-lg transition-all"
            style={{
              color: pendingCount > 0 ? "var(--primary)" : "var(--foreground-subtle)",
              textDecoration: "none",
            }}
            title={pendingCount > 0 ? `${pendingCount} voto(s) pendente(s)` : "Sem votos pendentes"}
          >
            <Bell size={18} />
            {pendingCount > 0 && (
              <span
                className="absolute flex items-center justify-center text-[9px] font-bold text-white"
                style={{
                  top: 2,
                  right: 2,
                  minWidth: 16,
                  height: 16,
                  borderRadius: 8,
                  background: "linear-gradient(135deg, #f6921e, #e07310)",
                  boxShadow: "0 2px 6px rgba(246, 146, 30, 0.5)",
                  padding: "0 4px",
                }}
              >
                {pendingCount}
              </span>
            )}
          </Link>

          {/* User */}
          {user && (
            <div className="flex items-center gap-2">
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                style={{ background: "var(--primary-50)", border: "1px solid rgba(246, 146, 30, 0.2)" }}
              >
                {userAvatar ? (
                  <img src={userAvatar} alt="" className="w-5 h-5 rounded-full" referrerPolicy="no-referrer" />
                ) : (
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                    style={{ background: "linear-gradient(135deg, #f6921e, #e07310)" }}
                  >
                    {userInitials}
                  </div>
                )}
                <span className="text-[11px] font-semibold hidden md:inline" style={{ color: "var(--foreground)" }}>
                  {userName}
                </span>
              </div>

              <button
                onClick={signOut}
                className="p-2 rounded-lg transition-all cursor-pointer"
                style={{ color: "var(--foreground-subtle)" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "var(--error)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "var(--foreground-subtle)"; }}
                title="Sair"
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
