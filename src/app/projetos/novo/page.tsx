"use client";

import { useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import {
  createProject,
  addProjectMember,
  createVotingItem,
  createVotingOption,
  createDocument,
  uploadFile,
  isAcceptedFile,
  getAcceptString,
} from "@/lib/supabase";
import { modulosCaos } from "@/data/modulosCaos";
import Header from "@/components/Header";
import LoginScreen from "@/components/LoginScreen";
import {
  ArrowLeft,
  Sparkles,
  Brain,
  Settings,
  AlertCircle,
  Loader2,
  Check,
  Plus,
  Trash2,
  Upload,
  FileText,
  Presentation,
  Table,
  FileCode,
  Braces,
  Image as ImageIcon,
  X,
  BookOpen,
  GitBranch,
  FolderOpen,
  Vote,
  ChevronDown,
  ChevronUp,
  Users,
  Trophy,
} from "lucide-react";

// ---------- style helpers ----------

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#fff",
  border: "2px solid var(--border, #e2e8f0)",
  borderRadius: 14,
  padding: "12px 16px",
  fontSize: 14,
  fontFamily: "Manrope, sans-serif",
  color: "var(--foreground)",
  outline: "none",
  transition: "border-color 0.2s, box-shadow 0.2s",
  boxSizing: "border-box" as const,
};

const cardStyle: React.CSSProperties = {
  background: "var(--bg-card, #ffffff)",
  border: "1px solid var(--border, #e2e8f0)",
  borderRadius: 20,
  padding: 28,
  boxShadow: "var(--shadow-card)",
};

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: "var(--foreground-muted)",
  marginBottom: 6,
  display: "block",
  fontFamily: "Manrope, sans-serif",
};

const sectionTitle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  color: "var(--foreground)",
  display: "flex",
  alignItems: "center",
  gap: 10,
  marginBottom: 16,
  fontFamily: "Manrope, sans-serif",
};

// ---------- file helpers ----------

const IMAGE_EXTS = ["jpg", "jpeg", "png", "gif", "webp", "svg"];
const PRES_EXTS = ["ppt", "pptx"];

function isImageFile(name: string): boolean {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  return IMAGE_EXTS.includes(ext);
}

function getFileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (PRES_EXTS.includes(ext)) return { icon: Presentation, color: "#f6921e", bg: "rgba(246,146,30,0.1)", label: ext.toUpperCase() };
  if (ext === "pdf") return { icon: FileText, color: "#ef4444", bg: "rgba(239,68,68,0.1)", label: "PDF" };
  if (["doc", "docx"].includes(ext)) return { icon: FileText, color: "#3b82f6", bg: "rgba(59,130,246,0.1)", label: ext.toUpperCase() };
  if (["md", "txt"].includes(ext)) return { icon: FileCode, color: "#6b7280", bg: "rgba(107,114,128,0.1)", label: ext.toUpperCase() };
  if (["xls", "xlsx", "csv"].includes(ext)) return { icon: Table, color: "#22c55e", bg: "rgba(34,197,94,0.1)", label: ext.toUpperCase() };
  if (ext === "json") return { icon: Braces, color: "#a855f7", bg: "rgba(168,85,247,0.1)", label: "JSON" };
  if (IMAGE_EXTS.includes(ext)) return { icon: ImageIcon, color: "#0090d0", bg: "rgba(0,144,208,0.1)", label: ext.toUpperCase() };
  return { icon: FileText, color: "#6b7280", bg: "rgba(107,114,128,0.1)", label: ext.toUpperCase() };
}

// ---------- AI context ----------

function buildContext(): string {
  const moduleSummary = modulosCaos
    .map((m) => `${m.id}. ${m.name} (${m.sector}) — ${m.examples.map((e) => e.title).join(", ")}`)
    .join("\n");

  return `## Contexto do Projeto

### Conceito dos 3 Atos
- **ATO 1 - O Caos**: 44 módulos mostrando problemas que existiam antes (8 setores)
- **ATO 2 - Soluções**: Soluções implementadas para cada módulo
- **ATO 3 - Resultados**: Métricas e resultados alcançados

### Os 44 Módulos:
${moduleSummary}

### Setores:
1. Administrativo / Jurídico
2. Recursos Humanos
3. Financeiro / Contabilidade
4. Segurança e Meio Ambiente
5. Operações
6. Engenharia e Manutenção
7. Tecnologia da Informação
8. Comercial / Relacionamento`;
}

// ---------- types ----------

interface BriefingFile {
  file: File;
  preview?: string;
}

interface ManualItem {
  title: string;
  description: string;
  type: "single_choice" | "image_select" | "approval";
  options: ManualOption[];
}

interface ManualOption {
  label: string;
  mode: "file" | "text";
  file: File | null;
  contentText: string;
}

interface GeneratedItem {
  title: string;
  description: string;
  options: { label: string; content_text: string }[];
  selected: boolean;
}

// ---------- component ----------

export default function CriarProjetoPageWrapper() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}><p style={{ fontSize: 14, color: "var(--foreground-muted)" }}>Carregando...</p></div>}>
      <CriarProjetoPage />
    </Suspense>
  );
}

