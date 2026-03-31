"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { getProjects, getProjectMembers, updateProjectStatus, detectTies, finalizeProject, type Project } from "@/lib/supabase";
import { seedOpaProject } from "@/lib/seed-opa";
import Header from "@/components/Header";
import LoginScreen from "@/components/LoginScreen";
import { Plus, Users, GripVertical, ImageIcon, Vote, LayoutDashboard, AlertTriangle } from "lucide-react";

type KanbanStatus = Project["status"];

interface ColumnDef {
  status: KanbanStatus;
  label: string;
  color: string;
  bgTint: string;
}

const COLUMNS: ColumnDef[] = [
  { status: "draft", label: "Novo Projeto", color: "#6b7280", bgTint: "rgba(107,114,128,0.08)" },
  { status: "voting", label: "Em Votação", color: "var(--fips-blue)", bgTint: "rgba(0,144,208,0.08)" },
  { status: "finalized", label: "Finalizado", color: "var(--success)", bgTint: "rgba(0,198,76,0.08)" },
  { status: "archived", label: "Desempate", color: "var(--primary)", bgTint: "rgba(246,146,30,0.08)" },
];

export default function ProjetosPage() {
  const { user, loading, supabase } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});
  const [voteCounts, setVoteCounts] = useState<Record<string, { total: number; voted: number }>>({});
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<KanbanStatus | null>(null);
  const [tiedProjects, setTiedProjects] = useState<Record<string, number>>({});

  // Load projects
  useEffect(() => {
    if (!supabase || !user) return;

    let cancelled = false;
    const userEmail = user.email || "";
    const userName = user.user_metadata?.full_name || userEmail.split("@")[0];
    const userAvatar = user.user_metadata?.avatar_url || null;

    (async () => {
      try {
        await seedOpaProject(supabase, userEmail, userName, userAvatar);

        const data = await getProjects(supabase);
        if (cancelled) return;
        setProjects(data);

        // Detect ties in finalized projects
        const tiedCounts: Record<string, number> = {};
        for (const p of data.filter(pr => pr.status === "voting" || pr.status === "finalized")) {
          try {
            const ties = await detectTies(supabase, p.id);
            if (ties.length > 0) tiedCounts[p.id] = ties.length;
          } catch { /* ignore */ }
        }
        if (!cancelled) setTiedProjects(tiedCounts);

        // Load member counts
        const counts: Record<string, number> = {};
        const vCounts: Record<string, { total: number; voted: number }> = {};

        await Promise.all(
          data.map(async (p) => {
            try {
              const members = await getProjectMembers(supabase, p.id);
              counts[p.id] = members.length;
              const finalized = members.filter((m) => m.has_finalized).length;
              vCounts[p.id] = { total: members.length, voted: finalized };
            } catch {
              counts[p.id] = 0;
              vCounts[p.id] = { total: 0, voted: 0 };
            }
          })
        );

        if (!cancelled) {
          setMemberCounts(counts);
          setVoteCounts(vCounts);
        }
      } catch {
        // supabase not ready
      } finally {
        if (!cancelled) setLoadingProjects(false);
      }
    })();

    return () => { cancelled = true; };
  }, [supabase, user]);

  // Drag handlers
  const handleDragStart = useCallback((e: React.DragEvent, projectId: string) => {
    setDraggedId(projectId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", projectId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, status: KanbanStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(status);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverColumn(null);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent, targetStatus: KanbanStatus) => {
      e.preventDefault();
      setDragOverColumn(null);
      const projectId = e.dataTransfer.getData("text/plain");
      if (!projectId || !supabase) return;

      const project = projects.find((p) => p.id === projectId);
      if (!project || project.status === targetStatus) {
        setDraggedId(null);
        return;
      }

      // Optimistic update
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, status: targetStatus } : p))
      );
      setDraggedId(null);

      try {
        if (targetStatus === "finalized" || targetStatus === "archived") {
          // Use finalizeProject to calculate winners and detect ties
          const result = await finalizeProject(supabase, projectId);
          const finalStatus = result === "tiebreaker" ? "archived" : "finalized";
          setProjects((prev) =>
            prev.map((p) => (p.id === projectId ? { ...p, status: finalStatus } : p))
          );
        } else {
          await updateProjectStatus(supabase, projectId, targetStatus);
        }
      } catch {
        setProjects((prev) =>
          prev.map((p) => (p.id === projectId ? { ...p, status: project.status } : p))
        );
      }
    },
    [supabase, projects]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedId(null);
    setDragOverColumn(null);
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: "var(--foreground-muted)" }}>Carregando...</div>
      </div>
    );
  }

  if (!user) return <LoginScreen />;

  const getColumnProjects = (status: KanbanStatus) => projects.filter((p) => p.status === status);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <Header />

      {/* Hero section */}
      <div
        style={{
          margin: "16px 16px 0",
          borderRadius: 20,
          padding: "32px 32px",
          position: "relative",
          overflow: "hidden",
          background: "var(--gradient-hero)",
        }}
      >
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <div>
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
                  background: "rgba(246, 146, 30, 0.2)",
                  color: "#fdc24e",
                }}
              >
                <LayoutDashboard size={14} />
                PROJETOS
              </div>
              <h2 style={{ color: "#fff", fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
                Seus projetos de votação
              </h2>
              <p style={{ fontSize: 14, maxWidth: 640, color: "rgba(255,255,255,0.65)", lineHeight: 1.6, margin: 0 }}>
                Gerencie seus projetos arrastando os cards entre as colunas.
              </p>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Link
                href="/projetos/novo"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 20px",
                  borderRadius: 14,
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#fff",
                  background: "rgba(255,255,255,0.15)",
                  border: "1px solid rgba(255,255,255,0.25)",
                  textDecoration: "none",
                  backdropFilter: "blur(8px)",
                  transition: "background 0.2s",
                }}
              >
                <Plus size={16} />
                Criar Projeto
              </Link>
            </div>
          </div>
        </div>
        <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: "50%", opacity: 0.1, background: "#fff" }} />
        <div style={{ position: "absolute", bottom: -64, left: -32, width: 224, height: 224, borderRadius: "50%", opacity: 0.05, background: "#fff" }} />
      </div>

      {/* Kanban Board */}
      <div style={{ padding: "24px 16px 48px", maxWidth: 1440, margin: "0 auto", width: "100%" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }} className="kanban-grid">
          {COLUMNS.map((col) => {
            const colProjects = getColumnProjects(col.status);
            const isOver = dragOverColumn === col.status;

            return (
              <div
                key={col.status}
                onDragOver={(e) => handleDragOver(e, col.status)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, col.status)}
                style={{
                  background: isOver ? col.bgTint : "transparent",
                  borderRadius: 20,
                  padding: 12,
                  minHeight: 400,
                  transition: "background 0.2s",
                  border: isOver ? `2px dashed ${col.color}` : "2px dashed transparent",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, padding: "8px 12px", borderRadius: 12, background: col.bgTint }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: col.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)", flex: 1 }}>{col.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: col.color, background: "var(--bg-card)", padding: "2px 10px", borderRadius: 999, border: `1px solid ${col.color}` }}>
                    {colProjects.length}
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {loadingProjects && colProjects.length === 0 && (
                    <div style={{ textAlign: "center", padding: "32px 16px", fontSize: 13, color: "var(--foreground-muted)" }}>Carregando...</div>
                  )}

                  {colProjects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      memberCount={memberCounts[project.id] ?? 0}
                      voteProgress={voteCounts[project.id] ?? { total: 0, voted: 0 }}
                      isDragging={draggedId === project.id}
                      tieCount={tiedProjects[project.id] ?? 0}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                    />
                  ))}

                  {!loadingProjects && colProjects.length === 0 && (
                    <div style={{ textAlign: "center", padding: "40px 16px", fontSize: 13, color: "var(--foreground-muted)", borderRadius: 14, border: "2px dashed var(--border)" }}>
                      Nenhum projeto
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tiebreaker alert */}
      {Object.keys(tiedProjects).length > 0 && (
        <div style={{ padding: "0 16px 32px", maxWidth: 1440, margin: "0 auto" }}>
          <div style={{ background: "linear-gradient(135deg, rgba(246,146,30,0.06) 0%, rgba(239,68,68,0.06) 100%)", border: "2px solid rgba(246,146,30,0.25)", borderRadius: 20, padding: "24px 28px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(246,146,30,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <AlertTriangle size={20} color="var(--primary)" />
              </div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>Desempates Pendentes</h3>
                <p style={{ fontSize: 12, color: "var(--foreground-muted)", margin: 0 }}>Arraste para a coluna "Desempate" para iniciar a rodada extra</p>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {Object.entries(tiedProjects).map(([projId, tieCount]) => {
                const proj = projects.find(p => p.id === projId);
                if (!proj) return null;
                return (
                  <Link
                    key={projId}
                    href={`/projeto/${projId}`}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderRadius: 14, background: "var(--bg-card)", border: "1px solid var(--border)", textDecoration: "none" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <AlertTriangle size={16} color="var(--primary)" />
                      <span style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)" }}>{proj.name}</span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 99, background: "rgba(246,146,30,0.12)", color: "var(--primary)" }}>
                      {tieCount} {tieCount === 1 ? "empate" : "empates"}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @media (max-width: 1024px) { .kanban-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 640px) { .kanban-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}

// ==================== Project Card ====================

interface ProjectCardProps {
  project: Project;
  memberCount: number;
  voteProgress: { total: number; voted: number };
  isDragging: boolean;
  tieCount: number;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
}

function ProjectCard({ project, memberCount, voteProgress, isDragging, tieCount, onDragStart, onDragEnd }: ProjectCardProps) {
  const [hovered, setHovered] = useState(false);
  const progressPercent = voteProgress.total > 0 ? Math.round((voteProgress.voted / voteProgress.total) * 100) : 0;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, project.id)}
      onDragEnd={onDragEnd}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "var(--bg-card)",
        borderRadius: 14,
        border: tieCount > 0 ? "2px solid rgba(246,146,30,0.4)" : "1px solid var(--border)",
        boxShadow: hovered ? "var(--shadow-card-hover)" : "var(--shadow-card)",
        opacity: isDragging ? 0.5 : 1,
        cursor: "grab",
        transition: "box-shadow 0.2s, opacity 0.2s, transform 0.15s",
        transform: hovered && !isDragging ? "translateY(-2px)" : "none",
        overflow: "hidden",
      }}
    >
      {/* Cover */}
      {project.cover_image ? (
        <div style={{ height: 120, background: `url(${project.cover_image}) center/cover no-repeat`, borderBottom: "1px solid var(--border)" }} />
      ) : (
        <div style={{ height: 56, background: "linear-gradient(135deg, var(--fips-blue), var(--fips-cyan))", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ImageIcon size={20} style={{ color: "rgba(255,255,255,0.4)" }} />
        </div>
      )}

      <div style={{ padding: "14px 16px 16px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 6 }}>
          <GripVertical size={16} style={{ color: "var(--foreground-muted)", opacity: 0.4, flexShrink: 0, marginTop: 2 }} />
          <Link href={`/projeto/${project.id}`} style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)", textDecoration: "none", lineHeight: 1.3, flex: 1 }} onClick={(e) => e.stopPropagation()}>
            {project.name}
          </Link>
        </div>

        {project.description && (
          <p style={{ fontSize: 13, color: "var(--foreground-muted)", lineHeight: 1.5, margin: "0 0 12px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {project.description}
          </p>
        )}

        {/* Tie badge */}
        {tieCount > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12, padding: "6px 10px", borderRadius: 10, background: "rgba(246,146,30,0.08)", border: "1px solid rgba(246,146,30,0.2)" }}>
            <AlertTriangle size={14} color="var(--primary)" />
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--primary)" }}>{tieCount} {tieCount === 1 ? "empate" : "empates"}</span>
          </div>
        )}

        {/* Vote progress */}
        {voteProgress.total > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--foreground-muted)" }}>
                <Vote size={12} style={{ display: "inline", verticalAlign: "-2px", marginRight: 4 }} />
                Progresso
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--fips-blue)" }}>
                {voteProgress.voted}/{voteProgress.total} ({progressPercent}%)
              </span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: "var(--border)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${progressPercent}%`, borderRadius: 3, background: progressPercent === 100 ? "var(--success)" : "linear-gradient(90deg, var(--fips-blue), var(--fips-cyan))", transition: "width 0.3s ease" }} />
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 10, borderTop: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {project.created_by_avatar ? (
              <img src={project.created_by_avatar} alt={project.created_by_name} style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--border)" }} />
            ) : (
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--fips-blue)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff" }}>
                {(project.created_by_name || "?").charAt(0).toUpperCase()}
              </div>
            )}
            <span style={{ fontSize: 12, fontWeight: 500, color: "var(--foreground-muted)", maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {project.created_by_name || project.created_by_email}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, color: "var(--foreground-muted)" }}>
            <Users size={14} />
            {memberCount}
          </div>
        </div>
      </div>
    </div>
  );
}
