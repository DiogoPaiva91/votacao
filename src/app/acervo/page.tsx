"use client";

import { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import {
  getAcervoItems,
  getAcervoOptions,
  getAcervoLikes,
  getAcervoVotes,
  toggleAcervoLike,
  submitAcervoVote,
  resolveAcervoItem,
  getFinalizedProjects,
  getWinningOptions,
  getProjectTopWinners,
  getProjects,
  type AcervoItem,
  type AcervoOption,
  type AcervoLike,
  type AcervoVote,
  type Project,
  type WinnerResult,
} from "@/lib/supabase";
import Header from "@/components/Header";
import LoginScreen from "@/components/LoginScreen";
import {
  Archive,
  Heart,
  FileText,
  Presentation,
  Table,
  FileCode,
  Braces,
  Trophy,
  Vote,
  Check,
  ExternalLink,
  Loader2,
  Search,
  Image as ImageIcon,
  Calendar,
  Download,
  FileDown,
  Filter,
  Clock,
  ChevronRight,
  Award,
} from "lucide-react";

type AcervoTab = "todos" | "aprovados" | "desempate" | "vencedores";
type TypeFilter = "all" | "image" | "document" | "presentation" | "spreadsheet";

const IMAGE_EXTS = ["jpg", "jpeg", "png", "gif", "webp", "svg"];
const PRES_EXTS = ["ppt", "pptx"];

function getFileCategory(fileType: string | null): string {
  if (!fileType) return "document";
  const ext = fileType.replace(".", "").toLowerCase();
  if (IMAGE_EXTS.includes(ext)) return "image";
  if (PRES_EXTS.includes(ext)) return "presentation";
  if (["xls", "xlsx", "csv", "json"].includes(ext)) return "spreadsheet";
  return "document";
}

function isImageFile(fileType: string | null): boolean {
  if (!fileType) return false;
  return IMAGE_EXTS.includes(fileType.replace(".", "").toLowerCase());
}

function getFileIcon(fileType: string | null) {
  if (!fileType) return { icon: FileText, color: "#6b7280", bg: "rgba(107,114,128,0.1)", label: "TXT" };
  const ext = fileType.replace(".", "").toLowerCase();
  if (PRES_EXTS.includes(ext)) return { icon: Presentation, color: "#f6921e", bg: "rgba(246,146,30,0.1)", label: ext.toUpperCase() };
  if (ext === "pdf") return { icon: FileText, color: "#ef4444", bg: "rgba(239,68,68,0.1)", label: "PDF" };
  if (["doc", "docx"].includes(ext)) return { icon: FileText, color: "#3b82f6", bg: "rgba(59,130,246,0.1)", label: ext.toUpperCase() };
  if (["md", "txt"].includes(ext)) return { icon: FileCode, color: "#6b7280", bg: "rgba(107,114,128,0.1)", label: ext.toUpperCase() };
  if (["xls", "xlsx", "csv"].includes(ext)) return { icon: Table, color: "#22c55e", bg: "rgba(34,197,94,0.1)", label: ext.toUpperCase() };
  if (ext === "json") return { icon: Braces, color: "#a855f7", bg: "rgba(168,85,247,0.1)", label: "JSON" };
  return { icon: FileText, color: "#6b7280", bg: "rgba(107,114,128,0.1)", label: ext.toUpperCase() };
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  return `${Math.floor(days / 30)}m`;
}

// ---------- Vencedores export helpers ----------

type TimeFilter = "all" | "today" | "week" | "month";

interface ProjectWinnerResult {
  project: Project;
  items: WinnerResult[];
}

function isInPeriod(dateStr: string, filter: TimeFilter): boolean {
  if (filter === "all") return true;
  const date = new Date(dateStr);
  const now = new Date();
  if (filter === "today") return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
  if (filter === "week") return date >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (filter === "month") return date >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  return true;
}

function downloadSingleItem(result: WinnerResult, projectName: string) {
  if (result.winners.length === 0) return;
  const win = result.winners[0];
  // If the winner has a file, open it directly
  if (win.option.file_url) {
    window.open(win.option.file_url, "_blank");
    return;
  }
  // Otherwise generate a text file with the item content
  const pct = result.totalVotes > 0 ? Math.round((win.voteCount / result.totalVotes) * 100) : 0;
  let txt = `${result.item.title}\n`;
  txt += `Projeto: ${projectName}\n`;
  txt += `${"─".repeat(40)}\n\n`;
  txt += `Vencedor: ${win.option.label}\n`;
  if (win.option.description) txt += `\n${win.option.description}\n`;
  txt += `\nVotos: ${win.voteCount} de ${result.totalVotes} (${pct}%)\n`;
  const slug = result.item.title.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 40);
  downloadFile(txt, `${slug}.txt`, "text/plain;charset=utf-8");
}

