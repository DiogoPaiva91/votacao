"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import {
  getProjects,
  getFinalizedProjects,
  getWinningOptions,
  type Project,
  type WinnerResult,
} from "@/lib/supabase";
import Header from "@/components/Header";
import LoginScreen from "@/components/LoginScreen";
import {
  Trophy,
  Calendar,
  Filter,
  ChevronRight,
  FileText,
  Award,
  Clock,
  Download,
  FileDown,
} from "lucide-react";

type TimeFilter = "all" | "today" | "week" | "month";

interface ProjectWinnerResult {
  project: Project;
  items: WinnerResult[];
}

function isInPeriod(dateStr: string, filter: TimeFilter): boolean {
  if (filter === "all") return true;
  const date = new Date(dateStr);
  const now = new Date();

  if (filter === "today") {
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    );
  }
  if (filter === "week") {
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return date >= weekAgo;
  }
  if (filter === "month") {
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return date >= monthAgo;
  }
  return true;
}

const timeLabels: Record<TimeFilter, string> = {
  all: "Todos",
  today: "Hoje",
  week: "Semana",
  month: "Mês",
};

// ---------- Export helpers ----------

function generateTxtContent(results: ProjectWinnerResult[]): string {
  let txt = "═══════════════════════════════════════════\n";
  txt += "        RELATÓRIO DE VENCEDORES - FIPS\n";
  txt += "═══════════════════════════════════════════\n";
  txt += `Data: ${new Date().toLocaleDateString("pt-BR")} ${new Date().toLocaleTimeString("pt-BR")}\n\n`;

  for (const w of results) {
    txt += "───────────────────────────────────────────\n";
    txt += `PROJETO: ${w.project.name}\n`;
    txt += `Finalizado em: ${new Date(w.project.updated_at).toLocaleDateString("pt-BR")}\n`;
    if (w.project.description) txt += `Descrição: ${w.project.description}\n`;
    txt += "───────────────────────────────────────────\n\n";

    for (const result of w.items) {
      txt += `  🏆 ${result.item.title}\n`;
      if (result.winners.length > 0) {
        for (const win of result.winners) {
          txt += `     Vencedor: ${win.option.label}\n`;
          if (win.option.description) txt += `     Detalhe: ${win.option.description}\n`;
          txt += `     Votos: ${win.voteCount} de ${result.totalVotes}\n`;
          const pct = result.totalVotes > 0 ? Math.round((win.voteCount / result.totalVotes) * 100) : 0;
          txt += `     Percentual: ${pct}%\n`;
          if (win.option.file_url) txt += `     Arquivo: ${win.option.file_url}\n`;
        }
        if (result.tiebreakerRound) {
          txt += `     [Decidido na ${result.tiebreakerRound.round_number}ª rodada de desempate]\n`;
        }
      } else {
        txt += `     Sem votos registrados\n`;
      }
      txt += "\n";
    }
    txt += "\n";
  }

  txt += "═══════════════════════════════════════════\n";
  txt += "Gerado automaticamente pelo sistema Votação FIPS\n";
  return txt;
}

