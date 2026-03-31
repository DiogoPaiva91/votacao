"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import LoginScreen from "@/components/LoginScreen";
import Header from "@/components/Header";
import {
  getAcervoItem,
  getAcervoOptionsByItem,
  getAcervoLikesByItem,
  getAcervoVotesByItem,
  toggleAcervoLike,
  submitAcervoVote,
  resolveAcervoItem,
  deleteAcervoItem,
  type AcervoItem,
  type AcervoOption,
  type AcervoLike,
  type AcervoVote,
} from "@/lib/supabase";
import {
  ChevronLeft,
  Heart,
  Trophy,
  Vote,
  Check,
  ExternalLink,
  Loader2,
  FileText,
  Presentation,
  Table,
  FileCode,
  Braces,
  Trash2,
  Archive,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────

const IMAGE_EXTS = ["jpg", "jpeg", "png", "gif", "webp", "svg"];
const PRES_EXTS = ["ppt", "pptx"];
const SHEET_EXTS = ["xls", "xlsx", "csv"];

function isImageFile(ft: string | null): boolean {
  if (!ft) return false;
  return IMAGE_EXTS.includes(ft.replace(".", "").toLowerCase());
}

function isPdfFile(ft: string | null): boolean {
  if (!ft) return false;
  return ft.replace(".", "").toLowerCase() === "pdf";
}

function getFileIcon(ft: string | null) {
  if (!ft) return { icon: FileText, color: "#6b7280", bg: "rgba(107,114,128,0.1)", label: "TXT" };
  const ext = ft.replace(".", "").toLowerCase();
  if (PRES_EXTS.includes(ext)) return { icon: Presentation, color: "#f6921e", bg: "rgba(246,146,30,0.1)", label: ext.toUpperCase() };
  if (ext === "pdf") return { icon: FileText, color: "#ef4444", bg: "rgba(239,68,68,0.1)", label: "PDF" };
  if (["doc", "docx"].includes(ext)) return { icon: FileText, color: "#3b82f6", bg: "rgba(59,130,246,0.1)", label: ext.toUpperCase() };
  if (["md", "txt"].includes(ext)) return { icon: FileCode, color: "#6b7280", bg: "rgba(107,114,128,0.1)", label: ext.toUpperCase() };
  if (SHEET_EXTS.includes(ext)) return { icon: Table, color: "#22c55e", bg: "rgba(34,197,94,0.1)", label: ext.toUpperCase() };
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
  if (days < 30) return `${days} dias`;
  return `${Math.floor(days / 30)} meses`;
}

// ─── Markdown Renderer ────────────────────────────────────

function MarkdownRenderer({ src, large }: { src: string; large?: boolean }) {
  const [md, setMd] = useState<string | null>(null);

  useEffect(() => {
    fetch(src)
      .then((r) => r.text())
      .then(setMd)
      .catch(() => setMd("Erro ao carregar arquivo .md"));
  }, [src]);

  if (md === null) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: "var(--foreground-muted)" }}>
        <Loader2 size={20} className="animate-spin" style={{ margin: "0 auto" }} />
      </div>
    );
  }

  return (
    <div
      className="markdown-content"
      style={{
        lineHeight: 1.8,
        fontSize: large ? 15 : 14,
        color: "var(--foreground)",
        padding: large ? "20px 0" : "12px 0",
      }}
    >
      <ReactMarkdown
        components={{
          h1: ({ children }) => <h1 style={{ fontSize: 24, fontWeight: 800, margin: "24px 0 12px", color: "var(--foreground)" }}>{children}</h1>,
          h2: ({ children }) => <h2 style={{ fontSize: 20, fontWeight: 700, margin: "20px 0 10px", color: "var(--foreground)" }}>{children}</h2>,
          h3: ({ children }) => <h3 style={{ fontSize: 17, fontWeight: 700, margin: "16px 0 8px", color: "var(--foreground)" }}>{children}</h3>,
          p: ({ children }) => <p style={{ margin: "8px 0", lineHeight: 1.8 }}>{children}</p>,
          ul: ({ children }) => <ul style={{ margin: "8px 0", paddingLeft: 24 }}>{children}</ul>,
          ol: ({ children }) => <ol style={{ margin: "8px 0", paddingLeft: 24 }}>{children}</ol>,
          li: ({ children }) => <li style={{ margin: "4px 0", lineHeight: 1.7 }}>{children}</li>,
          blockquote: ({ children }) => (
            <blockquote style={{ borderLeft: "3px solid var(--fips-cyan)", paddingLeft: 16, margin: "12px 0", color: "var(--foreground-muted)", fontStyle: "italic" }}>
              {children}
            </blockquote>
          ),
          code: ({ children, className }) => {
            const isBlock = className?.includes("language-");
            return isBlock ? (
              <pre style={{ background: "rgba(0,0,0,0.05)", padding: 16, borderRadius: 12, overflow: "auto", fontSize: 13, lineHeight: 1.6, margin: "12px 0" }}>
                <code>{children}</code>
              </pre>
            ) : (
              <code style={{ background: "rgba(0,0,0,0.06)", padding: "2px 6px", borderRadius: 4, fontSize: "0.9em" }}>{children}</code>
            );
          },
          strong: ({ children }) => <strong style={{ fontWeight: 700, color: "var(--foreground)" }}>{children}</strong>,
          hr: () => <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "20px 0" }} />,
          table: ({ children }) => (
            <div style={{ overflowX: "auto", margin: "12px 0" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>{children}</table>
            </div>
          ),
          th: ({ children }) => <th style={{ textAlign: "left", padding: "8px 12px", borderBottom: "2px solid var(--border)", fontWeight: 700 }}>{children}</th>,
          td: ({ children }) => <td style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)" }}>{children}</td>,
        }}
      >
        {md}
      </ReactMarkdown>
    </div>
  );
}