function generateTxtContent(results: ProjectWinnerResult[]): string {
  let txt = "═══════════════════════════════════════════\n";
  txt += "        RELATÓRIO DE VENCEDORES\n";
  txt += "═══════════════════════════════════════════\n";
  txt += `Data: ${new Date().toLocaleDateString("pt-BR")} ${new Date().toLocaleTimeString("pt-BR")}\n\n`;
  for (const w of results) {
    txt += "───────────────────────────────────────────\n";
    txt += `PROJETO: ${w.project.name}\n`;
    txt += `Finalizado em: ${new Date(w.project.updated_at).toLocaleDateString("pt-BR")}\n`;
    if (w.project.description) txt += `Descrição: ${w.project.description}\n`;
    txt += "───────────────────────────────────────────\n\n";
    for (const result of w.items) {
      txt += `  ${result.item.title}\n`;
      if (result.winners.length > 0) {
        for (const win of result.winners) {
          txt += `     Vencedor: ${win.option.label}\n`;
          if (win.option.description) txt += `     Detalhe: ${win.option.description}\n`;
          txt += `     Votos: ${win.voteCount} de ${result.totalVotes}\n`;
          const pct = result.totalVotes > 0 ? Math.round((win.voteCount / result.totalVotes) * 100) : 0;
          txt += `     Percentual: ${pct}%\n`;
        }
      } else {
        txt += `     Sem votos registrados\n`;
      }
      txt += "\n";
    }
  }
  txt += "═══════════════════════════════════════════\n";
  txt += "Gerado automaticamente pelo sistema de Votação\n";
  return txt;
}

