"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import LoginScreen from "@/components/LoginScreen";
import {
  getProject,
  getProjectMembers,
  getVotingItems,
  getVotingOptions,
  getProjectVotes,
  getProjectDocuments,
  submitVote,
  finalizeMemberVote,
  updateProjectStatus,
  addProjectMember,
  clearProjectVotes,
  type Project,
  type ProjectMember,
  type VotingItem,
  type VotingOption,
  type Vote,
  type Document,
} from "@/lib/supabase";
import {
  Check,
  Lock,
  Users,
  FileText,
  Image,
  ChevronLeft,
  ThumbsUp,
  CheckCircle2,
  Clock,
  Trophy,
  CircleDot,
  Loader2,
  AlertTriangle,
  Swords,
  Trash2,
} from "lucide-react";

// ─── Status Badge ───────────────────────────────────────────
function StatusBadge({ status }: { status: Project["status"] }) {
  const map: Record<string, { label: string; bg: string; color: string; border: string }> = {
    draft: { label: "Rascunho", bg: "rgba(255,255,255,0.15)", color: "#fff", border: "rgba(255,255,255,0.3)" },
    voting: { label: "Em Votação", bg: "rgba(246,146,30,0.25)", color: "#fbbf24", border: "rgba(246,146,30,0.5)" },
    finalized: { label: "Finalizado", bg: "rgba(0,198,76,0.25)", color: "#4ade80", border: "rgba(0,198,76,0.5)" },
    archived: { label: "Arquivado", bg: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", border: "rgba(255,255,255,0.2)" },
  };
  const s = map[status] ?? map.draft;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 16px",
        borderRadius: 9999,
        fontSize: 12,
        fontWeight: 700,
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
        backdropFilter: "blur(8px)",
      }}
    >
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: s.color, boxShadow: `0 0 6px ${s.color}` }} />
      {s.label}
    </span>
  );
}

// ─── Avatar ─────────────────────────────────────────────────
function Avatar({ src, name, size = 32 }: { src?: string | null; name: string; size?: number }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
          border: "2px solid #fff",
          boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
        }}
      />
    );
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "var(--gradient-cta)",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.38,
        fontWeight: 700,
        border: "2px solid #fff",
        boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
      }}
    >
      {initials}
    </div>
  );
}

// ─── Vote Count Badge ───────────────────────────────────────
function VoteCountBadge({ count }: { count: number }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 10px",
        borderRadius: 9999,
        fontSize: 11,
        fontWeight: 700,
        background: count > 0 ? "var(--primary-50)" : "var(--bg-muted)",
        color: count > 0 ? "var(--primary)" : "var(--foreground-subtle)",
      }}
    >
      <Users size={12} />
      {count}
    </span>
  );
}