function isMdFile(ft: string | null): boolean {
  if (!ft) return false;
  return ft.replace(".", "").toLowerCase() === "md";
}

// ─── Content Renderer ─────────────────────────────────────

function ContentRenderer({ option, large }: { option: AcervoOption; large?: boolean }) {
  // Text content
  if (option.content_text) {
    return (
      <div
        style={{
          whiteSpace: "pre-wrap",
          lineHeight: 1.7,
          fontSize: large ? 15 : 14,
          color: "var(--foreground)",
          padding: large ? "20px 0" : "12px 0",
        }}
      >
        {option.content_text}
      </div>
    );
  }

  // Image file
  if (option.file_url && isImageFile(option.file_type)) {
    return (
      <div style={{ borderRadius: 16, overflow: "hidden", background: "var(--bg-subtle)" }}>
        <img
          src={option.file_url}
          alt={option.label}
          style={{
            width: "100%",
            maxHeight: large ? 600 : 300,
            objectFit: "contain",
            display: "block",
          }}
        />
      </div>
    );
  }

  // PDF file
  if (option.file_url && isPdfFile(option.file_type)) {
    return (
      <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid var(--border)" }}>
        <iframe
          src={option.file_url}
          style={{ width: "100%", height: large ? 700 : 400, border: "none" }}
          title={option.label}
        />
      </div>
    );
  }

  // Markdown file — render inline
  if (option.file_url && isMdFile(option.file_type)) {
    return <MarkdownRenderer src={option.file_url} large={large} />;
  }

  // Other file
  if (option.file_url) {
    const fi = getFileIcon(option.file_type);
    const Icon = fi.icon;
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: 20,
          borderRadius: 16,
          background: fi.bg,
          border: `1px solid ${fi.color}22`,
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: fi.bg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon size={28} color={fi.color} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: fi.color }}>{fi.label}</div>
          <div style={{ fontSize: 12, color: "var(--foreground-muted)", marginTop: 2 }}>{option.label}</div>
        </div>
        <a
          href={option.file_url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 16px",
            borderRadius: 10,
            background: fi.color,
            color: "#fff",
            fontSize: 12,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          <ExternalLink size={14} />
          Abrir
        </a>
      </div>
    );
  }

  return null;
}

// ─── Main Page ────────────────────────────────────────────