function generateHtmlDoc(results: ProjectWinnerResult[]): string {
  let html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Relatório de Vencedores - FIPS</title>
<style>
  body { font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #1a1a2e; }
  h1 { color: #003b8f; border-bottom: 3px solid #f6921e; padding-bottom: 12px; }
  .date { color: #666; font-size: 14px; margin-bottom: 32px; }
  .project { margin-bottom: 40px; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
  .project-header { background: linear-gradient(135deg, #003b8f, #0090d0); color: #fff; padding: 20px 24px; }
  .project-header h2 { margin: 0 0 4px; font-size: 20px; }
  .project-header .meta { font-size: 13px; opacity: 0.8; }
  .items { padding: 20px 24px; }
  .item { padding: 16px; margin-bottom: 12px; border-radius: 10px; background: #f8fafc; border-left: 4px solid #f6921e; }
  .item-title { font-weight: 700; font-size: 15px; color: #003b8f; margin-bottom: 8px; }
  .winner-label { font-size: 18px; font-weight: 700; color: #1a1a2e; }
  .winner-desc { font-size: 13px; color: #666; margin-top: 4px; }
  .votes { display: inline-block; background: #00c64c; color: #fff; padding: 3px 12px; border-radius: 99px; font-size: 12px; font-weight: 700; margin-top: 8px; }
  .trophy { font-size: 20px; }
  .no-votes { color: #999; font-style: italic; }
  .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #999; font-size: 12px; }
</style>
</head>
<body>
<h1>🏆 Relatório de Vencedores</h1>
<p class="date">Gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}</p>
`;

  for (const w of results) {
    html += `<div class="project">
  <div class="project-header">
    <h2>${w.project.name}</h2>
    <div class="meta">Finalizado em ${new Date(w.project.updated_at).toLocaleDateString("pt-BR")}</div>
  </div>
  <div class="items">`;

    for (const result of w.items) {
      html += `<div class="item">
    <div class="item-title"><span class="trophy">🏆</span> ${result.item.title}</div>`;

      if (result.winners.length > 0) {
        for (const win of result.winners) {
          const pct = result.totalVotes > 0 ? Math.round((win.voteCount / result.totalVotes) * 100) : 0;
          html += `<div class="winner-label">${win.option.label}</div>`;
          if (win.option.description) {
            html += `<div class="winner-desc">${win.option.description}</div>`;
          }
          html += `<div class="votes">✓ ${win.voteCount} de ${result.totalVotes} votos (${pct}%)</div>`;
        }
        if (result.tiebreakerRound) {
          html += `<div class="winner-desc" style="margin-top:8px;font-weight:600;">Decidido na ${result.tiebreakerRound.round_number}ª rodada de desempate</div>`;
        }
      } else {
        html += `<div class="no-votes">Sem votos registrados</div>`;
      }
      html += `</div>`;
    }

    html += `</div></div>`;
  }

  html += `<div class="footer">Votação FIPS — Centro de Aprovação de Projetos</div>
</body></html>`;
  return html;
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---------- component ----------

export default function VencedoresPage() {
  const { user, loading: authLoading, supabase } = useAuth();
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [winners, setWinners] = useState<ProjectWinnerResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");

  useEffect(() => {
    if (!supabase || !user) return;
    let cancelled = false;

    (async () => {
      try {
        const [finalized, all] = await Promise.all([
          getFinalizedProjects(supabase),
          getProjects(supabase),
        ]);

        if (cancelled) return;
        setAllProjects(all);

        const results: ProjectWinnerResult[] = [];
        for (const project of finalized) {
          const items = await getWinningOptions(supabase, project.id);
          results.push({ project, items });
        }

        if (!cancelled) setWinners(results);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [supabase, user]);

  const filteredWinners = useMemo(() => {
    return winners.filter((w) => {
      if (!isInPeriod(w.project.updated_at, timeFilter)) return false;
      if (projectFilter !== "all" && w.project.id !== projectFilter) return false;
      return true;
    });
  }, [winners, timeFilter, projectFilter]);

  const handleExportTxt = useCallback(() => {
    const content = generateTxtContent(filteredWinners);
    downloadFile(content, `vencedores_fips_${new Date().toISOString().slice(0, 10)}.txt`, "text/plain;charset=utf-8");
  }, [filteredWinners]);

  const handleExportDoc = useCallback(() => {
    const content = generateHtmlDoc(filteredWinners);
    downloadFile(content, `vencedores_fips_${new Date().toISOString().slice(0, 10)}.doc`, "application/msword");
  }, [filteredWinners]);

  const handleExportPdf = useCallback(() => {
    const content = generateHtmlDoc(filteredWinners);
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(content);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  }, [filteredWinners]);

  if (authLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
        <p style={{ color: "var(--foreground-muted)" }}>Carregando...</p>
      </div>
    );
  }

  if (!user) return <LoginScreen />;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: "Manrope, sans-serif" }}>
      <Header />

      {/* Hero */}
      <div
        style={{
          margin: "16px 16px 0",
          borderRadius: 20,
          padding: "32px 32px",
          position: "relative",
          overflow: "hidden",
          background: "linear-gradient(135deg, #003b8f 0%, #00c64c 100%)",
        }}
      >
        <div style={{ position: "relative", zIndex: 1 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 16px",
              borderRadius: 999,
              marginBottom: 16,
              fontSize: 12,
              fontWeight: 700,
              background: "rgba(255, 255, 255, 0.15)",
              color: "#fff",
            }}
          >
            <Trophy size={14} />
            ARQUIVO DE VENCEDORES
          </div>
          <h2 style={{ color: "#fff", fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
            Resultados das Votações
          </h2>
          <p style={{ fontSize: 14, maxWidth: 640, color: "rgba(255,255,255,0.75)", lineHeight: 1.6, margin: 0 }}>
            Visualize os vencedores de cada projeto finalizado. Filtre por período ou por projeto e exporte os resultados.
          </p>
        </div>
        <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: "50%", opacity: 0.1, background: "#fff" }} />
      </div>

      {/* Filters + Export */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 16px 0" }}>
        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 24,
          }}
        >
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            {/* Time filter */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Calendar size={16} style={{ color: "var(--foreground-muted)" }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground-muted)" }}>Período:</span>
            </div>
            <div
              style={{
                display: "flex",
                gap: 4,
                background: "var(--bg-card)",
                borderRadius: 12,
                padding: 4,
                border: "1px solid var(--border)",
              }}
            >
              {(["all", "today", "week", "month"] as TimeFilter[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTimeFilter(t)}
                  style={{
                    padding: "6px 16px",
                    borderRadius: 8,
                    border: "none",
                    background: timeFilter === t ? "var(--fips-blue)" : "transparent",
                    color: timeFilter === t ? "#fff" : "var(--foreground-muted)",
                    fontWeight: 600,
                    fontSize: 12,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    transition: "all 0.15s",
                  }}
                >
                  {timeLabels[t]}
                </button>
              ))}
            </div>

            {/* Project filter */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 8 }}>
              <Filter size={16} style={{ color: "var(--foreground-muted)" }} />
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "var(--bg-card)",
                  color: "var(--foreground)",
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: "inherit",
                  cursor: "pointer",
                }}
              >
                <option value="all">Todos os projetos</option>
                {allProjects
                  .filter((p) => p.status === "finalized")
                  .map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
              </select>
            </div>
          </div>

          {/* Export buttons */}
          {filteredWinners.length > 0 && (
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={handleExportTxt}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 16px",
                  borderRadius: 10,
                  border: "1px solid var(--border)",
                  background: "var(--bg-card)",
                  color: "var(--foreground)",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all 0.15s",
                }}
              >
                <Download size={14} />
                TXT
              </button>
              <button
                onClick={handleExportDoc}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 16px",
                  borderRadius: 10,
                  border: "1px solid var(--border)",
                  background: "var(--bg-card)",
                  color: "var(--foreground)",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all 0.15s",
                }}
              >
                <FileDown size={14} />
                Word
              </button>
              <button
                onClick={handleExportPdf}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 16px",
                  borderRadius: 10,
                  border: "none",
                  background: "var(--fips-blue)",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  boxShadow: "0 2px 8px rgba(0,144,208,0.3)",
                  transition: "all 0.15s",
                }}
              >
                <FileDown size={14} />
                PDF
              </button>
            </div>
          )}
        </div>

        {/* Results */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "80px 24px", color: "var(--foreground-muted)" }}>
            Carregando resultados...
          </div>
        ) : filteredWinners.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "80px 24px",
              background: "var(--bg-card)",
              borderRadius: 20,
              boxShadow: "var(--shadow-card)",
            }}
          >
            <Trophy size={48} color="var(--foreground-subtle)" style={{ marginBottom: 16 }} />
            <p style={{ fontWeight: 700, fontSize: 16, color: "var(--foreground)", marginBottom: 4 }}>
              Nenhum resultado encontrado
            </p>
            <p style={{ fontSize: 13, color: "var(--foreground-muted)", margin: 0 }}>
              Nenhum projeto finalizado neste período. Finalize a votação de um projeto para ver os vencedores aqui.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 24, paddingBottom: 48 }}>
            {filteredWinners.map((w) => (
              <div
                key={w.project.id}
                style={{
                  background: "var(--bg-card)",
                  borderRadius: 20,
                  boxShadow: "var(--shadow-card)",
                  overflow: "hidden",
                }}
              >
                {/* Project header */}
                <div
                  style={{
                    padding: "20px 24px",
                    background: "linear-gradient(135deg, var(--surface-dark) 0%, var(--surface-dark-soft) 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 16,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                      <Trophy size={20} color="#fdc24e" />
                      <h3 style={{ fontSize: 18, fontWeight: 700, color: "#fff", margin: 0 }}>
                        {w.project.name}
                      </h3>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                      <Clock size={12} style={{ color: "rgba(255,255,255,0.5)" }} />
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
                        Finalizado em {new Date(w.project.updated_at).toLocaleDateString("pt-BR")}
                      </span>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 99,
                        background: "rgba(0,198,76,0.2)",
                        color: "#8be5ad",
                        marginLeft: 4,
                      }}>
                        {w.items.length} {w.items.length === 1 ? "item" : "itens"}
                      </span>
                    </div>
                  </div>
                  <Link
                    href={`/projeto/${w.project.id}`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "8px 16px",
                      borderRadius: 10,
                      background: "rgba(255,255,255,0.1)",
                      color: "#fff",
                      fontSize: 12,
                      fontWeight: 600,
                      textDecoration: "none",
                      border: "1px solid rgba(255,255,255,0.15)",
                    }}
                  >
                    Ver projeto <ChevronRight size={14} />
                  </Link>
                </div>

                {/* Winners grid */}
                <div style={{ padding: 24 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
                    {w.items.map((result, idx) => {
                      const topWinner = result.winners[0] || null;
                      const hasWinner = result.winners.length > 0;
                      return (
                        <div
                          key={result.item.id}
                          style={{
                            border: hasWinner ? "2px solid rgba(0,198,76,0.2)" : "1px solid var(--border)",
                            borderRadius: 16,
                            padding: 20,
                            background: hasWinner
                              ? "linear-gradient(135deg, rgba(0,198,76,0.04) 0%, rgba(246,146,30,0.04) 100%)"
                              : "var(--bg-muted)",
                            position: "relative",
                            overflow: "hidden",
                          }}
                        >
                          {/* Trophy badge */}
                          {hasWinner && (
                            <div
                              style={{
                                position: "absolute",
                                top: 12,
                                right: 12,
                                width: 36,
                                height: 36,
                                borderRadius: "50%",
                                background: "linear-gradient(135deg, #fdc24e 0%, #f6921e 100%)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                boxShadow: "0 4px 12px rgba(246,146,30,0.3)",
                              }}
                            >
                              <Trophy size={18} color="#fff" />
                            </div>
                          )}

                          {/* Tiebreaker badge */}
                          {result.tiebreakerRound && result.tiebreakerRound.status === "resolved" && (
                            <div
                              style={{
                                position: "absolute",
                                top: 12,
                                right: hasWinner ? 56 : 12,
                                padding: "4px 10px",
                                borderRadius: 8,
                                background: "rgba(168,85,247,0.1)",
                                color: "#a855f7",
                                fontSize: 10,
                                fontWeight: 700,
                              }}
                            >
                              Desempate {result.tiebreakerRound.round_number}a rodada
                            </div>
                          )}

                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                            <div
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: 8,
                                background: hasWinner ? "rgba(0,198,76,0.1)" : "var(--bg-elevated)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 13,
                                fontWeight: 800,
                                color: hasWinner ? "var(--success)" : "var(--foreground-subtle)",
                              }}
                            >
                              {idx + 1}
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)", flex: 1, paddingRight: 40 }}>
                              {result.item.title}
                            </span>
                          </div>

                          {hasWinner ? (
                            <div>
                              {result.winners.map((win, wIdx) => {
                                const pct = result.totalVotes > 0 ? Math.round((win.voteCount / result.totalVotes) * 100) : 0;
                                return (
                                  <div key={win.option.id} style={{ marginBottom: wIdx < result.winners.length - 1 ? 12 : 0 }}>
                                    {win.option.image_url && (
                                      <img
                                        src={win.option.image_url}
                                        alt={win.option.label}
                                        style={{
                                          width: "100%",
                                          height: 120,
                                          objectFit: "cover",
                                          borderRadius: 10,
                                          marginBottom: 12,
                                          border: "1px solid var(--border)",
                                        }}
                                      />
                                    )}

                                    <p style={{ fontSize: 16, fontWeight: 800, color: "var(--foreground)", margin: "0 0 4px" }}>
                                      {result.winners.length > 1 && <span style={{ fontSize: 12, color: "var(--foreground-muted)", marginRight: 6 }}>#{wIdx + 1}</span>}
                                      {win.option.label}
                                    </p>
                                    {win.option.description && (
                                      <p style={{ fontSize: 12, color: "var(--foreground-muted)", margin: "0 0 12px", lineHeight: 1.5 }}>
                                        {win.option.description}
                                      </p>
                                    )}

                                    {win.option.file_url && (
                                      <a
                                        href={win.option.file_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                          display: "inline-flex",
                                          alignItems: "center",
                                          gap: 6,
                                          padding: "6px 12px",
                                          borderRadius: 8,
                                          background: "var(--primary-50)",
                                          color: "var(--primary)",
                                          fontSize: 12,
                                          fontWeight: 600,
                                          textDecoration: "none",
                                          marginBottom: 12,
                                        }}
                                      >
                                        <FileText size={14} /> Abrir arquivo
                                      </a>
                                    )}

                                    {/* Vote bar */}
                                    <div style={{ marginTop: 8 }}>
                                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--foreground-muted)" }}>
                                          Votos recebidos
                                        </span>
                                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--success)" }}>
                                          {win.voteCount}/{result.totalVotes} ({pct}%)
                                        </span>
                                      </div>
                                      <div
                                        style={{
                                          height: 6,
                                          borderRadius: 3,
                                          background: "var(--border)",
                                          overflow: "hidden",
                                        }}
                                      >
                                        <div
                                          style={{
                                            height: "100%",
                                            width: `${pct}%`,
                                            borderRadius: 3,
                                            background: "linear-gradient(90deg, var(--success), #00e676)",
                                            transition: "width 0.5s ease",
                                          }}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "16px 0" }}>
                              <Award size={20} color="var(--foreground-subtle)" />
                              <p style={{ fontSize: 13, color: "var(--foreground-subtle)", margin: 0 }}>
                                Sem votos registrados
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