function CriarProjetoPage() {
  const { user, loading, supabase } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const startWithIA = searchParams.get("mode") === "ia";

  // Section 1: Project data
  const [projectName, setProjectName] = useState("");
  const [projectDesc, setProjectDesc] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  // Voting config
  const [maxVoters, setMaxVoters] = useState(3);
  const [requiredWinners, setRequiredWinners] = useState(1);

  // Section 2: Briefing & Attachments
  const [briefingFiles, setBriefingFiles] = useState<BriefingFile[]>([]);
  const dropRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Section 3: Voting Items
  const [itemMode, setItemMode] = useState<"manual" | "ia">(startWithIA ? "ia" : "manual");
  const [manualItems, setManualItems] = useState<ManualItem[]>([
    { title: "", description: "", type: "single_choice", options: [
      { label: "", mode: "file", file: null, contentText: "" },
      { label: "", mode: "file", file: null, contentText: "" },
    ]},
  ]);
  const [expandedManualItem, setExpandedManualItem] = useState<number>(0);

  // IA fields
  const [aiApiKey, setAiApiKey] = useState("");
  const [aiModel, setAiModel] = useState("claude-sonnet-4-6");
  const [aiBriefing, setAiBriefing] = useState("");
  const [includeModules, setIncludeModules] = useState(true);
  const [gitUrl, setGitUrl] = useState("");
  const [includeBriefingFiles, setIncludeBriefingFiles] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatedItems, setGeneratedItems] = useState<GeneratedItem[]>([]);

  // Saving state
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedProjectId, setSavedProjectId] = useState<string | null>(null);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
        <Loader2 size={24} className="animate-spin" style={{ color: "var(--fips-cyan)" }} />
      </div>
    );
  }

  if (!user) return <LoginScreen />;

  const userEmail = user.email || "";
  const userName = user.user_metadata?.full_name || userEmail.split("@")[0];
  const userAvatar = user.user_metadata?.avatar_url || null;

  function handleFocus(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    e.currentTarget.style.borderColor = "var(--fips-blue, #0090d0)";
    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,144,208,0.12)";
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    e.currentTarget.style.borderColor = "var(--border, #e2e8f0)";
    e.currentTarget.style.boxShadow = "none";
  }

  // ---------- Cover image ----------

  function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f && isImageFile(f.name)) {
      setCoverFile(f);
      const reader = new FileReader();
      reader.onload = () => setCoverPreview(reader.result as string);
      reader.readAsDataURL(f);
    }
  }

  // ---------- Briefing drag & drop ----------

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => isAcceptedFile(f.name));
    addBriefingFiles(files);
  }

  function handleBriefingFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []).filter((f) => isAcceptedFile(f.name));
    addBriefingFiles(files);
    e.target.value = "";
  }

  function addBriefingFiles(files: File[]) {
    const newFiles: BriefingFile[] = files.map((file) => {
      const bf: BriefingFile = { file };
      if (isImageFile(file.name)) {
        const reader = new FileReader();
        reader.onload = () => {
          setBriefingFiles((prev) =>
            prev.map((f) => (f.file === file ? { ...f, preview: reader.result as string } : f))
          );
        };
        reader.readAsDataURL(file);
      }
      return bf;
    });
    setBriefingFiles((prev) => [...prev, ...newFiles]);
  }

  function removeBriefingFile(idx: number) {
    setBriefingFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  // ---------- Manual items ----------

  function addManualItem() {
    setManualItems((prev) => [
      ...prev,
      { title: "", description: "", type: "single_choice", options: [
        { label: "", mode: "file", file: null, contentText: "" },
        { label: "", mode: "file", file: null, contentText: "" },
      ]},
    ]);
    setExpandedManualItem(manualItems.length);
  }

  function removeManualItem(idx: number) {
    setManualItems((prev) => prev.filter((_, i) => i !== idx));
    if (expandedManualItem === idx) setExpandedManualItem(Math.max(0, idx - 1));
  }

  function updateManualItem(idx: number, updates: Partial<ManualItem>) {
    setManualItems((prev) => prev.map((item, i) => (i === idx ? { ...item, ...updates } : item)));
  }

  function addManualOption(itemIdx: number) {
    setManualItems((prev) =>
      prev.map((item, i) =>
        i === itemIdx
          ? { ...item, options: [...item.options, { label: "", mode: "file" as const, file: null, contentText: "" }] }
          : item
      )
    );
  }

  function removeManualOption(itemIdx: number, optIdx: number) {
    setManualItems((prev) =>
      prev.map((item, i) =>
        i === itemIdx ? { ...item, options: item.options.filter((_, j) => j !== optIdx) } : item
      )
    );
  }

  function updateManualOption(itemIdx: number, optIdx: number, updates: Partial<ManualOption>) {
    setManualItems((prev) =>
      prev.map((item, i) =>
        i === itemIdx
          ? { ...item, options: item.options.map((opt, j) => (j === optIdx ? { ...opt, ...updates } : opt)) }
          : item
      )
    );
  }

  // ---------- AI generation ----------

  async function handleGenerate() {
    if (!aiApiKey.trim() || !aiBriefing.trim()) {
      alert("Preencha a API Key e o briefing.");
      return;
    }

    setGenerating(true);
    try {
      const moduleContext = includeModules ? buildContext() : "";
      const gitContext = gitUrl.trim() ? `\n\nRepositório Git para contexto: ${gitUrl.trim()}` : "";
      const briefingContext = includeBriefingFiles && briefingFiles.length > 0
        ? `\n\nArquivos de briefing anexados: ${briefingFiles.map((f) => f.file.name).join(", ")}`
        : "";

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": aiApiKey.trim(),
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: aiModel,
          max_tokens: 8192,
          messages: [
            {
              role: "user",
              content: `Você é um especialista em gestão de projetos. Analise o briefing abaixo e gere itens de votação para o projeto "${projectName || "Novo Projeto"}".

${moduleContext}
${gitContext}
${briefingContext}

BRIEFING DO USUÁRIO:
${aiBriefing}

INSTRUÇÕES:
- Gere itens de votação relevantes baseados no briefing
- Cada item deve ter um título claro, descrição explicativa, e 2-4 opções para votação
- Cada opção deve ter um label (título curto) e content_text (texto descritivo detalhado)
- O content_text deve ser extenso e explicativo para os gestores entenderem cada opção
- Use linguagem profissional em português (pt-BR)

Responda APENAS com JSON válido (sem markdown, sem explicação):
{
  "items": [
    {
      "title": "Título do item de votação",
      "description": "Descrição do que está sendo votado",
      "options": [
        { "label": "Nome da opção", "content_text": "Texto descritivo detalhado explicando esta opção..." },
        { "label": "Nome da opção 2", "content_text": "Texto descritivo detalhado explicando esta opção..." }
      ]
    }
  ]
}`,
            },
          ],
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`API Error: ${response.status} - ${err}`);
      }

      const data = await response.json();
      const text = data.content?.[0]?.text || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("IA não retornou JSON válido");

      const parsed = JSON.parse(jsonMatch[0]);
      if (!parsed.items || !Array.isArray(parsed.items)) throw new Error("Formato inválido");

      const items: GeneratedItem[] = parsed.items.map((item: { title?: string; description?: string; options?: Array<{ label?: string; content_text?: string }> }) => ({
        title: item.title || "",
        description: item.description || "",
        options: (item.options || []).map((opt) => ({
          label: opt.label || "",
          content_text: opt.content_text || "",
        })),
        selected: true,
      }));

      setGeneratedItems(items);
    } catch (err) {
      console.error(err);
      alert(`Erro ao gerar: ${err instanceof Error ? err.message : "Erro desconhecido"}`);
    } finally {
      setGenerating(false);
    }
  }

  function toggleGeneratedItem(idx: number) {
    setGeneratedItems((prev) => prev.map((item, i) => (i === idx ? { ...item, selected: !item.selected } : item)));
  }

  function removeGeneratedItem(idx: number) {
    setGeneratedItems((prev) => prev.filter((_, i) => i !== idx));
  }

  // ---------- save project ----------

  async function handleCreateProject() {
    if (!supabase || !projectName.trim()) {
      alert("Nome do projeto é obrigatório.");
      return;
    }

    // Validate items
    if (itemMode === "manual") {
      const validItems = manualItems.filter((item) => {
        if (!item.title.trim()) return false;
        const validOpts = item.options.filter((o) => o.label.trim() && (o.file || o.contentText.trim()));
        return validOpts.length >= 2;
      });
      if (validItems.length === 0) {
        alert("Adicione pelo menos 1 item de votação com 2 opções válidas.");
        return;
      }
    } else {
      const selected = generatedItems.filter((i) => i.selected);
      if (selected.length === 0) {
        alert("Gere e selecione pelo menos 1 item de votação com IA.");
        return;
      }
    }

    setSaving(true);
    try {
      // 1. Upload cover if exists
      let coverUrl: string | null = null;
      if (coverFile) {
        // Upload to a temp project folder, we'll use the project ID after creation
        const ext = coverFile.name.split(".").pop()?.toLowerCase() || "png";
        const safeName = `covers/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error } = await supabase.storage.from("project-files").upload(safeName, coverFile, { cacheControl: "3600", upsert: false });
        if (!error) {
          const { data } = supabase.storage.from("project-files").getPublicUrl(safeName);
          coverUrl = data.publicUrl;
        }
      }

      // 2. Create project
      const project = await createProject(supabase, {
        name: projectName.trim(),
        description: projectDesc.trim() || null,
        status: "draft",
        cover_image: coverUrl,
        max_voters: maxVoters,
        required_winners: requiredWinners,
        created_by_email: userEmail,
        created_by_name: userName,
        created_by_avatar: userAvatar,
      });

      // 3. Add creator as owner
      await addProjectMember(supabase, {
        project_id: project.id,
        user_email: userEmail,
        user_name: userName,
        user_avatar: userAvatar,
        role: "owner",
        has_finalized: false,
      });

      // 4. Upload briefing files as documents
      for (const bf of briefingFiles) {
        const fileUrl = await uploadFile(supabase, project.id, bf.file);
        const ext = bf.file.name.split(".").pop()?.toLowerCase() || "";
        await createDocument(supabase, {
          project_id: project.id,
          title: bf.file.name,
          file_url: fileUrl,
          file_type: ext,
          uploaded_by_email: userEmail,
          uploaded_by_name: userName,
        });
      }

      // 5. Create voting items
      if (itemMode === "manual") {
        for (let i = 0; i < manualItems.length; i++) {
          const mi = manualItems[i];
          if (!mi.title.trim()) continue;
          const validOpts = mi.options.filter((o) => o.label.trim() && (o.file || o.contentText.trim()));
          if (validOpts.length < 2) continue;

          const votingItem = await createVotingItem(supabase, {
            project_id: project.id,
            title: mi.title.trim(),
            description: mi.description.trim() || null,
            type: mi.type,
            position: i,
            max_winners: 1,
          });

          for (let j = 0; j < validOpts.length; j++) {
            const opt = validOpts[j];
            let fileUrl: string | null = null;
            let fileType: string | null = null;

            if (opt.mode === "file" && opt.file) {
              fileUrl = await uploadFile(supabase, project.id, opt.file);
              fileType = opt.file.name.split(".").pop()?.toLowerCase() || null;
            }

            await createVotingOption(supabase, {
              item_id: votingItem.id,
              project_id: project.id,
              label: opt.label.trim(),
              description: opt.mode === "text" ? opt.contentText.trim() : null,
              image_url: fileUrl && isImageFile(opt.file!.name) ? fileUrl : null,
              file_url: fileUrl,
              file_type: fileType,
              position: j,
            });
          }
        }
      } else {
        // IA items
        const selected = generatedItems.filter((i) => i.selected);
        for (let i = 0; i < selected.length; i++) {
          const gi = selected[i];
          const votingItem = await createVotingItem(supabase, {
            project_id: project.id,
            title: gi.title,
            description: gi.description || null,
            type: "single_choice",
            position: i,
            max_winners: 1,
          });

          for (let j = 0; j < gi.options.length; j++) {
            const opt = gi.options[j];
            await createVotingOption(supabase, {
              item_id: votingItem.id,
              project_id: project.id,
              label: opt.label,
              description: opt.content_text,
              position: j,
            });
          }
        }
      }

      setSavedProjectId(project.id);
      setSaved(true);
    } catch (err) {
      console.error(err);
      alert(`Erro ao criar projeto: ${err instanceof Error ? err.message : "Erro desconhecido"}`);
    } finally {
      setSaving(false);
    }
  }

  // ---------- success screen ----------

  if (saved) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: "Manrope, sans-serif", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", maxWidth: 480, padding: 24 }}>
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: "rgba(0,198,76,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
            <Check size={40} style={{ color: "var(--success)" }} />
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--foreground)", margin: "0 0 12px" }}>
            Projeto Criado!
          </h1>
          <p style={{ fontSize: 16, color: "var(--foreground-muted)", margin: "0 0 32px", lineHeight: 1.6 }}>
            <strong>{projectName}</strong> foi criado com sucesso. Você pode iniciar a votação quando estiver pronto.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            {savedProjectId && (
              <button
                onClick={() => router.push(`/projeto/${savedProjectId}`)}
                style={{
                  background: "var(--fips-cyan)",
                  color: "#fff",
                  fontWeight: 600,
                  borderRadius: 14,
                  padding: "14px 28px",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 15,
                  fontFamily: "Manrope, sans-serif",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  boxShadow: "0 4px 16px rgba(60,169,201,0.3)",
                }}
              >
                <Vote size={18} />
                Ver Projeto
              </button>
            )}
            <button
              onClick={() => router.push("/projetos")}
              style={{
                background: "transparent",
                border: "2px solid var(--border)",
                color: "var(--foreground-muted)",
                fontWeight: 600,
                borderRadius: 14,
                padding: "14px 28px",
                cursor: "pointer",
                fontSize: 15,
                fontFamily: "Manrope, sans-serif",
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <FolderOpen size={18} />
              Ir para Projetos
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------- main render ----------

  const hasValidManualItems = manualItems.some((item) => {
    if (!item.title.trim()) return false;
    const validOpts = item.options.filter((o) => o.label.trim() && (o.file || o.contentText.trim()));
    return validOpts.length >= 2;
  });

  const selectedAICount = generatedItems.filter((i) => i.selected).length;

  const canCreate =
    projectName.trim() &&
    (itemMode === "manual" ? hasValidManualItems : selectedAICount > 0);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: "Manrope, sans-serif" }}>
      <Header />

      {/* Top bar */}
      <div style={{ background: "var(--bg-card)", borderBottom: "1px solid var(--border)", padding: "16px 24px", display: "flex", alignItems: "center", gap: 16 }}>
        <button
          onClick={() => router.push("/projetos")}
          style={{ background: "transparent", border: "2px solid var(--border)", color: "var(--primary)", fontWeight: 600, borderRadius: 12, padding: "8px 14px", cursor: "pointer", fontSize: 14, fontFamily: "Manrope, sans-serif", display: "inline-flex", alignItems: "center", gap: 8 }}
        >
          <ArrowLeft size={18} /> Voltar
        </button>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--foreground)", margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
            <Plus size={22} style={{ color: "var(--fips-blue)" }} />
            Criar Projeto
          </h1>
          <p style={{ fontSize: 12, color: "var(--foreground-muted)", margin: 0 }}>
            Defina os dados do projeto, anexe briefing e crie itens de votação
          </p>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 820, margin: "0 auto", padding: "32px 20px 80px", display: "flex", flexDirection: "column", gap: 28 }}>

        {/* ======== SECTION 1: Project Data ======== */}
        <div style={cardStyle}>
          <div style={sectionTitle}>
            <FolderOpen size={20} style={{ color: "var(--fips-blue)" }} />
            Dados do Projeto
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Nome do Projeto *</label>
            <input
              style={inputStyle}
              placeholder="Ex: Aprovação de Layout 2026"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Descrição</label>
            <textarea
              style={{ ...inputStyle, minHeight: 80, resize: "vertical" }}
              placeholder="Descreva o objetivo do projeto..."
              value={projectDesc}
              onChange={(e) => setProjectDesc(e.target.value)}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>

          <div>
            <label style={labelStyle}>Imagem de Capa (opcional)</label>
            <div
              onClick={() => document.getElementById("cover-input")?.click()}
              style={{
                height: coverPreview ? 180 : 100,
                borderRadius: 14,
                border: `2px dashed ${coverPreview ? "rgba(0,198,76,0.3)" : "var(--border)"}`,
                background: coverPreview ? "transparent" : "var(--bg)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                position: "relative",
              }}
            >
              {coverPreview ? (
                <>
                  <img src={coverPreview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <button
                    onClick={(e) => { e.stopPropagation(); setCoverFile(null); setCoverPreview(null); }}
                    style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.5)", border: "none", borderRadius: 8, padding: 4, cursor: "pointer", color: "#fff" }}
                  >
                    <X size={16} />
                  </button>
                </>
              ) : (
                <div style={{ textAlign: "center" }}>
                  <ImageIcon size={24} style={{ color: "var(--foreground-subtle)", margin: "0 auto 4px" }} />
                  <p style={{ fontSize: 12, color: "var(--foreground-muted)", margin: 0 }}>Clique para selecionar</p>
                </div>
              )}
            </div>
            <input
              id="cover-input"
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleCoverChange}
            />
          </div>
        </div>

        {/* ======== SECTION 2: Briefing & Attachments ======== */}
        <div style={cardStyle}>
          <div style={sectionTitle}>
            <Upload size={20} style={{ color: "var(--primary)" }} />
            Briefing &amp; Anexos
          </div>

          <p style={{ fontSize: 13, color: "var(--foreground-subtle)", margin: "0 0 16px", lineHeight: 1.6 }}>
            Anexe imagens, PDFs, documentos, planilhas ou apresentações como referência para o projeto.
          </p>

          {/* Drop zone */}
          <div
            ref={dropRef}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById("briefing-input")?.click()}
            style={{
              minHeight: 120,
              borderRadius: 14,
              border: `2px dashed ${isDragging ? "var(--fips-blue)" : "var(--border)"}`,
              background: isDragging ? "rgba(0,144,208,0.06)" : "var(--bg)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s",
              padding: 20,
            }}
          >
            <div style={{ textAlign: "center" }}>
              <Upload size={28} style={{ color: isDragging ? "var(--fips-blue)" : "var(--foreground-subtle)", margin: "0 auto 8px" }} />
              <p style={{ fontSize: 13, fontWeight: 600, color: isDragging ? "var(--fips-blue)" : "var(--foreground-muted)", margin: "0 0 4px" }}>
                Arraste arquivos aqui ou clique para selecionar
              </p>
              <p style={{ fontSize: 11, color: "var(--foreground-subtle)", margin: 0 }}>
                Imagens, PDFs, Word, PPT, planilhas, textos
              </p>
            </div>
          </div>
          <input
            id="briefing-input"
            type="file"
            accept={getAcceptString()}
            multiple
            style={{ display: "none" }}
            onChange={handleBriefingFileInput}
          />

          {/* File thumbnails */}
          {briefingFiles.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12, marginTop: 16 }}>
              {briefingFiles.map((bf, idx) => {
                const fi = getFileIcon(bf.file.name);
                const Icon = fi.icon;
                const isImg = isImageFile(bf.file.name);

                return (
                  <div
                    key={idx}
                    style={{
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      overflow: "hidden",
                      background: "var(--bg-card)",
                      position: "relative",
                    }}
                  >
                    {/* Thumbnail */}
                    <div style={{ height: 90, display: "flex", alignItems: "center", justifyContent: "center", background: isImg && bf.preview ? "transparent" : fi.bg, overflow: "hidden" }}>
                      {isImg && bf.preview ? (
                        <img src={bf.preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ textAlign: "center" }}>
                          <Icon size={28} color={fi.color} />
                          <div style={{ fontSize: 9, fontWeight: 700, color: fi.color, marginTop: 4 }}>{fi.label}</div>
                        </div>
                      )}
                    </div>
                    {/* File name */}
                    <div style={{ padding: "6px 8px", borderTop: "1px solid var(--border)" }}>
                      <p style={{ fontSize: 10, fontWeight: 600, color: "var(--foreground)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {bf.file.name}
                      </p>
                      <p style={{ fontSize: 9, color: "var(--foreground-subtle)", margin: 0 }}>
                        {(bf.file.size / 1024).toFixed(0)} KB
                      </p>
                    </div>
                    {/* Remove button */}
                    <button
                      onClick={() => removeBriefingFile(idx)}
                      style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.5)", border: "none", borderRadius: 6, padding: 3, cursor: "pointer", color: "#fff" }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ======== VOTING CONFIG ======== */}
        <div style={cardStyle}>
          <div style={sectionTitle}>
            <Settings size={20} style={{ color: "var(--fips-cyan)" }} />
            Configurações da Votação
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div>
              <label style={labelStyle}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Users size={14} style={{ color: "var(--fips-blue)" }} />
                  Número de Decisores
                </span>
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={maxVoters}
                onChange={(e) => setMaxVoters(Math.max(1, parseInt(e.target.value) || 1))}
                style={{ ...inputStyle, padding: "10px 14px" }}
                onFocus={handleFocus}
                onBlur={handleBlur}
                title="Quantas pessoas precisam votar neste projeto"
              />
              <p style={{ fontSize: 11, color: "var(--foreground-subtle)", margin: "6px 0 0", lineHeight: 1.4 }}>
                Quantas pessoas precisam votar neste projeto
              </p>
            </div>

            <div>
              <label style={labelStyle}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Trophy size={14} style={{ color: "var(--primary)" }} />
                  Vencedores Necessários
                </span>
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={requiredWinners}
                onChange={(e) => setRequiredWinners(Math.max(1, parseInt(e.target.value) || 1))}
                style={{ ...inputStyle, padding: "10px 14px" }}
                onFocus={handleFocus}
                onBlur={handleBlur}
                title="Quantos itens vencedores este projeto precisa selecionar"
              />
              <p style={{ fontSize: 11, color: "var(--foreground-subtle)", margin: "6px 0 0", lineHeight: 1.4 }}>
                Quantos itens vencedores este projeto precisa
              </p>
            </div>
          </div>
        </div>

        {/* ======== SECTION 3: Voting Items ======== */}
        <div style={cardStyle}>
          <div style={sectionTitle}>
            <Vote size={20} style={{ color: "var(--success)" }} />
            Itens de Votação
          </div>

          {/* Mode toggle */}
          <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
            <button
              onClick={() => setItemMode("manual")}
              style={{
                flex: 1,
                padding: "16px 20px",
                borderRadius: 14,
                border: `2px solid ${itemMode === "manual" ? "var(--fips-blue)" : "var(--border)"}`,
                background: itemMode === "manual" ? "rgba(0,144,208,0.06)" : "var(--bg)",
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "Manrope, sans-serif",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <Plus size={18} style={{ color: itemMode === "manual" ? "var(--fips-blue)" : "var(--foreground-subtle)" }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: itemMode === "manual" ? "var(--fips-blue)" : "var(--foreground)" }}>
                  Manual
                </span>
              </div>
              <p style={{ fontSize: 12, color: "var(--foreground-muted)", margin: 0, lineHeight: 1.5 }}>
                Crie itens manualmente com título, opções em texto ou arquivo
              </p>
            </button>

            <button
              onClick={() => setItemMode("ia")}
              style={{
                flex: 1,
                padding: "16px 20px",
                borderRadius: 14,
                border: `2px solid ${itemMode === "ia" ? "#a855f7" : "var(--border)"}`,
                background: itemMode === "ia" ? "rgba(168,85,247,0.06)" : "var(--bg)",
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "Manrope, sans-serif",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <Sparkles size={18} style={{ color: itemMode === "ia" ? "#a855f7" : "var(--foreground-subtle)" }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: itemMode === "ia" ? "#a855f7" : "var(--foreground)" }}>
                  Gerar com IA
                </span>
              </div>
              <p style={{ fontSize: 12, color: "var(--foreground-muted)", margin: 0, lineHeight: 1.5 }}>
                A IA analisa o contexto e gera votações estruturadas automaticamente
              </p>
            </button>
          </div>

          {/* ---- MANUAL MODE ---- */}
          {itemMode === "manual" && (
            <div>
              {manualItems.map((item, itemIdx) => {
                const isExpanded = expandedManualItem === itemIdx;
                return (
                  <div
                    key={itemIdx}
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: 16,
                      marginBottom: 12,
                      overflow: "hidden",
                      background: "var(--bg)",
                    }}
                  >
                    {/* Item header */}
                    <div
                      onClick={() => setExpandedManualItem(isExpanded ? -1 : itemIdx)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "14px 18px",
                        cursor: "pointer",
                        background: isExpanded ? "rgba(0,144,208,0.04)" : "transparent",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(0,144,208,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "var(--fips-blue)" }}>
                          {itemIdx + 1}
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)" }}>
                          {item.title.trim() || `Item ${itemIdx + 1}`}
                        </span>
                        <span style={{ fontSize: 11, color: "var(--foreground-subtle)" }}>
                          ({item.options.length} opções)
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {manualItems.length > 1 && (
                          <button
                            onClick={(e) => { e.stopPropagation(); removeManualItem(itemIdx); }}
                            style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--foreground-subtle)" }}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                        {isExpanded ? <ChevronUp size={16} style={{ color: "var(--foreground-subtle)" }} /> : <ChevronDown size={16} style={{ color: "var(--foreground-subtle)" }} />}
                      </div>
                    </div>

                    {/* Item body */}
                    {isExpanded && (
                      <div style={{ padding: "0 18px 18px" }}>
                        <div style={{ marginBottom: 12 }}>
                          <label style={labelStyle}>Título do Item *</label>
                          <input
                            style={inputStyle}
                            placeholder="Ex: Qual layout usar para o dashboard?"
                            value={item.title}
                            onChange={(e) => updateManualItem(itemIdx, { title: e.target.value })}
                            onFocus={handleFocus}
                            onBlur={handleBlur}
                          />
                        </div>

                        <div style={{ marginBottom: 12 }}>
                          <label style={labelStyle}>Descrição</label>
                          <textarea
                            style={{ ...inputStyle, minHeight: 60, resize: "vertical" }}
                            placeholder="Opcional..."
                            value={item.description}
                            onChange={(e) => updateManualItem(itemIdx, { description: e.target.value })}
                            onFocus={handleFocus}
                            onBlur={handleBlur}
                          />
                        </div>

                        {/* Options */}
                        <label style={{ ...labelStyle, marginTop: 16 }}>Opções (mín. 2) *</label>
                        {item.options.map((opt, optIdx) => (
                          <div key={optIdx} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: 10, marginBottom: 8 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                              <input
                                type="text"
                                value={opt.label}
                                onChange={(e) => updateManualOption(itemIdx, optIdx, { label: e.target.value })}
                                placeholder={`Opção ${optIdx + 1}`}
                                style={{ ...inputStyle, padding: "8px 12px", fontSize: 13, borderRadius: 10, flex: 1 }}
                                onFocus={handleFocus}
                                onBlur={handleBlur}
                              />
                              <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                                <button
                                  onClick={() => updateManualOption(itemIdx, optIdx, { mode: "file" })}
                                  style={{ padding: "4px 8px", borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer", background: opt.mode === "file" ? "var(--fips-blue)" : "transparent", color: opt.mode === "file" ? "#fff" : "var(--foreground-subtle)", border: "none", fontFamily: "Manrope, sans-serif" }}
                                >
                                  Arquivo
                                </button>
                                <button
                                  onClick={() => updateManualOption(itemIdx, optIdx, { mode: "text" })}
                                  style={{ padding: "4px 8px", borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer", background: opt.mode === "text" ? "var(--fips-blue)" : "transparent", color: opt.mode === "text" ? "#fff" : "var(--foreground-subtle)", border: "none", fontFamily: "Manrope, sans-serif" }}
                                >
                                  Texto
                                </button>
                              </div>
                              {item.options.length > 2 && (
                                <button
                                  onClick={() => removeManualOption(itemIdx, optIdx)}
                                  style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--foreground-subtle)" }}
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>

                            {opt.mode === "file" ? (
                              <label
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                  padding: "6px 10px",
                                  borderRadius: 8,
                                  fontSize: 11,
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  background: opt.file ? "rgba(0,198,76,0.1)" : "var(--bg)",
                                  color: opt.file ? "var(--success)" : "var(--foreground-muted)",
                                  border: `1px solid ${opt.file ? "rgba(0,198,76,0.3)" : "var(--border)"}`,
                                }}
                              >
                                {opt.file ? <Check size={12} /> : <Upload size={12} />}
                                {opt.file ? opt.file.name.substring(0, 25) : "Escolher arquivo"}
                                <input
                                  type="file"
                                  accept={getAcceptString()}
                                  style={{ display: "none" }}
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f && isAcceptedFile(f.name)) {
                                      updateManualOption(itemIdx, optIdx, { file: f });
                                    }
                                  }}
                                />
                              </label>
                            ) : (
                              <textarea
                                value={opt.contentText}
                                onChange={(e) => updateManualOption(itemIdx, optIdx, { contentText: e.target.value })}
                                placeholder="Conteúdo da opção..."
                                rows={3}
                                style={{ ...inputStyle, padding: "8px 12px", fontSize: 12, borderRadius: 10, minHeight: 60, resize: "vertical" }}
                                onFocus={handleFocus}
                                onBlur={handleBlur}
                              />
                            )}
                          </div>
                        ))}

                        {item.options.length < 6 && (
                          <button
                            onClick={() => addManualOption(itemIdx)}
                            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "var(--fips-blue)", background: "none", border: "none", cursor: "pointer", padding: "4px 0", fontFamily: "Manrope, sans-serif" }}
                          >
                            <Plus size={14} /> Adicionar opção
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              <button
                onClick={addManualItem}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  width: "100%",
                  padding: "14px 20px",
                  borderRadius: 14,
                  border: "2px dashed var(--border)",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--fips-blue)",
                  fontFamily: "Manrope, sans-serif",
                  marginTop: 4,
                }}
              >
                <Plus size={16} /> Adicionar Item de Votação
              </button>
            </div>
          )}

          {/* ---- IA MODE ---- */}
          {itemMode === "ia" && (
            <div>
              {/* API Config */}
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
                <div style={{ flex: 2, minWidth: 260 }}>
                  <label style={labelStyle}>
                    <Settings size={13} style={{ display: "inline", verticalAlign: "-2px", marginRight: 4 }} />
                    API Key do Claude (Anthropic) *
                  </label>
                  <input
                    style={inputStyle}
                    type="password"
                    placeholder="sk-ant-api03-..."
                    value={aiApiKey}
                    onChange={(e) => setAiApiKey(e.target.value)}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <label style={labelStyle}>Modelo</label>
                  <select
                    value={aiModel}
                    onChange={(e) => setAiModel(e.target.value)}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    style={{ ...inputStyle, cursor: "pointer", appearance: "auto" as const }}
                  >
                    <option value="claude-sonnet-4-6">Sonnet 4.6 (Rápido)</option>
                    <option value="claude-opus-4-6">Opus 4.6 (Mais capaz)</option>
                    <option value="claude-haiku-4-5-20251001">Haiku 4.5 (Econômico)</option>
                  </select>
                </div>
              </div>

              {/* Include modules toggle */}
              <div
                style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, padding: "14px 18px", background: includeModules ? "rgba(0,144,208,0.06)" : "var(--bg)", borderRadius: 14, border: `1px solid ${includeModules ? "rgba(0,144,208,0.2)" : "var(--border)"}`, cursor: "pointer" }}
                onClick={() => setIncludeModules(!includeModules)}
              >
                <div style={{ width: 22, height: 22, borderRadius: 6, background: includeModules ? "var(--fips-blue)" : "var(--border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s" }}>
                  {includeModules && <Check size={14} color="#fff" />}
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)" }}>Incluir contexto dos 44 módulos</span>
                  <p style={{ fontSize: 12, color: "var(--foreground-muted)", margin: "2px 0 0" }}>A IA entende todo o contexto dos módulos e setores</p>
                </div>
                <BookOpen size={18} style={{ color: includeModules ? "var(--fips-blue)" : "var(--foreground-subtle)", flexShrink: 0 }} />
              </div>

              {/* Include briefing files toggle */}
              {briefingFiles.length > 0 && (
                <div
                  style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, padding: "14px 18px", background: includeBriefingFiles ? "rgba(246,146,30,0.06)" : "var(--bg)", borderRadius: 14, border: `1px solid ${includeBriefingFiles ? "rgba(246,146,30,0.2)" : "var(--border)"}`, cursor: "pointer" }}
                  onClick={() => setIncludeBriefingFiles(!includeBriefingFiles)}
                >
                  <div style={{ width: 22, height: 22, borderRadius: 6, background: includeBriefingFiles ? "var(--primary)" : "var(--border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s" }}>
                    {includeBriefingFiles && <Check size={14} color="#fff" />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)" }}>Incluir briefing anexado como contexto</span>
                    <p style={{ fontSize: 12, color: "var(--foreground-muted)", margin: "2px 0 0" }}>{briefingFiles.length} arquivo(s) serão mencionados no prompt da IA</p>
                  </div>
                  <Upload size={18} style={{ color: includeBriefingFiles ? "var(--primary)" : "var(--foreground-subtle)", flexShrink: 0 }} />
                </div>
              )}

              {/* Git URL */}
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>
                  <GitBranch size={13} style={{ display: "inline", verticalAlign: "-2px", marginRight: 4 }} />
                  Link do Repositório (opcional)
                </label>
                <input
                  style={inputStyle}
                  placeholder="https://github.com/org/repo"
                  value={gitUrl}
                  onChange={(e) => setGitUrl(e.target.value)}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                />
              </div>

              {/* Briefing */}
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>
                  <Brain size={13} style={{ display: "inline", verticalAlign: "-2px", marginRight: 4 }} />
                  Briefing para a IA *
                </label>
                <textarea
                  style={{ ...inputStyle, minHeight: 160, resize: "vertical" }}
                  placeholder={`Descreva o que precisa ser votado. A IA vai gerar itens de votação estruturados.

Exemplos:
- Criar votação para escolher o melhor layout do dashboard
- Votar nas prioridades de implantação para o próximo trimestre
- Decidir entre propostas de redesign da interface`}
                  value={aiBriefing}
                  onChange={(e) => setAiBriefing(e.target.value)}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                />
              </div>

              {/* Generate button */}
              <button
                onClick={handleGenerate}
                disabled={generating || !aiApiKey.trim() || !aiBriefing.trim()}
                style={{
                  background: generating ? "var(--border)" : "linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)",
                  color: "#fff",
                  fontWeight: 600,
                  borderRadius: 14,
                  padding: "14px 28px",
                  border: "none",
                  cursor: generating ? "default" : "pointer",
                  fontSize: 15,
                  fontFamily: "Manrope, sans-serif",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  width: "100%",
                  boxShadow: generating ? "none" : "0 4px 16px rgba(168,85,247,0.3)",
                  opacity: (!aiApiKey.trim() || !aiBriefing.trim()) ? 0.5 : 1,
                }}
              >
                {generating ? (
                  <><Loader2 size={18} className="animate-spin" /> Gerando votações com IA...</>
                ) : (
                  <><Sparkles size={18} /> Gerar Votações com IA</>
                )}
              </button>

              {!aiApiKey && (
                <p style={{ fontSize: 11, color: "var(--foreground-subtle)", marginTop: 8, display: "flex", alignItems: "center", gap: 4 }}>
                  <AlertCircle size={12} />
                  Configure sua API Key acima para usar esta funcionalidade.
                </p>
              )}

              {/* Generated items preview */}
              {generatedItems.length > 0 && (
                <div style={{ marginTop: 24 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                    <Check size={18} style={{ color: "var(--success)" }} />
                    Votações Geradas ({selectedAICount} de {generatedItems.length} selecionadas)
                  </div>

                  <p style={{ fontSize: 12, color: "var(--foreground-subtle)", margin: "0 0 16px", lineHeight: 1.6 }}>
                    Revise as votações geradas. Desmarque as que não quiser incluir no projeto.
                  </p>

                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {generatedItems.map((gi, idx) => (
                      <div
                        key={idx}
                        style={{
                          border: `2px solid ${gi.selected ? "rgba(0,198,76,0.3)" : "var(--border)"}`,
                          borderRadius: 14,
                          padding: 16,
                          background: gi.selected ? "rgba(0,198,76,0.03)" : "var(--bg)",
                          opacity: gi.selected ? 1 : 0.6,
                          transition: "all 0.2s",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
                          <div style={{ display: "flex", gap: 10, alignItems: "flex-start", flex: 1, cursor: "pointer" }} onClick={() => toggleGeneratedItem(idx)}>
                            <div style={{ width: 22, height: 22, borderRadius: 6, background: gi.selected ? "var(--success)" : "var(--border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2, transition: "all 0.2s" }}>
                              {gi.selected && <Check size={14} color="#fff" />}
                            </div>
                            <div>
                              <h4 style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>{gi.title}</h4>
                              {gi.description && (
                                <p style={{ fontSize: 12, color: "var(--foreground-muted)", margin: "4px 0 0", lineHeight: 1.5 }}>{gi.description}</p>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => removeGeneratedItem(idx)}
                            style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--foreground-subtle)" }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        <div style={{ marginLeft: 32, display: "flex", flexDirection: "column", gap: 6 }}>
                          {gi.options.map((opt, optIdx) => (
                            <div key={optIdx} style={{ padding: "8px 12px", background: "var(--bg-card)", borderRadius: 10, border: "1px solid var(--border)" }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--foreground)" }}>{opt.label}</span>
                              <p style={{ fontSize: 11, color: "var(--foreground-muted)", margin: "3px 0 0", lineHeight: 1.5 }}>
                                {opt.content_text.length > 150 ? opt.content_text.slice(0, 150) + "..." : opt.content_text}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ======== CREATE BUTTON ======== */}
        <button
          onClick={handleCreateProject}
          disabled={saving || !canCreate}
          style={{
            background: saving || !canCreate ? "var(--border)" : "linear-gradient(135deg, var(--fips-blue), var(--fips-cyan))",
            color: saving || !canCreate ? "var(--foreground-subtle)" : "#fff",
            fontWeight: 700,
            borderRadius: 16,
            padding: "18px 32px",
            border: "none",
            cursor: saving || !canCreate ? "default" : "pointer",
            fontSize: 16,
            fontFamily: "Manrope, sans-serif",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            width: "100%",
            boxShadow: saving || !canCreate ? "none" : "0 6px 20px rgba(0,144,208,0.3)",
          }}
        >
          {saving ? (
            <><Loader2 size={20} className="animate-spin" /> Criando projeto...</>
          ) : (
            <><FolderOpen size={20} /> Criar Projeto</>
          )}
        </button>
      </div>
    </div>
  );
}