// ─── Voter Avatars ─────────────────────────────────────────
function VoterAvatars({ voters }: { voters: Vote[] }) {
  if (!voters || voters.length === 0) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", marginTop: 6 }}>
      {voters.slice(0, 8).map((v, i) => (
        <div
          key={v.id}
          title={v.voter_name}
          style={{
            width: 22,
            height: 22,
            borderRadius: "50%",
            marginLeft: i > 0 ? -6 : 0,
            border: "2px solid #fff",
            overflow: "hidden",
            background: "var(--gradient-cta)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 9,
            fontWeight: 700,
            color: "#fff",
          }}
        >
          {v.voter_avatar ? (
            <img src={v.voter_avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            v.voter_name.charAt(0).toUpperCase()
          )}
        </div>
      ))}
      {voters.length > 8 && (
        <span style={{ fontSize: 10, fontWeight: 700, color: "var(--foreground-muted)", marginLeft: 4 }}>
          +{voters.length - 8}
        </span>
      )}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────
export default function ProjectVotingPage() {
  const params = useParams();
  const projectId = params.id as string;
  const { user, loading: authLoading, supabase } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [items, setItems] = useState<VotingItem[]>([]);
  const [options, setOptions] = useState<VotingOption[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"voting" | "documents">("voting");
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  const voterEmail = user?.email ?? "";
  const voterName = user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? "";
  const voterAvatar = user?.user_metadata?.avatar_url ?? null;

  // ── Fetch all data ──
  const fetchData = useCallback(async () => {
    if (!supabase || !projectId) return;
    setLoading(true);
    try {
      const [p, m, vi, vo, v, d] = await Promise.all([
        getProject(supabase, projectId),
        getProjectMembers(supabase, projectId),
        getVotingItems(supabase, projectId),
        getVotingOptions(supabase, projectId),
        getProjectVotes(supabase, projectId),
        getProjectDocuments(supabase, projectId),
      ]);
      setProject(p);
      setMembers(m);
      setItems(vi);
      setOptions(vo);
      setVotes(v);
      setDocuments(d);

      // Hydrate existing selections for this user
      const sel: Record<string, string> = {};
      v.filter((vote) => vote.voter_email === voterEmail).forEach((vote) => {
        sel[vote.item_id] = vote.option_id;
      });
      setSelections(sel);

      // Auto-add user as voter if not a member
      const isMember = m.some((mem) => mem.user_email === voterEmail);
      if (!isMember && voterEmail) {
        await addProjectMember(supabase, {
          project_id: projectId,
          user_email: voterEmail,
          user_name: voterName,
          user_avatar: voterAvatar,
          role: "voter",
        });
        const updatedMembers = await getProjectMembers(supabase, projectId);
        setMembers(updatedMembers);
      }
    } catch (err) {
      console.error("Failed to load project data:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase, projectId, voterEmail, voterName, voterAvatar]);

  useEffect(() => {
    if (user && supabase) fetchData();
  }, [user, supabase, fetchData]);

  // ── Derived state ──
  const currentMember = useMemo(
    () => members.find((m) => m.user_email === voterEmail),
    [members, voterEmail],
  );
  const hasFinalized = currentMember?.has_finalized ?? false;
  const isOwner = currentMember?.role === "owner";
  const allFinalized = useMemo(
    () => members.length > 0 && members.every((m) => m.has_finalized),
    [members],
  );
  const allItemsVoted = useMemo(
    () => items.length > 0 && items.every((item) => selections[item.id]),
    [items, selections],
  );

  const optionsByItem = useMemo(() => {
    const map: Record<string, VotingOption[]> = {};
    options.forEach((o) => {
      if (!map[o.item_id]) map[o.item_id] = [];
      map[o.item_id].push(o);
    });
    return map;
  }, [options]);

  const voteCountByOption = useMemo(() => {
    const map: Record<string, number> = {};
    votes.forEach((v) => {
      map[v.option_id] = (map[v.option_id] ?? 0) + 1;
    });
    return map;
  }, [votes]);

  const votersByOption = useMemo(() => {
    const map: Record<string, Vote[]> = {};
    votes.forEach((v) => {
      if (!map[v.option_id]) map[v.option_id] = [];
      map[v.option_id].push(v);
    });
    return map;
  }, [votes]);

  const [tiebreakerItems, setTiebreakerItems] = useState<Array<{ itemId: string; tiedOptionIds: string[] }>>([]);

  // ── Tiebreaker detection ──
  useEffect(() => {
    if (!allFinalized || !supabase || !projectId) return;
    const itemVoteMap: Record<string, Record<string, number>> = {};
    items.forEach(item => {
      const itemOpts = options.filter(o => o.item_id === item.id);
      const itemVotes = votes.filter(v => v.item_id === item.id);
      const counts: Record<string, number> = {};
      itemOpts.forEach(opt => {
        counts[opt.id] = itemVotes.filter(v => v.option_id === opt.id).length;
      });
      itemVoteMap[item.id] = counts;
    });

    const ties: Array<{ itemId: string; tiedOptionIds: string[] }> = [];
    items.forEach(item => {
      const counts = itemVoteMap[item.id];
      if (!counts) return;
      const maxCount = Math.max(...Object.values(counts), 0);
      if (maxCount === 0) return;
      const tiedIds = Object.entries(counts)
        .filter(([, c]) => c === maxCount)
        .map(([id]) => id);
      if (tiedIds.length > 1) {
        ties.push({ itemId: item.id, tiedOptionIds: tiedIds });
      }
    });
    setTiebreakerItems(ties);
  }, [allFinalized, items, options, votes, supabase, projectId]);

  // ── Handlers ──
  const handleSelect = useCallback(
    async (itemId: string, optionId: string) => {
      if (!supabase || hasFinalized) return;
      setSelections((prev) => ({ ...prev, [itemId]: optionId }));
      setSubmitting(true);
      try {
        await submitVote(supabase, {
          option_id: optionId,
          item_id: itemId,
          project_id: projectId,
          voter_email: voterEmail,
          voter_name: voterName,
          voter_avatar: voterAvatar,
        });
        const updatedVotes = await getProjectVotes(supabase, projectId);
        setVotes(updatedVotes);
      } catch (err) {
        console.error("Vote failed:", err);
      } finally {
        setSubmitting(false);
      }
    },
    [supabase, hasFinalized, projectId, voterEmail, voterName, voterAvatar],
  );

  const handleFinalize = useCallback(async () => {
    if (!supabase || hasFinalized) return;
    setFinalizing(true);
    try {
      await finalizeMemberVote(supabase, projectId, voterEmail);
      const updatedMembers = await getProjectMembers(supabase, projectId);
      setMembers(updatedMembers);
    } catch (err) {
      console.error("Finalize failed:", err);
    } finally {
      setFinalizing(false);
    }
  }, [supabase, hasFinalized, projectId, voterEmail]);

  const handleFinalizeProject = useCallback(async () => {
    if (!supabase) return;
    try {
      await updateProjectStatus(supabase, projectId, "finalized");
      setProject((prev) => (prev ? { ...prev, status: "finalized" } : prev));
    } catch (err) {
      console.error("Finalize project failed:", err);
    }
  }, [supabase, projectId]);

  const handleClearVotes = useCallback(async () => {
    if (!supabase) return;
    if (!confirm("Tem certeza que deseja limpar TODOS os votos deste projeto? Esta ação não pode ser desfeita.")) return;
    try {
      await clearProjectVotes(supabase, projectId);
      // Reload all data
      const [p, m, v] = await Promise.all([
        getProject(supabase, projectId),
        getProjectMembers(supabase, projectId),
        getProjectVotes(supabase, projectId),
      ]);
      setProject(p);
      setMembers(m);
      setVotes(v);
    } catch (err) {
      console.error("Clear votes failed:", err);
    }
  }, [supabase, projectId]);

  // ── Auth guard ──
  if (authLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
        <Loader2 size={32} style={{ animation: "spin 1s linear infinite", color: "var(--primary)" }} />
      </div>
    );
  }
  if (!user) return <LoginScreen />;

  if (loading || !project) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
        <Loader2 size={32} style={{ animation: "spin 1s linear infinite", color: "var(--primary)" }} />
      </div>
    );
  }

  // ── Render ──
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: "Manrope, sans-serif" }}>
      {/* ── Hero header ── */}
      <div
        style={{
          background: "var(--gradient-hero)",
          padding: "40px 0 56px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px" }}>
          <Link
            href="/projetos"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              color: "rgba(255,255,255,0.7)",
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
              marginBottom: 20,
            }}
          >
            <ChevronLeft size={16} /> Voltar
          </Link>

          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <div style={{ flex: 1, minWidth: 260 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <h1 style={{ fontSize: 28, fontWeight: 800, color: "#fff", margin: 0 }}>{project.name}</h1>
                <StatusBadge status={project.status} />
              </div>
              {project.description && (
                <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 14, lineHeight: 1.6, margin: 0, maxWidth: 600 }}>
                  {project.description}
                </p>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {/* Clear votes button - only for owner */}
              {isOwner && votes.length > 0 && (
                <button
                  onClick={handleClearVotes}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 16px",
                    borderRadius: 10,
                    border: "1px solid rgba(239,68,68,0.3)",
                    background: "rgba(239,68,68,0.1)",
                    color: "#ef4444",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    transition: "all 0.15s",
                  }}
                >
                  <Trash2 size={14} /> Limpar Votação
                </button>
              )}

            {/* Member avatars */}
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {members.slice(0, 8).map((m, i) => (
                <div key={m.id} style={{ marginLeft: i > 0 ? -8 : 0, position: "relative" }}>
                  <Avatar src={m.user_avatar} name={m.user_name} size={36} />
                  {m.has_finalized && (
                    <div
                      style={{
                        position: "absolute",
                        bottom: -2,
                        right: -2,
                        width: 14,
                        height: 14,
                        borderRadius: "50%",
                        background: "var(--success)",
                        border: "2px solid #fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Check size={8} color="#fff" strokeWidth={3} />
                    </div>
                  )}
                </div>
              ))}
              {members.length > 8 && (
                <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.7)", marginLeft: 4 }}>
                  +{members.length - 8}
                </span>
              )}
            </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px", marginTop: -20 }}>
        {/* All-finalized banner */}
        {allFinalized && project.status !== "finalized" && (
          <div
            style={{
              background: "linear-gradient(135deg, rgba(0,198,76,0.1) 0%, rgba(0,198,76,0.04) 100%)",
              border: "2px solid var(--success)",
              borderRadius: 16,
              padding: "20px 28px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 20,
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Trophy size={24} color="var(--success)" />
              <div>
                <p style={{ fontWeight: 700, fontSize: 15, color: "var(--foreground)", margin: 0 }}>
                  Todos votaram! Projeto pode ser finalizado.
                </p>
                <p style={{ fontSize: 12, color: "var(--foreground-muted)", margin: 0 }}>
                  Todos os {members.length} membros finalizaram seus votos.
                </p>
              </div>
            </div>
            <button
              onClick={handleFinalizeProject}
              style={{
                padding: "10px 28px",
                borderRadius: 12,
                border: "none",
                background: "var(--success)",
                color: "#fff",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(0,198,76,0.3)",
              }}
            >
              Finalizar Projeto
            </button>
          </div>
        )}

        {/* Already finalized banner */}
        {project.status === "finalized" && (
          <div
            style={{
              background: "linear-gradient(135deg, rgba(0,198,76,0.08) 0%, rgba(0,198,76,0.03) 100%)",
              border: "2px solid var(--success)",
              borderRadius: 16,
              padding: "16px 24px",
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 20,
            }}
          >
            <CheckCircle2 size={22} color="var(--success)" />
            <p style={{ fontWeight: 700, fontSize: 14, color: "var(--success)", margin: 0 }}>
              Projeto finalizado com sucesso!
            </p>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 24, alignItems: "flex-start" }}>
          {/* ── Left: Tabs + Voting items ── */}
          <div>
            {/* Tabs */}
            <div
              style={{
                display: "flex",
                gap: 4,
                background: "var(--bg-card)",
                borderRadius: 14,
                padding: 4,
                boxShadow: "var(--shadow-card)",
                marginBottom: 20,
              }}
            >
              {(
                [
                  { key: "voting" as const, label: "Votação", icon: <CircleDot size={16} /> },
                  { key: "documents" as const, label: "Documentos", icon: <FileText size={16} /> },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    padding: "10px 16px",
                    borderRadius: 10,
                    border: "none",
                    background: activeTab === tab.key ? "var(--primary)" : "transparent",
                    color: activeTab === tab.key ? "#fff" : "var(--foreground-muted)",
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                    transition: "all 0.15s",
                    fontFamily: "inherit",
                  }}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ── Documents Tab ── */}
            {activeTab === "documents" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {documents.length === 0 && (
                  <div
                    style={{
                      background: "var(--bg-card)",
                      borderRadius: 14,
                      padding: "48px 24px",
                      textAlign: "center",
                      boxShadow: "var(--shadow-card)",
                    }}
                  >
                    <FileText size={40} color="var(--foreground-subtle)" style={{ marginBottom: 12 }} />
                    <p style={{ fontWeight: 600, color: "var(--foreground-muted)", margin: 0 }}>
                      Nenhum documento anexado.
                    </p>
                  </div>
                )}
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    style={{
                      background: "var(--bg-card)",
                      borderRadius: 14,
                      padding: 24,
                      boxShadow: "var(--shadow-card)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          background: "var(--primary-50)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <FileText size={18} color="var(--primary)" />
                      </div>
                      <div>
                        <h3 style={{ fontWeight: 700, fontSize: 15, color: "var(--foreground)", margin: 0 }}>
                          {doc.title}
                        </h3>
                        <p style={{ fontSize: 11, color: "var(--foreground-subtle)", margin: 0 }}>
                          por {doc.uploaded_by_name}
                        </p>
                      </div>
                    </div>
                    {doc.content_md && (
                      <div
                        style={{
                          background: "var(--bg-muted)",
                          borderRadius: 10,
                          padding: 16,
                          fontSize: 13,
                          lineHeight: 1.7,
                          color: "var(--foreground)",
                          whiteSpace: "pre-wrap",
                          maxHeight: 400,
                          overflow: "auto",
                        }}
                      >
                        {doc.content_md}
                      </div>
                    )}
                    {doc.file_url && (
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          marginTop: 12,
                          padding: "6px 14px",
                          borderRadius: 8,
                          border: "1px solid var(--border)",
                          color: "var(--fips-blue)",
                          fontSize: 12,
                          fontWeight: 600,
                          textDecoration: "none",
                        }}
                      >
                        <FileText size={14} /> Abrir arquivo
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ── Voting Tab ── */}
            {activeTab === "voting" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {items.length === 0 && (
                  <div
                    style={{
                      background: "var(--bg-card)",
                      borderRadius: 14,
                      padding: "48px 24px",
                      textAlign: "center",
                      boxShadow: "var(--shadow-card)",
                    }}
                  >
                    <CircleDot size={40} color="var(--foreground-subtle)" style={{ marginBottom: 12 }} />
                    <p style={{ fontWeight: 600, color: "var(--foreground-muted)", margin: 0 }}>
                      Nenhum item de votação cadastrado.
                    </p>
                  </div>
                )}

                {items.map((item, idx) => {
                  const itemOptions = optionsByItem[item.id] ?? [];
                  const selected = selections[item.id];
                  const isVoted = !!selected;

                  return (
                    <div
                      key={item.id}
                      style={{
                        background: "var(--bg-card)",
                        borderRadius: 20,
                        padding: 24,
                        boxShadow: "var(--shadow-card)",
                        border: isVoted ? "2px solid var(--success)" : "2px solid transparent",
                        transition: "border-color 0.2s",
                      }}
                    >
                      {/* Item header */}
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 10,
                            background: isVoted ? "rgba(0,198,76,0.1)" : "var(--primary-50)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 800,
                            fontSize: 14,
                            color: isVoted ? "var(--success)" : "var(--primary)",
                          }}
                        >
                          {isVoted ? <Check size={16} /> : idx + 1}
                        </div>
                        <div style={{ flex: 1 }}>
                          <h3 style={{ fontWeight: 700, fontSize: 16, color: "var(--foreground)", margin: 0 }}>
                            {item.title}
                          </h3>
                          {item.description && (
                            <p style={{ fontSize: 12, color: "var(--foreground-muted)", margin: "2px 0 0" }}>
                              {item.description}
                            </p>
                          )}
                        </div>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: "var(--foreground-subtle)",
                            textTransform: "uppercase",
                            letterSpacing: 0.5,
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          {item.type === "image_select" && <><Image size={12} /> Imagem</>}
                          {item.type === "single_choice" && <><CircleDot size={12} /> Escolha</>}
                          {item.type === "approval" && <><ThumbsUp size={12} /> Aprovação</>}
                        </span>
                      </div>

                      {/* Options rendering by type */}
                      {item.type === "single_choice" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          {itemOptions.map((opt) => {
                            const isSelected = selected === opt.id;
                            const count = voteCountByOption[opt.id] ?? 0;
                            return (
                              <button
                                key={opt.id}
                                disabled={hasFinalized}
                                onClick={() => handleSelect(item.id, opt.id)}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 14,
                                  padding: "14px 18px",
                                  borderRadius: 14,
                                  border: isSelected
                                    ? "2px solid var(--primary)"
                                    : "2px solid var(--border)",
                                  background: isSelected ? "var(--primary-50)" : "var(--bg-card)",
                                  cursor: hasFinalized ? "default" : "pointer",
                                  textAlign: "left",
                                  transition: "all 0.15s",
                                  fontFamily: "inherit",
                                  opacity: hasFinalized ? 0.8 : 1,
                                }}
                              >
                                {/* Radio circle */}
                                <div
                                  style={{
                                    width: 22,
                                    height: 22,
                                    borderRadius: "50%",
                                    border: isSelected
                                      ? "2px solid var(--primary)"
                                      : "2px solid var(--border)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                    transition: "all 0.15s",
                                  }}
                                >
                                  {isSelected && (
                                    <div
                                      style={{
                                        width: 12,
                                        height: 12,
                                        borderRadius: "50%",
                                        background: "var(--primary)",
                                      }}
                                    />
                                  )}
                                </div>
                                <div style={{ flex: 1 }}>
                                  <p style={{ fontWeight: 600, fontSize: 14, color: "var(--foreground)", margin: 0 }}>
                                    {opt.label}
                                  </p>
                                  {opt.description && (
                                    <p style={{ fontSize: 12, color: "var(--foreground-muted)", margin: "2px 0 0" }}>
                                      {opt.description}
                                    </p>
                                  )}
                                </div>
                                <VoteCountBadge count={count} />
                                <VoterAvatars voters={votersByOption[opt.id] || []} />
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {item.type === "image_select" && (
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                            gap: 12,
                          }}
                        >
                          {itemOptions.map((opt) => {
                            const isSelected = selected === opt.id;
                            const count = voteCountByOption[opt.id] ?? 0;
                            return (
                              <button
                                key={opt.id}
                                disabled={hasFinalized}
                                onClick={() => handleSelect(item.id, opt.id)}
                                style={{
                                  position: "relative",
                                  borderRadius: 14,
                                  border: isSelected
                                    ? "2px solid var(--primary)"
                                    : "2px solid var(--border)",
                                  background: isSelected ? "var(--primary-50)" : "var(--bg-card)",
                                  cursor: hasFinalized ? "default" : "pointer",
                                  overflow: "hidden",
                                  textAlign: "left",
                                  padding: 0,
                                  transition: "all 0.15s",
                                  fontFamily: "inherit",
                                  opacity: hasFinalized ? 0.8 : 1,
                                }}
                              >
                                {opt.image_url && (
                                  <img
                                    src={opt.image_url}
                                    alt={opt.label}
                                    style={{
                                      width: "100%",
                                      height: 140,
                                      objectFit: "cover",
                                      display: "block",
                                    }}
                                  />
                                )}
                                <div style={{ padding: "10px 14px" }}>
                                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                    <p style={{ fontWeight: 600, fontSize: 13, color: "var(--foreground)", margin: 0 }}>
                                      {opt.label}
                                    </p>
                                    <VoteCountBadge count={count} />
                                  </div>
                                  <VoterAvatars voters={votersByOption[opt.id] || []} />
                                  {opt.description && (
                                    <p style={{ fontSize: 11, color: "var(--foreground-muted)", margin: "4px 0 0" }}>
                                      {opt.description}
                                    </p>
                                  )}
                                </div>
                                {/* Selected check overlay */}
                                {isSelected && (
                                  <div
                                    style={{
                                      position: "absolute",
                                      top: 8,
                                      right: 8,
                                      width: 26,
                                      height: 26,
                                      borderRadius: "50%",
                                      background: "var(--primary)",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      boxShadow: "0 2px 8px rgba(246,146,30,0.4)",
                                    }}
                                  >
                                    <Check size={14} color="#fff" strokeWidth={3} />
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {item.type === "approval" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          {itemOptions.map((opt) => {
                            const isSelected = selected === opt.id;
                            const count = voteCountByOption[opt.id] ?? 0;
                            return (
                              <div
                                key={opt.id}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  padding: "14px 18px",
                                  borderRadius: 14,
                                  border: isSelected
                                    ? "2px solid var(--primary)"
                                    : "2px solid var(--border)",
                                  background: isSelected ? "var(--primary-50)" : "var(--bg-card)",
                                  transition: "all 0.15s",
                                }}
                              >
                                <div style={{ flex: 1 }}>
                                  <p style={{ fontWeight: 600, fontSize: 14, color: "var(--foreground)", margin: 0 }}>
                                    {opt.label}
                                  </p>
                                  {opt.description && (
                                    <p style={{ fontSize: 12, color: "var(--foreground-muted)", margin: "2px 0 0" }}>
                                      {opt.description}
                                    </p>
                                  )}
                                </div>
                                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                  <VoteCountBadge count={count} />
                                  <VoterAvatars voters={votersByOption[opt.id] || []} />
                                  <button
                                    disabled={hasFinalized}
                                    onClick={() => handleSelect(item.id, opt.id)}
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 6,
                                      padding: "8px 16px",
                                      borderRadius: 10,
                                      border: "none",
                                      background: isSelected ? "var(--success)" : "var(--bg-muted)",
                                      color: isSelected ? "#fff" : "var(--foreground-muted)",
                                      fontWeight: 700,
                                      fontSize: 12,
                                      cursor: hasFinalized ? "default" : "pointer",
                                      transition: "all 0.15s",
                                      fontFamily: "inherit",
                                    }}
                                  >
                                    {isSelected ? <ThumbsUp size={14} /> : <ThumbsUp size={14} />}
                                    {isSelected ? "Aprovado" : "Aprovar"}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* ── Finalize button ── */}
                {!hasFinalized && items.length > 0 && (
                  <div style={{ display: "flex", justifyContent: "center", paddingTop: 8, paddingBottom: 32 }}>
                    <button
                      disabled={!allItemsVoted || finalizing}
                      onClick={handleFinalize}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "14px 40px",
                        borderRadius: 14,
                        border: "none",
                        background: allItemsVoted ? "var(--primary)" : "var(--bg-muted)",
                        color: allItemsVoted ? "#fff" : "var(--foreground-subtle)",
                        fontWeight: 700,
                        fontSize: 15,
                        cursor: allItemsVoted ? "pointer" : "not-allowed",
                        boxShadow: allItemsVoted ? "var(--shadow-primary)" : "none",
                        transition: "all 0.2s",
                        fontFamily: "inherit",
                      }}
                    >
                      {finalizing ? (
                        <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
                      ) : (
                        <Lock size={18} />
                      )}
                      Finalizar Votação
                    </button>
                  </div>
                )}

                {/* Locked banner */}
                {hasFinalized && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 10,
                      padding: "16px 24px",
                      borderRadius: 14,
                      background: "rgba(0,198,76,0.06)",
                      border: "1px solid rgba(0,198,76,0.2)",
                      marginBottom: 24,
                    }}
                  >
                    <Lock size={16} color="var(--success)" />
                    <p style={{ fontWeight: 700, fontSize: 13, color: "var(--success)", margin: 0 }}>
                      Seu voto foi finalizado e esta bloqueado.
                    </p>
                  </div>
                )}

                {/* Tiebreaker section */}
                {tiebreakerItems.length > 0 && allFinalized && project.status !== "finalized" && (
                  <div
                    style={{
                      background: "linear-gradient(135deg, rgba(246,146,30,0.06) 0%, rgba(239,68,68,0.06) 100%)",
                      border: "2px solid rgba(246,146,30,0.3)",
                      borderRadius: 20,
                      padding: 24,
                      marginBottom: 24,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                      <AlertTriangle size={22} color="var(--primary)" />
                      <div>
                        <h3 style={{ fontWeight: 700, fontSize: 16, color: "var(--foreground)", margin: 0 }}>
                          Rodada de Desempate
                        </h3>
                        <p style={{ fontSize: 12, color: "var(--foreground-muted)", margin: "2px 0 0" }}>
                          {tiebreakerItems.length} {tiebreakerItems.length === 1 ? "item empatou" : "itens empataram"}. Vote novamente apenas entre as opções empatadas.
                        </p>
                      </div>
                    </div>

                    {tiebreakerItems.map(({ itemId, tiedOptionIds }) => {
                      const item = items.find(i => i.id === itemId);
                      const tiedOpts = options.filter(o => tiedOptionIds.includes(o.id));
                      if (!item) return null;
                      return (
                        <div
                          key={itemId}
                          style={{
                            background: "var(--bg-card)",
                            borderRadius: 16,
                            padding: 20,
                            marginBottom: 12,
                            border: "1px solid var(--border)",
                          }}
                        >
                          <h4 style={{ fontWeight: 700, fontSize: 14, color: "var(--foreground)", margin: "0 0 12px", display: "flex", alignItems: "center", gap: 8 }}>
                            <Swords size={16} color="var(--primary)" />
                            {item.title} — Desempate
                          </h4>
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {tiedOpts.map(opt => {
                              const count = votes.filter(v => v.option_id === opt.id && v.item_id === itemId).length;
                              return (
                                <button
                                  key={opt.id}
                                  onClick={() => handleSelect(itemId, opt.id)}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 12,
                                    padding: "12px 16px",
                                    borderRadius: 12,
                                    border: selections[itemId] === opt.id
                                      ? "2px solid var(--primary)"
                                      : "2px solid var(--border)",
                                    background: selections[itemId] === opt.id ? "var(--primary-50)" : "var(--bg-card)",
                                    cursor: "pointer",
                                    textAlign: "left",
                                    fontFamily: "inherit",
                                    transition: "all 0.15s",
                                  }}
                                >
                                  <div style={{ flex: 1 }}>
                                    <p style={{ fontWeight: 600, fontSize: 14, color: "var(--foreground)", margin: 0 }}>
                                      {opt.label}
                                    </p>
                                    {opt.description && (
                                      <p style={{ fontSize: 12, color: "var(--foreground-muted)", margin: "2px 0 0" }}>
                                        {opt.description}
                                      </p>
                                    )}
                                  </div>
                                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--foreground-muted)" }}>
                                    {count} votos
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Right sidebar: Progress ── */}
          <div
            style={{
              background: "var(--bg-card)",
              borderRadius: 20,
              padding: 24,
              boxShadow: "var(--shadow-card)",
              position: "sticky",
              top: 24,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <Users size={16} color="var(--primary)" />
              <h3 style={{ fontWeight: 700, fontSize: 14, color: "var(--foreground)", margin: 0 }}>
                Progresso da Votação
              </h3>
            </div>

            {/* Progress bar */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground-muted)" }}>
                  {members.filter((m) => m.has_finalized).length} de {members.length}
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--primary)" }}>
                  {members.length > 0
                    ? Math.round((members.filter((m) => m.has_finalized).length / members.length) * 100)
                    : 0}
                  %
                </span>
              </div>
              <div
                style={{
                  height: 6,
                  borderRadius: 99,
                  background: "var(--bg-muted)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    borderRadius: 99,
                    background: "var(--primary)",
                    width: `${members.length > 0 ? (members.filter((m) => m.has_finalized).length / members.length) * 100 : 0}%`,
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
            </div>

            {/* Member list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {members.map((m) => (
                <div
                  key={m.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 10px",
                    borderRadius: 10,
                    background: m.has_finalized ? "rgba(0,198,76,0.04)" : "transparent",
                  }}
                >
                  <Avatar src={m.user_avatar} name={m.user_name} size={28} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontWeight: 600,
                        fontSize: 13,
                        color: "var(--foreground)",
                        margin: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {m.user_name}
                    </p>
                    <p style={{ fontSize: 10, color: "var(--foreground-subtle)", margin: 0 }}>
                      {m.role === "owner" ? "Dono" : "Votante"}
                    </p>
                  </div>
                  {m.has_finalized ? (
                    <CheckCircle2 size={18} color="var(--success)" />
                  ) : (
                    <Clock size={16} color="var(--foreground-subtle)" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Spin animation for loaders */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