export default function AcervoDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { user, loading: authLoading, supabase } = useAuth();

  const [item, setItem] = useState<AcervoItem | null>(null);
  const [options, setOptions] = useState<AcervoOption[]>([]);
  const [itemLikes, setItemLikes] = useState<AcervoLike[]>([]);
  const [itemVotes, setItemVotes] = useState<AcervoVote[]>([]);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);

  const userEmail = user?.email || "";
  const isOwner = item?.uploaded_by_email === userEmail;

  const loadData = useCallback(async () => {
    if (!supabase || !id) return;
    try {
      const [i, opts, lks, vts] = await Promise.all([
        getAcervoItem(supabase, id),
        getAcervoOptionsByItem(supabase, id),
        getAcervoLikesByItem(supabase, id),
        getAcervoVotesByItem(supabase, id),
      ]);
      setItem(i);
      setOptions(opts);
      setItemLikes(lks);
      setItemVotes(vts);
    } catch (e) {
      console.error("Failed to load acervo item:", e);
    } finally {
      setLoading(false);
    }
  }, [supabase, id]);

  useEffect(() => {
    if (user && supabase) loadData();
  }, [user, supabase, loadData]);

  // ── Handlers ──

  const handleLike = async () => {
    if (!supabase || !user || !item) return;
    const userName = user.user_metadata?.full_name || user.email?.split("@")[0] || "";
    const liked = await toggleAcervoLike(supabase, item.id, userEmail, userName);
    if (liked) {
      setItemLikes((prev) => [...prev, { id: "temp", item_id: item.id, user_email: userEmail, user_name: userName, created_at: new Date().toISOString() }]);
    } else {
      setItemLikes((prev) => prev.filter((l) => l.user_email !== userEmail));
    }
  };

  const handleVote = async (optionId: string) => {
    if (!supabase || !user || !item || voting) return;
    setVoting(true);
    try {
      const userName = user.user_metadata?.full_name || user.email?.split("@")[0] || "";
      const avatar = user.user_metadata?.avatar_url || null;
      const vote = await submitAcervoVote(supabase, item.id, optionId, userEmail, userName, avatar);
      setItemVotes((prev) => {
        const filtered = prev.filter((v) => v.voter_email !== userEmail);
        return [...filtered, vote];
      });
    } finally {
      setVoting(false);
    }
  };

  const handleResolve = async () => {
    if (!supabase || !item) return;
    const voteCounts: Record<string, number> = {};
    for (const v of itemVotes) {
      voteCounts[v.option_id] = (voteCounts[v.option_id] || 0) + 1;
    }
    let winnerId = options[0]?.id;
    let maxVotes = 0;
    for (const [optId, count] of Object.entries(voteCounts)) {
      if (count > maxVotes) {
        maxVotes = count;
        winnerId = optId;
      }
    }
    if (winnerId) {
      await resolveAcervoItem(supabase, item.id, winnerId);
      setItem((prev) => prev ? { ...prev, status: "resolved", winner_option_id: winnerId } : prev);
    }
  };

  const handleDelete = async () => {
    if (!supabase || !item) return;
    await deleteAcervoItem(supabase, item.id);
    window.location.href = "/acervo";
  };

  // ── Render ──

  if (authLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <Loader2 size={32} style={{ animation: "spin 1s linear infinite", color: "var(--primary)" }} />
      </div>
    );
  }

  if (!user) return <LoginScreen />;

  if (loading) {
    return (
      <>
        <Header />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
          <Loader2 size={32} style={{ animation: "spin 1s linear infinite", color: "var(--primary)" }} />
        </div>
      </>
    );
  }

  if (!item) {
    return (
      <>
        <Header />
        <div style={{ maxWidth: 900, margin: "60px auto", textAlign: "center", padding: "0 20px" }}>
          <Archive size={48} style={{ color: "var(--foreground-subtle)", marginBottom: 16 }} />
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--foreground)" }}>Item nao encontrado</h2>
          <Link href="/acervo" style={{ color: "var(--fips-blue)", fontSize: 14, marginTop: 12, display: "inline-block" }}>
            Voltar ao Acervo
          </Link>
        </div>
      </>
    );
  }

  const userLiked = itemLikes.some((l) => l.user_email === userEmail);
  const userVote = itemVotes.find((v) => v.voter_email === userEmail);
  const winnerOption = options.find((o) => o.id === item.winner_option_id);

  return (
    <>
      <Header />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      {/* Hero */}
      <div
        style={{
          background: "linear-gradient(135deg, #002a68 0%, #0090d0 50%, #3ca9c9 100%)",
          padding: "32px 24px 40px",
        }}
      >
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <Link
            href="/acervo"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              color: "rgba(255,255,255,0.7)",
              fontSize: 13,
              textDecoration: "none",
              marginBottom: 20,
            }}
          >
            <ChevronLeft size={16} />
            Voltar ao Acervo
          </Link>

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <span
              style={{
                padding: "4px 14px",
                borderRadius: 9999,
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 1,
                background:
                  item.mode === "registro"
                    ? "rgba(0,144,208,0.2)"
                    : item.status === "resolved"
                    ? "rgba(0,198,76,0.2)"
                    : "rgba(246,146,30,0.2)",
                color: "#fff",
              }}
            >
              {item.mode === "registro" ? "Registro" : item.status === "resolved" ? "Decidido" : "Votacao"}
            </span>
          </div>

          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#fff", lineHeight: 1.3, marginBottom: 8 }}>
            {item.title}
          </h1>

          {item.description && (
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.8)", lineHeight: 1.5, marginBottom: 12 }}>
              {item.description}
            </p>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
            {item.uploaded_by_avatar && (
              <img
                src={item.uploaded_by_avatar}
                alt=""
                style={{ width: 24, height: 24, borderRadius: "50%" }}
                referrerPolicy="no-referrer"
              />
            )}
            <span>por {item.uploaded_by_name}</span>
            <span>—</span>
            <span>{timeAgo(item.created_at)}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px 80px" }}>
        {/* ── Resolved winner banner ── */}
        {item.status === "resolved" && winnerOption && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "20px 24px",
              borderRadius: 20,
              background: "rgba(0,198,76,0.08)",
              border: "2px solid rgba(0,198,76,0.2)",
              marginBottom: 32,
            }}
          >
            <Trophy size={28} color="#00c64c" />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#00c64c", textTransform: "uppercase", letterSpacing: 0.5 }}>
                Vencedor
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--foreground)", marginTop: 2 }}>
                {winnerOption.label}
              </div>
            </div>
          </div>
        )}

        {/* ── Registro mode ── */}
        {item.mode === "registro" && options.length > 0 && (
          <div>
            <div
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: 20,
                padding: 24,
                boxShadow: "var(--shadow-card)",
              }}
            >
              <ContentRenderer option={options[0]} large />
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 20 }}>
              <button
                onClick={handleLike}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 20px",
                  borderRadius: 14,
                  border: "1px solid",
                  borderColor: userLiked ? "rgba(239,68,68,0.3)" : "var(--border)",
                  background: userLiked ? "rgba(239,68,68,0.08)" : "var(--bg-card)",
                  color: userLiked ? "#ef4444" : "var(--foreground-muted)",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                <Heart size={18} fill={userLiked ? "#ef4444" : "none"} />
                {itemLikes.length} {itemLikes.length === 1 ? "like" : "likes"}
              </button>

              <div style={{ display: "flex", gap: 8 }}>
                {options[0].file_url && (
                  <a
                    href={options[0].file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "10px 20px",
                      borderRadius: 14,
                      background: "var(--fips-blue)",
                      color: "#fff",
                      textDecoration: "none",
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    <ExternalLink size={14} />
                    Ver arquivo
                  </a>
                )}
                {isOwner && (
                  <button
                    onClick={handleDelete}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "10px 16px",
                      borderRadius: 14,
                      border: "1px solid rgba(239,68,68,0.2)",
                      background: "rgba(239,68,68,0.06)",
                      color: "#ef4444",
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Votacao mode ── */}
        {item.mode === "votacao" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {options.map((opt) => {
              const voteCount = itemVotes.filter((v) => v.option_id === opt.id).length;
              const isVoted = userVote?.option_id === opt.id;
              const isWinner = item.winner_option_id === opt.id;
              const voters = itemVotes.filter((v) => v.option_id === opt.id);

              return (
                <div
                  key={opt.id}
                  style={{
                    background: "var(--bg-card)",
                    border: `2px solid ${isWinner ? "rgba(0,198,76,0.4)" : isVoted ? "rgba(246,146,30,0.3)" : "var(--border)"}`,
                    borderRadius: 20,
                    padding: 24,
                    boxShadow: "var(--shadow-card)",
                    position: "relative",
                  }}
                >
                  {isWinner && (
                    <div
                      style={{
                        position: "absolute",
                        top: -12,
                        right: 20,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "4px 14px",
                        borderRadius: 9999,
                        background: "#00c64c",
                        color: "#fff",
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      <Trophy size={12} />
                      VENCEDOR
                    </div>
                  )}

                  {/* Option label */}
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--foreground)", marginBottom: 12 }}>
                    {opt.label}
                  </h3>

                  {/* Content */}
                  <ContentRenderer option={opt} large />

                  {/* Footer: vote info + button */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginTop: 16,
                      paddingTop: 16,
                      borderTop: "1px solid var(--border-light)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: 14,
                          fontWeight: 700,
                          color: voteCount > 0 ? "var(--primary)" : "var(--foreground-muted)",
                        }}
                      >
                        <Vote size={16} />
                        {voteCount} {voteCount === 1 ? "voto" : "votos"}
                      </span>

                      {/* Voter avatars */}
                      {voters.length > 0 && (
                        <div style={{ display: "flex", marginLeft: 4 }}>
                          {voters.slice(0, 6).map((v, i) => (
                            <div
                              key={v.id}
                              title={v.voter_name}
                              style={{
                                width: 26,
                                height: 26,
                                borderRadius: "50%",
                                border: "2px solid var(--bg-card)",
                                marginLeft: i > 0 ? -8 : 0,
                                overflow: "hidden",
                                background: "linear-gradient(135deg, #f6921e, #e07310)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 9,
                                fontWeight: 700,
                                color: "#fff",
                              }}
                            >
                              {v.voter_avatar ? (
                                <img
                                  src={v.voter_avatar}
                                  alt=""
                                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                v.voter_name
                                  .split(" ")
                                  .map((w) => w[0])
                                  .join("")
                                  .slice(0, 2)
                                  .toUpperCase()
                              )}
                            </div>
                          ))}
                          {voters.length > 6 && (
                            <div
                              style={{
                                width: 26,
                                height: 26,
                                borderRadius: "50%",
                                border: "2px solid var(--bg-card)",
                                marginLeft: -8,
                                background: "var(--bg-subtle)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 9,
                                fontWeight: 700,
                                color: "var(--foreground-muted)",
                              }}
                            >
                              +{voters.length - 6}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div style={{ display: "flex", gap: 8 }}>
                      {opt.file_url && (
                        <a
                          href={opt.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "8px 16px",
                            borderRadius: 10,
                            border: "1px solid var(--border)",
                            background: "var(--bg-card)",
                            color: "var(--fips-blue)",
                            textDecoration: "none",
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          <ExternalLink size={12} />
                          Abrir
                        </a>
                      )}
                      {item.status === "voting" && (
                        <button
                          onClick={() => handleVote(opt.id)}
                          disabled={voting}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "8px 20px",
                            borderRadius: 10,
                            border: "none",
                            background: isVoted ? "var(--primary)" : "var(--fips-cyan)",
                            color: "#fff",
                            cursor: voting ? "wait" : "pointer",
                            fontSize: 13,
                            fontWeight: 700,
                            opacity: voting ? 0.6 : 1,
                          }}
                        >
                          {isVoted ? <Check size={14} /> : <Vote size={14} />}
                          {isVoted ? "Votado" : "Votar"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Resolve button (owner only) */}
            {isOwner && item.status === "voting" && itemVotes.length > 0 && (
              <button
                onClick={handleResolve}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "14px 24px",
                  borderRadius: 14,
                  border: "none",
                  background: "linear-gradient(135deg, #00c64c, #009e3d)",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 700,
                  boxShadow: "0 4px 16px -4px rgba(0,198,76,0.4)",
                }}
              >
                <Trophy size={16} />
                Encerrar Votacao e Definir Vencedor
              </button>
            )}

            {/* Delete button (owner only) */}
            {isOwner && (
              <button
                onClick={handleDelete}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "10px 20px",
                  borderRadius: 14,
                  border: "1px solid rgba(239,68,68,0.2)",
                  background: "rgba(239,68,68,0.06)",
                  color: "#ef4444",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                <Trash2 size={14} />
                Excluir item
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