function generateHtmlDoc(results: ProjectWinnerResult[]): string {
  let html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Relatório de Vencedores</title>
<style>body{font-family:'Segoe UI',Tahoma,sans-serif;max-width:800px;margin:0 auto;padding:40px;color:#1a1a2e}
h1{color:#003b8f;border-bottom:3px solid #f6921e;padding-bottom:12px}.date{color:#666;font-size:14px;margin-bottom:32px}
.project{margin-bottom:40px;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden}
.project-header{background:linear-gradient(135deg,#003b8f,#0090d0);color:#fff;padding:20px 24px}
.project-header h2{margin:0 0 4px;font-size:20px}.project-header .meta{font-size:13px;opacity:0.8}
.items{padding:20px 24px}.item{padding:16px;margin-bottom:12px;border-radius:10px;background:#f8fafc;border-left:4px solid #f6921e}
.item-title{font-weight:700;font-size:15px;color:#003b8f;margin-bottom:8px}
.winner-label{font-size:18px;font-weight:700;color:#1a1a2e}.winner-desc{font-size:13px;color:#666;margin-top:4px}
.votes{display:inline-block;background:#00c64c;color:#fff;padding:3px 12px;border-radius:99px;font-size:12px;font-weight:700;margin-top:8px}
.no-votes{color:#999;font-style:italic}.footer{text-align:center;margin-top:40px;padding-top:20px;border-top:1px solid #e2e8f0;color:#999;font-size:12px}
</style></head><body><h1>Relatório de Vencedores</h1>
<p class="date">Gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}</p>`;
  for (const w of results) {
    html += `<div class="project"><div class="project-header"><h2>${w.project.name}</h2>
<div class="meta">Finalizado em ${new Date(w.project.updated_at).toLocaleDateString("pt-BR")}</div></div><div class="items">`;
    for (const result of w.items) {
      html += `<div class="item"><div class="item-title">${result.item.title}</div>`;
      if (result.winners.length > 0) {
        for (const win of result.winners) {
          const pct = result.totalVotes > 0 ? Math.round((win.voteCount / result.totalVotes) * 100) : 0;
          html += `<div class="winner-label">${win.option.label}</div>`;
          if (win.option.description) html += `<div class="winner-desc">${win.option.description}</div>`;
          html += `<div class="votes">${win.voteCount} de ${result.totalVotes} votos (${pct}%)</div>`;
        }
      } else {
        html += `<div class="no-votes">Sem votos registrados</div>`;
      }
      html += `</div>`;
    }
    html += `</div></div>`;
  }
  html += `<div class="footer">Votação — Centro de Aprovação de Projetos</div></body></html>`;
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

export default function AcervoPageWrapper() {
  return (
    <Suspense fallback={null}>
      <AcervoPage />
    </Suspense>
  );
}

function AcervoPage() {
  const { user, loading: authLoading, supabase } = useAuth();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as AcervoTab) || "todos";

  // Acervo state
  const [items, setItems] = useState<AcervoItem[]>([]);
  const [options, setOptions] = useState<AcervoOption[]>([]);
  const [likes, setLikes] = useState<AcervoLike[]>([]);
  const [votes, setVotes] = useState<AcervoVote[]>([]);
  const [loading, setLoading] = useState(true);

  // Vencedores state
  const [winners, setWinners] = useState<ProjectWinnerResult[]>([]);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [loadingWinners, setLoadingWinners] = useState(true);

  // Filters
  const [activeTab, setActiveTab] = useState<AcervoTab>(initialTab);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  // Vencedores filters
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [winDateFrom, setWinDateFrom] = useState("");
  const [winDateTo, setWinDateTo] = useState("");

  const userEmail = user?.email || "";
  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "";
  const userAvatar = user?.user_metadata?.avatar_url || null;

  const loadAcervoData = useCallback(async () => {
    if (!supabase) return;
    try {
      const allItems = await getAcervoItems(supabase);
      setItems(allItems);
      const ids = allItems.map((i) => i.id);
      const [opts, lks, vts] = await Promise.all([
        getAcervoOptions(supabase, ids),
        getAcervoLikes(supabase, ids),
        getAcervoVotes(supabase, ids),
      ]);
      setOptions(opts);
      setLikes(lks);
      setVotes(vts);
    } catch (e) {
      console.error("Failed to load acervo:", e);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const loadWinnersData = useCallback(async () => {
    if (!supabase) return;
    try {
      const [finalized, all] = await Promise.all([
        getFinalizedProjects(supabase),
        getProjects(supabase),
      ]);
      setAllProjects(all);
      const results: ProjectWinnerResult[] = [];
      for (const project of finalized) {
        const winItems = (project.required_winners || 1) > 1
          ? await getProjectTopWinners(supabase, project.id)
          : await getWinningOptions(supabase, project.id);
        results.push({ project, items: winItems });
      }
      setWinners(results);
    } catch (e) {
      console.error("Failed to load winners:", e);
    } finally {
      setLoadingWinners(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (user && supabase) {
      loadAcervoData();
      loadWinnersData();
    }
  }, [user, supabase, loadAcervoData, loadWinnersData]);

  // Filtered acervo items
  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (activeTab === "aprovados" && item.status === "voting") return false;
      if (activeTab === "desempate" && item.status !== "voting") return false;
      if (activeTab === "aprovados" && item.mode === "votacao" && item.status !== "resolved") return false;
      if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (typeFilter !== "all") {
        const itemOpts = options.filter((o) => o.item_id === item.id);
        if (itemOpts.length === 0) return false;
        const hasType = itemOpts.some((o) => getFileCategory(o.file_type) === typeFilter);
        if (!hasType) return false;
      }
      if (dateFrom) {
        const itemDate = item.created_at.slice(0, 10);
        if (itemDate < dateFrom) return false;
      }
      if (dateTo) {
        const itemDate = item.created_at.slice(0, 10);
        if (itemDate > dateTo) return false;
      }
      return true;
    });
  }, [items, options, activeTab, typeFilter, searchQuery, dateFrom, dateTo]);

  // Filtered winners
  const filteredWinners = useMemo(() => {
    return winners.filter((w) => {
      if (!isInPeriod(w.project.updated_at, timeFilter)) return false;
      if (projectFilter !== "all" && w.project.id !== projectFilter) return false;
      if (winDateFrom) {
        const d = w.project.updated_at.slice(0, 10);
        if (d < winDateFrom) return false;
      }
      if (winDateTo) {
        const d = w.project.updated_at.slice(0, 10);
        if (d > winDateTo) return false;
      }
      return true;
    });
  }, [winners, timeFilter, projectFilter, winDateFrom, winDateTo]);

  // Handlers
  const handleLike = async (itemId: string) => {
    if (!supabase) return;
    const liked = await toggleAcervoLike(supabase, itemId, userEmail, userName);
    if (liked) {
      setLikes((prev) => [...prev, { id: crypto.randomUUID(), item_id: itemId, user_email: userEmail, user_name: userName, created_at: new Date().toISOString() }]);
    } else {
      setLikes((prev) => prev.filter((l) => !(l.item_id === itemId && l.user_email === userEmail)));
    }
  };

  const handleVote = async (itemId: string, optionId: string) => {
    if (!supabase) return;
    await submitAcervoVote(supabase, itemId, optionId, userEmail, userName, userAvatar);
    setVotes((prev) => {
      const without = prev.filter((v) => !(v.item_id === itemId && v.voter_email === userEmail));
      return [...without, { id: crypto.randomUUID(), item_id: itemId, option_id: optionId, voter_email: userEmail, voter_name: userName, voter_avatar: userAvatar, created_at: new Date().toISOString() }];
    });
  };

  const handleResolve = async (itemId: string) => {
    if (!supabase) return;
    const itemVotes = votes.filter((v) => v.item_id === itemId);
    const itemOpts = options.filter((o) => o.item_id === itemId);
    const counts = itemOpts.map((o) => ({ option: o, count: itemVotes.filter((v) => v.option_id === o.id).length }));
    counts.sort((a, b) => b.count - a.count);
    if (counts.length === 0 || counts[0].count === 0) return;
    const winnerId = counts[0].option.id;
    await resolveAcervoItem(supabase, itemId, winnerId);
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, status: "resolved" as const, winner_option_id: winnerId } : i)));
  };

  const handleExportTxt = useCallback(() => {
    const content = generateTxtContent(filteredWinners);
    downloadFile(content, `vencedores_${new Date().toISOString().slice(0, 10)}.txt`, "text/plain;charset=utf-8");
  }, [filteredWinners]);

  const handleExportDoc = useCallback(() => {
    const content = generateHtmlDoc(filteredWinners);
    downloadFile(content, `vencedores_${new Date().toISOString().slice(0, 10)}.doc`, "application/msword");
  }, [filteredWinners]);

  const handleExportPdf = useCallback(() => {
    const content = generateHtmlDoc(filteredWinners);
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(content);
      printWindow.document.close();
      setTimeout(() => printWindow.print(), 500);
    }
  }, [filteredWinners]);

  if (authLoading) return null;
  if (!user) return <LoginScreen />;

  const tabs: { key: AcervoTab; label: string; count?: number }[] = [
    { key: "todos", label: "Todos", count: items.length },
    { key: "aprovados", label: "Aprovados", count: items.filter((i) => i.status === "resolved" || (i.mode === "registro" && i.status === "active")).length },
    { key: "desempate", label: "Em Desempate", count: items.filter((i) => i.status === "voting").length },
    { key: "vencedores", label: "Vencedores", count: winners.length },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <Header />

      {/* Hero */}
      <div
        style={{
          background: "linear-gradient(135deg, #002a68 0%, #0090d0 50%, #3ca9c9 100%)",
          padding: "48px 24px 40px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
        <div style={{ position: "absolute", bottom: -40, left: "20%", width: 140, height: 140, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />
        <div className="max-w-[1440px] mx-auto" style={{ position: "relative", zIndex: 1 }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}>
              <Archive size={14} color="#fff" />
              <span className="text-xs font-semibold text-white tracking-wide uppercase">Acervo</span>
            </div>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Portfólio de Projetos</h2>
          <p className="text-sm text-white/70 max-w-xl">
            Visualize projetos aprovados, acompanhe desempates e consulte os vencedores com exportação de relatórios.
          </p>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6">
        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-2xl mb-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", display: "inline-flex" }}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              style={{
                background: activeTab === tab.key ? "var(--fips-cyan)" : "transparent",
                color: activeTab === tab.key ? "#fff" : "var(--foreground-muted)",
                border: "none",
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 99,
                  background: activeTab === tab.key ? "rgba(255,255,255,0.25)" : "var(--bg)",
                  color: activeTab === tab.key ? "#fff" : "var(--foreground-subtle)",
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ======== ACERVO TABS (Todos, Aprovados, Desempate) ======== */}
        {activeTab !== "vencedores" && (
          <>
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                {([["all", "Todos"], ["image", "Imagens"], ["document", "Docs"], ["presentation", "PPTs"], ["spreadsheet", "Planilhas"]] as [TypeFilter, string][]).map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setTypeFilter(val)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                    style={{
                      background: typeFilter === val ? "var(--primary)" : "transparent",
                      color: typeFilter === val ? "#fff" : "var(--foreground-muted)",
                      border: "none",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl flex-1 min-w-[180px]" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                <Search size={14} style={{ color: "var(--foreground-subtle)" }} />
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none text-xs flex-1"
                  style={{ color: "var(--foreground)" }}
                />
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                <Calendar size={14} style={{ color: "var(--foreground-subtle)", flexShrink: 0 }} />
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="bg-transparent border-none outline-none text-xs cursor-pointer"
                  style={{ color: dateFrom ? "var(--foreground)" : "var(--foreground-subtle)", maxWidth: 120 }}
                  title="Data inicial"
                />
                <span style={{ fontSize: 11, color: "var(--foreground-subtle)" }}>até</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="bg-transparent border-none outline-none text-xs cursor-pointer"
                  style={{ color: dateTo ? "var(--foreground)" : "var(--foreground-subtle)", maxWidth: 120 }}
                  title="Data final"
                />
                {(dateFrom || dateTo) && (
                  <button onClick={() => { setDateFrom(""); setDateTo(""); }} className="cursor-pointer" style={{ background: "none", border: "none", padding: 0, color: "var(--foreground-muted)", fontSize: 14, lineHeight: 1 }}>
                    ×
                  </button>
                )}
              </div>
            </div>

            {/* Grid */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={24} className="animate-spin" style={{ color: "var(--fips-cyan)" }} />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20">
                <Archive size={48} style={{ color: "var(--foreground-subtle)", margin: "0 auto 12px" }} />
                <p className="text-sm font-medium" style={{ color: "var(--foreground-muted)" }}>
                  {activeTab === "desempate" ? "Nenhum item em desempate" : "Nenhum item no acervo"}
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--foreground-subtle)" }}>
                  {activeTab === "desempate"
                    ? "Itens com empate aparecerão aqui para desempate"
                    : "Projetos aprovados aparecerão aqui automaticamente"}
                </p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
                {filtered.map((item) => {
                  const itemOpts = options.filter((o) => o.item_id === item.id);
                  const itemLikes = likes.filter((l) => l.item_id === item.id);
                  const itemVotes = votes.filter((v) => v.item_id === item.id);
                  const userLiked = itemLikes.some((l) => l.user_email === userEmail);
                  const userVote = itemVotes.find((v) => v.voter_email === userEmail);
                  const isOwner = item.uploaded_by_email === userEmail;
                  const isExpanded = expandedItem === item.id;

                  return (
                    <div
                      key={item.id}
                      className="rounded-2xl overflow-hidden transition-all"
                      style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card)" }}
                    >
                      {/* File preview */}
                      {item.mode === "registro" && itemOpts[0] ? (
                        isImageFile(itemOpts[0].file_type) && itemOpts[0].file_url ? (
                          <Link href={`/acervo/${item.id}`} style={{ display: "block", textDecoration: "none" }}>
                            <div style={{ height: 200, overflow: "hidden", position: "relative" }}>
                              <img src={itemOpts[0].file_url} alt={item.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              <div style={{ position: "absolute", top: 10, left: 10 }}>
                                <span className="px-2 py-1 rounded-md text-[10px] font-bold uppercase" style={{ background: "rgba(0,144,208,0.9)", color: "#fff" }}>Registro</span>
                              </div>
                            </div>
                          </Link>
                        ) : itemOpts[0].content_text ? (
                          <Link href={`/acervo/${item.id}`} style={{ display: "block", textDecoration: "none" }}>
                            <div style={{ height: 140, padding: 16, overflow: "hidden", position: "relative", background: "rgba(107,114,128,0.05)" }}>
                              <p style={{ fontSize: 12, lineHeight: 1.6, color: "var(--foreground-muted)", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 5, WebkitBoxOrient: "vertical" as const }}>
                                {itemOpts[0].content_text}
                              </p>
                              <div style={{ position: "absolute", top: 10, left: 10 }}>
                                <span className="px-2 py-1 rounded-md text-[10px] font-bold uppercase" style={{ background: "rgba(0,144,208,0.9)", color: "#fff" }}>Registro</span>
                              </div>
                            </div>
                          </Link>
                        ) : (
                          <Link href={`/acervo/${item.id}`} style={{ display: "block", textDecoration: "none" }}>
                            <div className="flex items-center justify-center" style={{ height: 140, background: getFileIcon(itemOpts[0].file_type).bg, position: "relative" }}>
                              {(() => { const fi = getFileIcon(itemOpts[0].file_type); const Icon = fi.icon; return <Icon size={48} color={fi.color} />; })()}
                              <div style={{ position: "absolute", top: 10, left: 10 }}>
                                <span className="px-2 py-1 rounded-md text-[10px] font-bold uppercase" style={{ background: "rgba(0,144,208,0.9)", color: "#fff" }}>Registro</span>
                              </div>
                              <div style={{ position: "absolute", top: 10, right: 10 }}>
                                <span className="px-2 py-1 rounded-md text-[10px] font-bold" style={{ background: getFileIcon(itemOpts[0].file_type).bg, color: getFileIcon(itemOpts[0].file_type).color }}>
                                  {getFileIcon(itemOpts[0].file_type).label}
                                </span>
                              </div>
                            </div>
                          </Link>
                        )
                      ) : item.mode === "votacao" ? (
                        <Link href={`/acervo/${item.id}`} style={{ display: "block", textDecoration: "none" }}>
                          <div style={{ position: "relative" }}>
                            <div className="grid gap-1 p-2" style={{ gridTemplateColumns: `repeat(${Math.min(itemOpts.length, 3)}, 1fr)`, height: 140, overflow: "hidden" }}>
                              {itemOpts.slice(0, 3).map((opt) => (
                                <div key={opt.id} className="rounded-lg overflow-hidden" style={{ background: opt.content_text ? "rgba(107,114,128,0.05)" : isImageFile(opt.file_type) ? undefined : getFileIcon(opt.file_type).bg }}>
                                  {opt.content_text ? (
                                    <div style={{ padding: 8, fontSize: 10, lineHeight: 1.4, color: "var(--foreground-muted)", overflow: "hidden", height: "100%" }}>
                                      <div style={{ fontWeight: 700, fontSize: 10, marginBottom: 4, color: "var(--foreground)" }}>{opt.label}</div>
                                      {opt.content_text.slice(0, 100)}...
                                    </div>
                                  ) : isImageFile(opt.file_type) && opt.file_url ? (
                                    <img src={opt.file_url} alt={opt.label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                  ) : (
                                    <div className="flex items-center justify-center h-full">
                                      {(() => { const fi = getFileIcon(opt.file_type); const Icon = fi.icon; return <Icon size={24} color={fi.color} />; })()}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                            <div style={{ position: "absolute", top: 10, left: 10 }}>
                              <span className="px-2 py-1 rounded-md text-[10px] font-bold uppercase" style={{ background: item.status === "resolved" ? "rgba(0,198,76,0.9)" : "rgba(246,146,30,0.9)", color: "#fff" }}>
                                {item.status === "resolved" ? "Decidido" : "Votação"}
                              </span>
                            </div>
                          </div>
                        </Link>
                      ) : null}

                      {/* Content */}
                      <div className="p-4">
                        <Link href={`/acervo/${item.id}`} style={{ textDecoration: "none" }}>
                          <h3 className="text-sm font-bold mb-1" style={{ color: "var(--foreground)", cursor: "pointer" }}>{item.title}</h3>
                        </Link>
                        {item.description && (
                          <p className="text-xs mb-2" style={{ color: "var(--foreground-muted)", lineHeight: 1.5 }}>{item.description}</p>
                        )}
                        <p className="text-[11px] mb-3" style={{ color: "var(--foreground-subtle)" }}>
                          por {item.uploaded_by_name} — {timeAgo(item.created_at)}
                        </p>

                        {item.mode === "registro" && itemOpts[0] && (
                          <div className="flex items-center justify-between">
                            <button
                              onClick={() => handleLike(item.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                              style={{
                                background: userLiked ? "rgba(239,68,68,0.1)" : "var(--bg)",
                                color: userLiked ? "#ef4444" : "var(--foreground-muted)",
                                border: `1px solid ${userLiked ? "rgba(239,68,68,0.3)" : "var(--border)"}`,
                              }}
                            >
                              <Heart size={14} fill={userLiked ? "#ef4444" : "none"} />
                              {itemLikes.length}
                            </button>
                            {itemOpts[0].file_url ? (
                              <a href={itemOpts[0].file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs font-semibold" style={{ color: "var(--fips-blue)", textDecoration: "none" }}>
                                Ver arquivo <ExternalLink size={12} />
                              </a>
                            ) : (
                              <Link href={`/acervo/${item.id}`} className="flex items-center gap-1 text-xs font-semibold" style={{ color: "var(--fips-blue)", textDecoration: "none" }}>
                                Ver conteúdo <ExternalLink size={12} />
                              </Link>
                            )}
                          </div>
                        )}

                        {item.mode === "votacao" && (
                          <div>
                            <button
                              onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                              className="text-xs font-semibold mb-2 cursor-pointer"
                              style={{ color: "var(--fips-blue)", background: "none", border: "none", padding: 0 }}
                            >
                              {isExpanded ? "Recolher opções" : `Ver ${itemOpts.length} opções`}
                            </button>

                            {isExpanded && (
                              <div className="flex flex-col gap-2 mt-2">
                                {itemOpts.map((opt) => {
                                  const optVotes = itemVotes.filter((v) => v.option_id === opt.id);
                                  const isWinner = item.winner_option_id === opt.id;
                                  const isSelected = userVote?.option_id === opt.id;
                                  return (
                                    <div key={opt.id} className="flex items-center gap-3 p-2 rounded-xl transition-all" style={{ background: isWinner ? "rgba(0,198,76,0.08)" : "var(--bg)", border: `1.5px solid ${isWinner ? "rgba(0,198,76,0.3)" : isSelected ? "var(--fips-cyan)" : "var(--border)"}` }}>
                                      <div className="rounded-lg overflow-hidden flex-shrink-0" style={{ width: 44, height: 44 }}>
                                        {opt.content_text ? (
                                          <div className="flex items-center justify-center w-full h-full" style={{ background: "rgba(107,114,128,0.08)" }}>
                                            <FileText size={18} color="#6b7280" />
                                          </div>
                                        ) : isImageFile(opt.file_type) && opt.file_url ? (
                                          <img src={opt.file_url} alt="" style={{ width: 44, height: 44, objectFit: "cover" }} />
                                        ) : (
                                          <div className="flex items-center justify-center w-full h-full" style={{ background: getFileIcon(opt.file_type).bg }}>
                                            {(() => { const fi = getFileIcon(opt.file_type); const Icon = fi.icon; return <Icon size={18} color={fi.color} />; })()}
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1">
                                          {isWinner && <Trophy size={12} color="#f6921e" />}
                                          <span className="text-xs font-semibold truncate" style={{ color: "var(--foreground)" }}>{opt.label}</span>
                                        </div>
                                        <span className="text-[11px]" style={{ color: "var(--foreground-subtle)" }}>{optVotes.length} voto{optVotes.length !== 1 ? "s" : ""}</span>
                                      </div>
                                      <div className="flex items-center gap-2 flex-shrink-0">
                                        {opt.file_url ? (
                                          <a href={opt.file_url} target="_blank" rel="noopener noreferrer" title="Ver arquivo">
                                            <ExternalLink size={14} style={{ color: "var(--fips-blue)" }} />
                                          </a>
                                        ) : opt.content_text ? (
                                          <Link href={`/acervo/${item.id}`} title="Ver conteúdo">
                                            <ExternalLink size={14} style={{ color: "var(--fips-blue)" }} />
                                          </Link>
                                        ) : null}
                                        {item.status === "voting" && (
                                          <button
                                            onClick={() => handleVote(item.id, opt.id)}
                                            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer transition-all"
                                            style={{ background: isSelected ? "var(--fips-cyan)" : "var(--bg-card)", color: isSelected ? "#fff" : "var(--foreground-muted)", border: `1px solid ${isSelected ? "var(--fips-cyan)" : "var(--border)"}` }}
                                          >
                                            {isSelected ? <Check size={12} /> : <Vote size={12} />}
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {item.status === "voting" && isOwner && itemVotes.length > 0 && (
                              <button
                                onClick={() => handleResolve(item.id)}
                                className="mt-3 w-full py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all"
                                style={{ background: "rgba(0,198,76,0.1)", color: "var(--success)", border: "1px solid rgba(0,198,76,0.3)" }}
                              >
                                <Trophy size={12} style={{ display: "inline", marginRight: 4 }} />
                                Encerrar Votação
                              </button>
                            )}

                            {item.status === "resolved" && item.winner_option_id && (
                              <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "rgba(0,198,76,0.08)", border: "1px solid rgba(0,198,76,0.2)" }}>
                                <Trophy size={14} color="#f6921e" />
                                <span className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>
                                  Vencedor: {itemOpts.find((o) => o.id === item.winner_option_id)?.label || "—"}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ======== VENCEDORES TAB ======== */}
        {activeTab === "vencedores" && (
          <>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Calendar size={16} style={{ color: "var(--foreground-muted)" }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground-muted)" }}>Período:</span>
                </div>
                <div style={{ display: "flex", gap: 4, background: "var(--bg-card)", borderRadius: 12, padding: 4, border: "1px solid var(--border)" }}>
                  {(["all", "today", "week", "month"] as TimeFilter[]).map((t) => (
                    <button key={t} onClick={() => setTimeFilter(t)} style={{ padding: "6px 16px", borderRadius: 8, border: "none", background: timeFilter === t ? "var(--fips-blue)" : "transparent", color: timeFilter === t ? "#fff" : "var(--foreground-muted)", fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                      {{ all: "Todos", today: "Hoje", week: "Semana", month: "Mês" }[t]}
                    </button>
                  ))}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 8 }}>
                  <Filter size={16} style={{ color: "var(--foreground-muted)" }} />
                  <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-card)", color: "var(--foreground)", fontSize: 12, fontWeight: 600, fontFamily: "inherit", cursor: "pointer" }}>
                    <option value="all">Todos os projetos</option>
                    {allProjects.filter((p) => p.status === "finalized").map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", marginLeft: 8 }}>
                  <Calendar size={14} style={{ color: "var(--foreground-subtle)", flexShrink: 0 }} />
                  <input type="date" value={winDateFrom} onChange={(e) => setWinDateFrom(e.target.value)} title="Data inicial" style={{ border: "none", background: "transparent", color: "var(--foreground)", fontSize: 12, fontFamily: "inherit", outline: "none", cursor: "pointer", width: 120 }} />
                  <span style={{ fontSize: 11, color: "var(--foreground-subtle)" }}>até</span>
                  <input type="date" value={winDateTo} onChange={(e) => setWinDateTo(e.target.value)} title="Data final" style={{ border: "none", background: "transparent", color: "var(--foreground)", fontSize: 12, fontFamily: "inherit", outline: "none", cursor: "pointer", width: 120 }} />
                  {(winDateFrom || winDateTo) && (
                    <button onClick={() => { setWinDateFrom(""); setWinDateTo(""); }} style={{ background: "none", border: "none", color: "var(--foreground-subtle)", cursor: "pointer", fontSize: 14, padding: "0 2px", fontFamily: "inherit", lineHeight: 1 }} title="Limpar datas">×</button>
                  )}
                </div>
              </div>
              {filteredWinners.length > 0 && (
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={handleExportTxt} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg-card)", color: "var(--foreground)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                    <Download size={14} /> TXT
                  </button>
                  <button onClick={handleExportDoc} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg-card)", color: "var(--foreground)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                    <FileDown size={14} /> Word
                  </button>
                  <button onClick={handleExportPdf} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, border: "none", background: "var(--fips-blue)", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 2px 8px rgba(0,144,208,0.3)" }}>
                    <FileDown size={14} /> PDF
                  </button>
                </div>
              )}
            </div>

            {loadingWinners ? (
              <div style={{ textAlign: "center", padding: "80px 24px" }}>
                <Loader2 size={24} className="animate-spin" style={{ color: "var(--fips-cyan)", margin: "0 auto" }} />
              </div>
            ) : filteredWinners.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px 24px", background: "var(--bg-card)", borderRadius: 20, boxShadow: "var(--shadow-card)" }}>
                <Trophy size={48} color="var(--foreground-subtle)" style={{ marginBottom: 16 }} />
                <p style={{ fontWeight: 700, fontSize: 16, color: "var(--foreground)", marginBottom: 4 }}>Nenhum resultado encontrado</p>
                <p style={{ fontSize: 13, color: "var(--foreground-muted)", margin: 0 }}>Finalize a votação de um projeto para ver os vencedores aqui.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 24, paddingBottom: 48 }}>
                {filteredWinners.map((w) => (
                  <div key={w.project.id} style={{ background: "var(--bg-card)", borderRadius: 20, boxShadow: "var(--shadow-card)", overflow: "hidden" }}>
                    <div style={{ padding: "20px 24px", background: "linear-gradient(135deg, var(--surface-dark) 0%, var(--surface-dark-soft) 100%)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                          <Trophy size={20} color="#fdc24e" />
                          <h3 style={{ fontSize: 18, fontWeight: 700, color: "#fff", margin: 0 }}>{w.project.name}</h3>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                          <Clock size={12} style={{ color: "rgba(255,255,255,0.5)" }} />
                          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>Finalizado em {new Date(w.project.updated_at).toLocaleDateString("pt-BR")}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: "rgba(0,198,76,0.2)", color: "#8be5ad", marginLeft: 4 }}>
                            {w.items.length} {w.items.length === 1 ? "item" : "itens"}
                          </span>
                          {(w.project.required_winners || 1) > 1 && (
                            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: "rgba(246,146,30,0.2)", color: "#fbbf24", marginLeft: 4 }}>
                              Top {w.project.required_winners} vencedores
                            </span>
                          )}
                        </div>
                      </div>
                      <Link href={`/projeto/${w.project.id}`} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "8px 16px", borderRadius: 10, background: "rgba(255,255,255,0.1)", color: "#fff", fontSize: 12, fontWeight: 600, textDecoration: "none", border: "1px solid rgba(255,255,255,0.15)" }}>
                        Ver projeto <ChevronRight size={14} />
                      </Link>
                    </div>
                    <div style={{ padding: 24 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
                        {w.items.map((result, idx) => {
                          const hasWinner = result.winners.length > 0;
                          return (
                            <div key={result.item.id} style={{ border: hasWinner ? "2px solid rgba(0,198,76,0.2)" : "1px solid var(--border)", borderRadius: 16, padding: 20, position: "relative", overflow: "hidden", background: hasWinner ? "linear-gradient(135deg, rgba(0,198,76,0.04) 0%, rgba(246,146,30,0.04) 100%)" : "var(--bg-muted)" }}>
                              {hasWinner && (
                                <div style={{ position: "absolute", top: 12, right: 12, display: "flex", gap: 8, alignItems: "center" }}>
                                  <button
                                    onClick={() => downloadSingleItem(result, w.project.name)}
                                    title="Baixar conteúdo deste item"
                                    style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(0,144,208,0.1)", border: "1px solid rgba(0,144,208,0.2)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.15s" }}
                                  >
                                    <Download size={14} color="var(--fips-blue)" />
                                  </button>
                                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #fdc24e 0%, #f6921e 100%)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(246,146,30,0.3)" }}>
                                    <Trophy size={18} color="#fff" />
                                  </div>
                                </div>
                              )}
                              {result.tiebreakerRound && result.tiebreakerRound.status === "resolved" && (
                                <div style={{ position: "absolute", top: 12, right: hasWinner ? 56 : 12, padding: "4px 10px", borderRadius: 8, background: "rgba(168,85,247,0.1)", color: "#a855f7", fontSize: 10, fontWeight: 700 }}>
                                  Desempate {result.tiebreakerRound.round_number}a rodada
                                </div>
                              )}
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                                <div style={{ width: 28, height: 28, borderRadius: 8, background: hasWinner ? "rgba(0,198,76,0.1)" : "var(--bg-elevated)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: hasWinner ? "var(--success)" : "var(--foreground-subtle)" }}>
                                  {idx + 1}
                                </div>
                                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)", flex: 1, paddingRight: 40 }}>{result.item.title}</span>
                                {(w.project.required_winners || 1) > 1 && hasWinner && (
                                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: idx === 0 ? "linear-gradient(135deg, #fdc24e, #f6921e)" : "rgba(246,146,30,0.1)", color: idx === 0 ? "#fff" : "var(--primary)" }}>
                                    {idx + 1}º
                                  </span>
                                )}
                              </div>
                              {hasWinner ? (
                                <div>
                                  {result.winners.map((win, wIdx) => {
                                    const pct = result.totalVotes > 0 ? Math.round((win.voteCount / result.totalVotes) * 100) : 0;
                                    return (
                                      <div key={win.option.id} style={{ marginBottom: wIdx < result.winners.length - 1 ? 12 : 0 }}>
                                        {win.option.image_url && (
                                          <img src={win.option.image_url} alt={win.option.label} style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 10, marginBottom: 12, border: "1px solid var(--border)" }} />
                                        )}
                                        <p style={{ fontSize: 16, fontWeight: 800, color: "var(--foreground)", margin: "0 0 4px" }}>
                                          {result.winners.length > 1 && <span style={{ fontSize: 12, color: "var(--foreground-muted)", marginRight: 6 }}>#{wIdx + 1}</span>}
                                          {win.option.label}
                                        </p>
                                        {win.option.description && <p style={{ fontSize: 12, color: "var(--foreground-muted)", margin: "0 0 12px", lineHeight: 1.5 }}>{win.option.description}</p>}
                                        {win.option.file_url && (
                                          <a href={win.option.file_url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, background: "var(--primary-50)", color: "var(--primary)", fontSize: 12, fontWeight: 600, textDecoration: "none", marginBottom: 12 }}>
                                            <FileText size={14} /> Abrir arquivo
                                          </a>
                                        )}
                                        <div style={{ marginTop: 8 }}>
                                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--foreground-muted)" }}>Votos recebidos</span>
                                            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--success)" }}>{win.voteCount}/{result.totalVotes} ({pct}%)</span>
                                          </div>
                                          <div style={{ height: 6, borderRadius: 3, background: "var(--border)", overflow: "hidden" }}>
                                            <div style={{ height: "100%", width: `${pct}%`, borderRadius: 3, background: "linear-gradient(90deg, var(--success), #00e676)", transition: "width 0.5s ease" }} />
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "16px 0" }}>
                                  <Award size={20} color="var(--foreground-subtle)" />
                                  <p style={{ fontSize: 13, color: "var(--foreground-subtle)", margin: 0 }}>Sem votos registrados</p>
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
          </>
        )}
      </div>
    </div>
  );
}
