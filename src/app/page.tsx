"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { getProjects, getProjectMembers, type Project } from "@/lib/supabase";
import { seedAto1Project } from "@/lib/seed-ato1";
import Header from "@/components/Header";
import LoginScreen from "@/components/LoginScreen";
import { LayoutDashboard, Vote, Trophy, Archive, Plus, ArrowRight, Loader2 } from "lucide-react";

export default function Home() {
  const { user, loading, supabase } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [pendingVotes, setPendingVotes] = useState(0);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!supabase || !user) return;
    let cancelled = false;

    (async () => {
      try {
        const userEmail = user.email || "";
        const userName = user.user_metadata?.full_name || userEmail.split("@")[0];
        const userAvatar = user.user_metadata?.avatar_url || null;

        await seedAto1Project(supabase, userEmail, userName, userAvatar);

        const data = await getProjects(supabase);
        if (cancelled) return;
        setProjects(data);

        // Count pending votes
        const votingProjects = data.filter((p) => p.status === "voting");
        let pending = 0;
        for (const p of votingProjects) {
          try {
            const members = await getProjectMembers(supabase, p.id);
            const me = members.find((m) => m.user_email === userEmail);
            if (me && !me.has_finalized) pending++;
          } catch { /* ignore */ }
        }
        if (!cancelled) setPendingVotes(pending);
      } catch { /* ignore */ }
      finally { if (!cancelled) setLoadingData(false); }
    })();

    return () => { cancelled = true; };
  }, [supabase, user]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: "var(--foreground-muted)" }}>Carregando...</div>
      </div>
    );
  }

  if (!user) return <LoginScreen />;

  const votingCount = projects.filter((p) => p.status === "voting").length;
  const finalizedCount = projects.filter((p) => p.status === "finalized" || p.status === "archived").length;
  const recentProjects = [...projects].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 4);

  const statCards = [
    { label: "Projetos Ativos", value: votingCount, icon: Vote, color: "var(--fips-blue)", bg: "rgba(0,144,208,0.08)", href: "/projetos" },
    { label: "Votos Pendentes", value: pendingVotes, icon: LayoutDashboard, color: "var(--primary)", bg: "rgba(246,146,30,0.08)", href: "/projetos" },
    { label: "Finalizados", value: finalizedCount, icon: Trophy, color: "var(--success)", bg: "rgba(0,198,76,0.08)", href: "/acervo" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <Header />

      {/* Hero */}
      <div
        style={{
          margin: "16px 16px 0",
          borderRadius: 20,
          padding: "40px 32px",
          position: "relative",
          overflow: "hidden",
          background: "var(--gradient-hero)",
        }}
      >
        <div style={{ position: "relative", zIndex: 1 }}>
          <h2 style={{ color: "#fff", fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
            Bem-vindo, {user.user_metadata?.full_name?.split(" ")[0] || "Gestor"}
          </h2>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", lineHeight: 1.6, margin: 0, maxWidth: 500 }}>
            Acompanhe seus projetos de votação, crie novos e visualize resultados aprovados.
          </p>
          <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
            <Link
              href="/projetos/novo"
              style={{
                display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 14,
                fontSize: 13, fontWeight: 600, color: "#fff", background: "rgba(255,255,255,0.15)",
                border: "1px solid rgba(255,255,255,0.25)", textDecoration: "none", backdropFilter: "blur(8px)",
              }}
            >
              <Plus size={16} />
              Criar Projeto
            </Link>
          </div>
        </div>
        <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%", opacity: 0.08, background: "#fff" }} />
        <div style={{ position: "absolute", bottom: -80, left: -32, width: 260, height: 260, borderRadius: "50%", opacity: 0.05, background: "#fff" }} />
      </div>

      <div style={{ maxWidth: 1440, margin: "0 auto", padding: "24px 16px 48px" }}>
        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 32 }}>
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.label}
                href={card.href}
                style={{
                  display: "flex", alignItems: "center", gap: 16, padding: "20px 24px", borderRadius: 16,
                  background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card)",
                  textDecoration: "none", transition: "transform 0.15s, box-shadow 0.15s",
                }}
              >
                <div style={{ width: 48, height: 48, borderRadius: 14, background: card.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon size={22} color={card.color} />
                </div>
                <div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: "var(--foreground)", lineHeight: 1 }}>{loadingData ? "—" : card.value}</div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: "var(--foreground-muted)", marginTop: 4 }}>{card.label}</div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Recent Projects */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>Projetos Recentes</h3>
          <Link href="/projetos" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "var(--fips-blue)", textDecoration: "none" }}>
            Ver todos <ArrowRight size={14} />
          </Link>
        </div>

        {loadingData ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <Loader2 size={24} className="animate-spin" style={{ color: "var(--fips-cyan)", margin: "0 auto" }} />
          </div>
        ) : recentProjects.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "var(--foreground-muted)", fontSize: 14 }}>
            Nenhum projeto criado ainda. Crie seu primeiro projeto!
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
            {recentProjects.map((project) => {
              const statusMap: Record<string, { label: string; color: string; bg: string }> = {
                draft: { label: "Rascunho", color: "#6b7280", bg: "rgba(107,114,128,0.1)" },
                voting: { label: "Em Votação", color: "var(--fips-blue)", bg: "rgba(0,144,208,0.1)" },
                finalized: { label: "Finalizado", color: "var(--success)", bg: "rgba(0,198,76,0.1)" },
                archived: { label: "Arquivado", color: "var(--foreground-muted)", bg: "rgba(107,114,128,0.1)" },
              };
              const st = statusMap[project.status] || statusMap.draft;

              return (
                <Link
                  key={project.id}
                  href={`/projeto/${project.id}`}
                  style={{
                    display: "block", borderRadius: 16, overflow: "hidden",
                    background: "var(--bg-card)", border: "1px solid var(--border)",
                    boxShadow: "var(--shadow-card)", textDecoration: "none",
                    transition: "transform 0.15s, box-shadow 0.15s",
                  }}
                >
                  <div style={{ height: 48, background: "linear-gradient(135deg, var(--fips-blue), var(--fips-cyan))" }} />
                  <div style={{ padding: "14px 18px 18px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <h4 style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)", margin: 0, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {project.name}
                      </h4>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 99, color: st.color, background: st.bg, whiteSpace: "nowrap", marginLeft: 8 }}>
                        {st.label}
                      </span>
                    </div>
                    {project.description && (
                      <p style={{ fontSize: 12, color: "var(--foreground-muted)", lineHeight: 1.5, margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {project.description}
                      </p>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
                      {project.created_by_avatar ? (
                        <img src={project.created_by_avatar} alt="" style={{ width: 20, height: 20, borderRadius: "50%" }} referrerPolicy="no-referrer" />
                      ) : (
                        <div style={{ width: 20, height: 20, borderRadius: "50%", background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#fff" }}>
                          {(project.created_by_name || "?").charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span style={{ fontSize: 11, color: "var(--foreground-subtle)" }}>{project.created_by_name}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Quick links */}
        <div style={{ display: "flex", gap: 12, marginTop: 32, flexWrap: "wrap" }}>
          <Link
            href="/projetos"
            style={{
              display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 24px", borderRadius: 14,
              fontSize: 13, fontWeight: 600, color: "var(--fips-blue)", background: "rgba(0,144,208,0.08)",
              border: "1px solid rgba(0,144,208,0.15)", textDecoration: "none",
            }}
          >
            <LayoutDashboard size={16} />
            Painel de Projetos
          </Link>
          <Link
            href="/acervo"
            style={{
              display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 24px", borderRadius: 14,
              fontSize: 13, fontWeight: 600, color: "var(--success)", background: "rgba(0,198,76,0.08)",
              border: "1px solid rgba(0,198,76,0.15)", textDecoration: "none",
            }}
          >
            <Archive size={16} />
            Ver Acervo
          </Link>
        </div>
      </div>
    </div>
  );
}
