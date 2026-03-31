"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
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
import LoginScreen from "@/components/LoginScreen";
import {
  Plus,
  Trash2,
  FileText,
  Image,
  Users,
  ArrowLeft,
  Sparkles,
  X,
  CheckSquare,
  List,
  Upload,
  File,
  AlertCircle,
  Brain,
  Settings,
} from "lucide-react";

// ---------- local types ----------

interface LocalOption {
  label: string;
  description: string;
  image_url: string;
}

interface LocalVotingItem {
  title: string;
  description: string;
  type: "single_choice" | "image_select" | "approval";
  max_winners: number;
  options: LocalOption[];
}

interface UploadedFile {
  file: File;
  name: string;
  size: number;
  type: string;
  status: "pending" | "uploading" | "done" | "error";
  url?: string;
  error?: string;
}

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

const primaryBtn: React.CSSProperties = {
  background: "var(--fips-cyan, #3ca9c9)",
  color: "#fff",
  fontWeight: 600,
  borderRadius: 12,
  padding: "12px 24px",
  border: "none",
  cursor: "pointer",
  fontSize: 14,
  fontFamily: "Manrope, sans-serif",
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
};

const secondaryBtn: React.CSSProperties = {
  background: "var(--primary, #f6921e)",
  color: "#fff",
  fontWeight: 600,
  borderRadius: 12,
  padding: "10px 20px",
  border: "none",
  cursor: "pointer",
  fontSize: 14,
  fontFamily: "Manrope, sans-serif",
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
};

const outlineBtn: React.CSSProperties = {
  background: "transparent",
  border: "2px solid var(--border, #e2e8f0)",
  color: "var(--primary, #f6921e)",
  fontWeight: 600,
  borderRadius: 12,
  padding: "10px 20px",
  cursor: "pointer",
  fontSize: 14,
  fontFamily: "Manrope, sans-serif",
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
};

const dangerBtn: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "#ef4444",
  cursor: "pointer",
  padding: 6,
  borderRadius: 8,
  display: "inline-flex",
  alignItems: "center",
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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function getFileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (["jpg", "jpeg", "png", "svg", "gif", "webp"].includes(ext)) return <Image size={18} style={{ color: "#3b82f6" }} />;
  if (["doc", "docx"].includes(ext)) return <FileText size={18} style={{ color: "#2563eb" }} />;
  if (["ppt", "pptx"].includes(ext)) return <FileText size={18} style={{ color: "#ea580c" }} />;
  if (["pdf"].includes(ext)) return <FileText size={18} style={{ color: "#dc2626" }} />;
  if (["xls", "xlsx", "csv"].includes(ext)) return <FileText size={18} style={{ color: "#16a34a" }} />;
  if (["md", "txt", "json"].includes(ext)) return <FileText size={18} style={{ color: "#6b7280" }} />;
  return <File size={18} style={{ color: "var(--foreground-muted)" }} />;
}

// ---------- component ----------

export default function NovoProjetoPage() {
  const { user, loading, supabase } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Project info
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [coverImage, setCoverImage] = useState("");

  // Members
  const [memberEmail, setMemberEmail] = useState("");
  const [members, setMembers] = useState<string[]>([]);

  // Voting items
  const [votingItems, setVotingItems] = useState<LocalVotingItem[]>([]);

  // File uploads
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  // Claude AI
  const [claudeInput, setClaudeInput] = useState("");
  const [aiApiKey, setAiApiKey] = useState("");
  const [aiModel, setAiModel] = useState("claude-sonnet-4-6");
  const [aiGenerating, setAiGenerating] = useState(false);

  // Submitting
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg, #f4f6fb)",
          fontFamily: "Manrope, sans-serif",
        }}
      >
        <p style={{ color: "var(--foreground-muted)" }}>Carregando...</p>
      </div>
    );
  }

  if (!user) return <LoginScreen />;

  const userEmail = user.email || "";
  const userName = user.user_metadata?.full_name || userEmail.split("@")[0];
  const userAvatar = user.user_metadata?.avatar_url || null;

  // ---------- members ----------

  function handleAddMember() {
    const email = memberEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) return;
    if (email === userEmail) return;
    if (members.includes(email)) return;
    setMembers((prev) => [...prev, email]);
    setMemberEmail("");
  }

  function handleRemoveMember(email: string) {
    setMembers((prev) => prev.filter((m) => m !== email));
  }

  // ---------- voting items ----------

  function addVotingItem() {
    setVotingItems((prev) => [
      ...prev,
      { title: "", description: "", type: "single_choice", max_winners: 1, options: [] },
    ]);
  }

  function updateVotingItem(idx: number, field: keyof LocalVotingItem, value: string | number) {
    setVotingItems((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        if (field === "type") {
          return { ...item, type: value as LocalVotingItem["type"], options: [] };
        }
        return { ...item, [field]: value };
      })
    );
  }

  function removeVotingItem(idx: number) {
    setVotingItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function addOption(itemIdx: number) {
    setVotingItems((prev) =>
      prev.map((item, i) =>
        i === itemIdx
          ? { ...item, options: [...item.options, { label: "", description: "", image_url: "" }] }
          : item
      )
    );
  }

  function updateOption(
    itemIdx: number,
    optIdx: number,
    field: keyof LocalOption,
    value: string
  ) {
    setVotingItems((prev) =>
      prev.map((item, i) =>
        i === itemIdx
          ? {
              ...item,
              options: item.options.map((opt, j) =>
                j === optIdx ? { ...opt, [field]: value } : opt
              ),
            }
          : item
      )
    );
  }

  function removeOption(itemIdx: number, optIdx: number) {
    setVotingItems((prev) =>
      prev.map((item, i) =>
        i === itemIdx
          ? { ...item, options: item.options.filter((_, j) => j !== optIdx) }
          : item
      )
    );
  }

  // ---------- file upload ----------

  function handleFilesSelected(files: FileList | null) {
    if (!files) return;

    const newFiles: UploadedFile[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!isAcceptedFile(file.name)) {
        newFiles.push({
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          status: "error",
          error: "Tipo de arquivo não suportado",
        });
        continue;
      }
      if (file.size > 50 * 1024 * 1024) {
        newFiles.push({
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          status: "error",
          error: "Arquivo muito grande (max 50MB)",
        });
        continue;
      }
      newFiles.push({
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        status: "pending",
      });
    }
    setUploadedFiles((prev) => [...prev, ...newFiles]);
  }

  function removeFile(idx: number) {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave() {
    setIsDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    handleFilesSelected(e.dataTransfer.files);
  }

  // ---------- AI generation ----------

  async function handleAiGenerate() {
    if (!aiApiKey.trim() || !claudeInput.trim()) {
      alert("Preencha a API Key e o briefing para gerar com IA.");
      return;
    }

    setAiGenerating(true);
    try {
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
          max_tokens: 4096,
          messages: [
            {
              role: "user",
              content: `Analise este briefing de projeto e gere itens de votação estruturados em JSON.

BRIEFING:
${claudeInput}

Responda APENAS com um JSON válido neste formato (sem markdown, sem explicação):
{
  "items": [
    {
      "title": "Título do item de votação",
      "description": "Descrição breve",
      "type": "single_choice",
      "options": [
        { "label": "Opção A", "description": "Descrição da opção" },
        { "label": "Opção B", "description": "Descrição da opção" }
      ]
    }
  ]
}

Tipos válidos: "single_choice", "image_select", "approval"
Gere entre 3 e 8 itens relevantes baseados no briefing.`,
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

      const newItems: LocalVotingItem[] = parsed.items.map((item: { title?: string; description?: string; type?: string; options?: Array<{ label?: string; description?: string; image_url?: string }> }) => ({
        title: item.title || "",
        description: item.description || "",
        type: (["single_choice", "image_select", "approval"].includes(item.type || "") ? item.type : "single_choice") as LocalVotingItem["type"],
        options: (item.options || []).map((opt: { label?: string; description?: string; image_url?: string }) => ({
          label: opt.label || "",
          description: opt.description || "",
          image_url: opt.image_url || "",
        })),
      }));

      setVotingItems((prev) => [...prev, ...newItems]);
      alert(`${newItems.length} itens de votação gerados com sucesso!`);
    } catch (err) {
      console.error(err);
      alert(`Erro ao gerar com IA: ${err instanceof Error ? err.message : "Erro desconhecido"}`);
    } finally {
      setAiGenerating(false);
    }
  }

  // ---------- submit ----------

  async function handleSubmit() {
    if (!supabase) return;
    if (!name.trim()) {
      alert("Informe o nome do projeto.");
      return;
    }

    setSubmitting(true);

    try {
      // 1. Create project
      const project = await createProject(supabase, {
        name: name.trim(),
        description: description.trim() || null,
        cover_image: coverImage.trim() || null,
        status: "draft",
        created_by_email: userEmail,
        created_by_name: userName,
        created_by_avatar: userAvatar,
      });

      // 2. Add owner
      await addProjectMember(supabase, {
        project_id: project.id,
        user_email: userEmail,
        user_name: userName,
        user_avatar: userAvatar,
        role: "owner",
      });

      // 3. Add members
      for (const email of members) {
        await addProjectMember(supabase, {
          project_id: project.id,
          user_email: email,
          user_name: email.split("@")[0],
          user_avatar: null,
          role: "voter",
        });
      }

      // 4. Create voting items + options
      for (let i = 0; i < votingItems.length; i++) {
        const vi = votingItems[i];
        if (!vi.title.trim()) continue;

        const createdItem = await createVotingItem(supabase, {
          project_id: project.id,
          title: vi.title.trim(),
          description: vi.description.trim() || null,
          type: vi.type,
          position: i,
          max_winners: vi.max_winners || 1,
        });

        for (let j = 0; j < vi.options.length; j++) {
          const opt = vi.options[j];
          if (!opt.label.trim()) continue;

          await createVotingOption(supabase, {
            item_id: createdItem.id,
            project_id: project.id,
            label: opt.label.trim(),
            description: opt.description.trim() || null,
            image_url: opt.image_url.trim() || null,
            position: j,
          });
        }
      }

      // 5. Upload files and create documents
      for (const uf of uploadedFiles) {
        if (uf.status === "error") continue;

        let fileUrl: string | null = null;
        try {
          setUploadedFiles((prev) =>
            prev.map((f) => (f === uf ? { ...f, status: "uploading" as const } : f))
          );
          fileUrl = await uploadFile(supabase, project.id, uf.file);
          setUploadedFiles((prev) =>
            prev.map((f) => (f === uf ? { ...f, status: "done" as const, url: fileUrl! } : f))
          );
        } catch {
          // If storage is not set up, save reference without file URL
          fileUrl = null;
        }

        const ext = uf.name.split(".").pop()?.toLowerCase() || "";
        await createDocument(supabase, {
          project_id: project.id,
          title: uf.name,
          file_url: fileUrl,
          file_type: ext,
          content_md: null,
          uploaded_by_email: userEmail,
          uploaded_by_name: userName,
        });
      }

      router.push("/");
    } catch (err) {
      console.error(err);
      alert("Erro ao criar projeto. Verifique o console.");
    } finally {
      setSubmitting(false);
    }
  }

  // ---------- render helpers ----------

  function renderTypeIcon(type: LocalVotingItem["type"]) {
    switch (type) {
      case "single_choice":
        return <List size={16} />;
      case "image_select":
        return <Image size={16} />;
      case "approval":
        return <CheckSquare size={16} />;
    }
  }

  function renderOptionFields(item: LocalVotingItem, itemIdx: number) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
        {item.options.map((opt, optIdx) => (
          <div
            key={optIdx}
            style={{
              display: "flex",
              gap: 8,
              alignItems: "flex-start",
              background: "var(--bg, #f4f6fb)",
              borderRadius: 12,
              padding: 12,
            }}
          >
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
              <input
                style={inputStyle}
                placeholder="Label da opção"
                value={opt.label}
                onChange={(e) => updateOption(itemIdx, optIdx, "label", e.target.value)}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
              {item.type === "single_choice" && (
                <input
                  style={inputStyle}
                  placeholder="Descrição (opcional)"
                  value={opt.description}
                  onChange={(e) =>
                    updateOption(itemIdx, optIdx, "description", e.target.value)
                  }
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                />
              )}
              {item.type === "image_select" && (
                <input
                  style={inputStyle}
                  placeholder="URL da imagem"
                  value={opt.image_url}
                  onChange={(e) =>
                    updateOption(itemIdx, optIdx, "image_url", e.target.value)
                  }
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                />
              )}
            </div>
            <button style={dangerBtn} onClick={() => removeOption(itemIdx, optIdx)}>
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        <button style={outlineBtn} onClick={() => addOption(itemIdx)}>
          <Plus size={16} /> Adicionar opção
        </button>
      </div>
    );
  }

  // ---------- focus / blur for inputs ----------

  function handleFocus(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    e.currentTarget.style.borderColor = "var(--fips-blue, #0090d0)";
    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,144,208,0.12)";
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    e.currentTarget.style.borderColor = "var(--border, #e2e8f0)";
    e.currentTarget.style.boxShadow = "none";
  }

  // ---------- main render ----------

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg, #f4f6fb)",
        fontFamily: "Manrope, sans-serif",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          background: "var(--bg-card, #ffffff)",
          borderBottom: "1px solid var(--border, #e2e8f0)",
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <button
          onClick={() => router.push("/")}
          style={{
            ...outlineBtn,
            padding: "8px 14px",
          }}
        >
          <ArrowLeft size={18} /> Voltar
        </button>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "var(--foreground)",
            margin: 0,
          }}
        >
          Novo Projeto de Votação
        </h1>
      </div>

      {/* Content */}
      <div
        style={{
          maxWidth: 820,
          margin: "0 auto",
          padding: "32px 20px 80px",
          display: "flex",
          flexDirection: "column",
          gap: 28,
        }}
      >
        {/* -------- Section: Project Info -------- */}
        <div style={cardStyle}>
          <div style={sectionTitle}>
            <FileText size={20} style={{ color: "var(--fips-cyan, #3ca9c9)" }} />
            Informações do Projeto
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={labelStyle}>Nome do Projeto *</label>
              <input
                style={inputStyle}
                placeholder="Ex: Votação de Design Q1 2026"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </div>

            <div>
              <label style={labelStyle}>Descrição</label>
              <textarea
                style={{ ...inputStyle, minHeight: 80, resize: "vertical" }}
                placeholder="Descreva o objetivo deste projeto de votação..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </div>

            <div>
              <label style={labelStyle}>Imagem de Capa (URL, opcional)</label>
              <input
                style={inputStyle}
                placeholder="https://exemplo.com/imagem.jpg"
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </div>
          </div>
        </div>

        {/* -------- Section: Members -------- */}
        <div style={cardStyle}>
          <div style={sectionTitle}>
            <Users size={20} style={{ color: "var(--primary, #f6921e)" }} />
            Membros
          </div>

          {/* Owner badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 16,
              padding: "10px 14px",
              background: "rgba(60, 169, 201, 0.08)",
              borderRadius: 12,
            }}
          >
            {userAvatar && (
              <img
                src={userAvatar}
                alt=""
                style={{ width: 28, height: 28, borderRadius: "50%" }}
              />
            )}
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)" }}>
              {userName}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#fff",
                background: "var(--fips-cyan, #3ca9c9)",
                borderRadius: 6,
                padding: "2px 8px",
                textTransform: "uppercase",
              }}
            >
              Owner
            </span>
            <span
              style={{
                fontSize: 12,
                color: "var(--foreground-subtle, #7b8c96)",
                marginLeft: "auto",
              }}
            >
              {userEmail}
            </span>
          </div>

          {/* Add member input */}
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input
              style={{ ...inputStyle, flex: 1 }}
              placeholder="email@exemplo.com"
              value={memberEmail}
              onChange={(e) => setMemberEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddMember()}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
            <button style={secondaryBtn} onClick={handleAddMember}>
              <Plus size={16} /> Adicionar
            </button>
          </div>

          {/* Member list */}
          {members.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {members.map((email) => (
                <div
                  key={email}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    background: "var(--bg, #f4f6fb)",
                    borderRadius: 10,
                    fontSize: 14,
                    color: "var(--foreground)",
                  }}
                >
                  <span>{email}</span>
                  <button style={dangerBtn} onClick={() => handleRemoveMember(email)}>
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {members.length === 0 && (
            <p
              style={{
                fontSize: 13,
                color: "var(--foreground-subtle, #7b8c96)",
                margin: 0,
              }}
            >
              Adicione os e-mails dos votantes. Eles serao vinculados ao projeto quando fizerem login.
            </p>
          )}
        </div>

        {/* -------- Section: File Upload -------- */}
        <div style={cardStyle}>
          <div style={sectionTitle}>
            <Upload size={20} style={{ color: "var(--fips-blue, #0090d0)" }} />
            Arquivos do Projeto
          </div>

          <p style={{ fontSize: 13, color: "var(--foreground-subtle)", margin: "0 0 16px" }}>
            Faça upload de documentos, apresentações, imagens e outros arquivos.
            Formatos aceitos: DOC, DOCX, PPT, PPTX, PDF, MD, TXT, JPEG, PNG, SVG, GIF, XLS, XLSX, CSV, JSON.
          </p>

          {/* Drop zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: isDragOver ? "2px dashed var(--fips-blue)" : "2px dashed var(--border)",
              borderRadius: 16,
              padding: "40px 24px",
              textAlign: "center",
              cursor: "pointer",
              background: isDragOver ? "rgba(0,144,208,0.04)" : "var(--bg-muted)",
              transition: "all 0.2s",
              marginBottom: uploadedFiles.length > 0 ? 16 : 0,
            }}
          >
            <Upload
              size={32}
              style={{
                color: isDragOver ? "var(--fips-blue)" : "var(--foreground-subtle)",
                marginBottom: 8,
              }}
            />
            <p style={{ fontWeight: 600, fontSize: 14, color: "var(--foreground)", margin: "0 0 4px" }}>
              {isDragOver ? "Solte os arquivos aqui" : "Clique ou arraste arquivos"}
            </p>
            <p style={{ fontSize: 12, color: "var(--foreground-subtle)", margin: 0 }}>
              Máximo 50MB por arquivo
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={getAcceptString()}
              onChange={(e) => handleFilesSelected(e.target.files)}
              style={{ display: "none" }}
            />
          </div>

          {/* File list */}
          {uploadedFiles.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {uploadedFiles.map((uf, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 14px",
                    borderRadius: 12,
                    background: uf.status === "error" ? "rgba(239,68,68,0.06)" : "var(--bg-muted)",
                    border: uf.status === "error" ? "1px solid rgba(239,68,68,0.2)" : "1px solid var(--border)",
                  }}
                >
                  {getFileIcon(uf.name)}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontWeight: 600,
                      fontSize: 13,
                      color: "var(--foreground)",
                      margin: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}>
                      {uf.name}
                    </p>
                    <p style={{ fontSize: 11, color: "var(--foreground-subtle)", margin: 0 }}>
                      {formatFileSize(uf.size)}
                      {uf.status === "error" && (
                        <span style={{ color: "#ef4444", marginLeft: 8 }}>
                          <AlertCircle size={11} style={{ display: "inline", verticalAlign: "-1px", marginRight: 2 }} />
                          {uf.error}
                        </span>
                      )}
                      {uf.status === "uploading" && (
                        <span style={{ color: "var(--fips-blue)", marginLeft: 8 }}>Enviando...</span>
                      )}
                      {uf.status === "done" && (
                        <span style={{ color: "var(--success)", marginLeft: 8 }}>Enviado</span>
                      )}
                    </p>
                  </div>
                  <button style={dangerBtn} onClick={() => removeFile(idx)}>
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* -------- Section: Voting Items -------- */}
        <div style={cardStyle}>
          <div style={sectionTitle}>
            <List size={20} style={{ color: "var(--fips-cyan, #3ca9c9)" }} />
            Itens de Votação
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {votingItems.map((item, idx) => (
              <div
                key={idx}
                style={{
                  border: "1px solid var(--border, #e2e8f0)",
                  borderRadius: 16,
                  padding: 20,
                  background: "var(--bg, #f4f6fb)",
                }}
              >
                {/* Item header */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 12,
                  }}
                >
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "var(--foreground)",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    {renderTypeIcon(item.type)} Item {idx + 1}
                  </span>
                  <button style={dangerBtn} onClick={() => removeVotingItem(idx)}>
                    <Trash2 size={16} />
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <input
                    style={inputStyle}
                    placeholder="Titulo do item (ex: Escolha a imagem do quadrinho)"
                    value={item.title}
                    onChange={(e) => updateVotingItem(idx, "title", e.target.value)}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                  />

                  <input
                    style={inputStyle}
                    placeholder="Descrição (opcional)"
                    value={item.description}
                    onChange={(e) => updateVotingItem(idx, "description", e.target.value)}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                  />

                  <div>
                    <label style={labelStyle}>Tipo de Votação</label>
                    <select
                      value={item.type}
                      onChange={(e) => updateVotingItem(idx, "type", e.target.value)}
                      onFocus={handleFocus}
                      onBlur={handleBlur}
                      style={{
                        ...inputStyle,
                        cursor: "pointer",
                        appearance: "auto" as const,
                      }}
                    >
                      <option value="single_choice">Escolha unica (texto)</option>
                      <option value="image_select">Seleção de imagem</option>
                      <option value="approval">Aprovação (aprovar/rejeitar)</option>
                    </select>
                  </div>

                  {/* Max winners */}
                  <div>
                    <label style={labelStyle}>Quantidade de vencedores</label>
                    <input
                      type="number"
                      min={1}
                      max={item.options.length || 10}
                      value={item.max_winners}
                      onChange={(e) => updateVotingItem(idx, "max_winners", Math.max(1, parseInt(e.target.value) || 1))}
                      onFocus={handleFocus}
                      onBlur={handleBlur}
                      style={{ ...inputStyle, width: 120 }}
                    />
                    <span style={{ fontSize: 11, color: "var(--foreground-subtle, #7b8c96)", marginLeft: 8 }}>
                      Ex: 10 imagens, mas só 1 vencedor
                    </span>
                  </div>

                  {/* Options */}
                  <div>
                    <label style={labelStyle}>Opções</label>
                    {renderOptionFields(item, idx)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            style={{ ...outlineBtn, marginTop: votingItems.length > 0 ? 16 : 0 }}
            onClick={addVotingItem}
          >
            <Plus size={16} /> Adicionar item de votação
          </button>
        </div>

        {/* -------- Section: AI Dashboard -------- */}
        <div style={cardStyle}>
          <div style={sectionTitle}>
            <Brain size={20} style={{ color: "#a855f7" }} />
            Dashboard IA — Gerar Escopo com Claude
          </div>

          <p
            style={{
              fontSize: 13,
              color: "var(--foreground-subtle, #7b8c96)",
              margin: "0 0 20px",
              lineHeight: 1.6,
            }}
          >
            Conecte sua API Key do Claude para gerar automaticamente itens de votação
            a partir do briefing do projeto. A IA analisa o conteúdo e cria sugestões
            de votação estruturadas.
          </p>

          {/* API Config */}
          <div
            style={{
              background: "linear-gradient(135deg, rgba(168,85,247,0.06) 0%, rgba(168,85,247,0.02) 100%)",
              border: "1px solid rgba(168,85,247,0.15)",
              borderRadius: 16,
              padding: 20,
              marginBottom: 20,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <Settings size={16} style={{ color: "#a855f7" }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)" }}>
                Configuração da API
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={labelStyle}>API Key do Claude (Anthropic)</label>
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

              <div>
                <label style={labelStyle}>Modelo</label>
                <select
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  style={{ ...inputStyle, cursor: "pointer", appearance: "auto" as const }}
                >
                  <option value="claude-sonnet-4-6">Claude Sonnet 4.6 (Rápido)</option>
                  <option value="claude-opus-4-6">Claude Opus 4.6 (Mais capaz)</option>
                  <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5 (Econômico)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Briefing input */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Briefing do Projeto</label>
            <textarea
              style={{ ...inputStyle, minHeight: 160, resize: "vertical" }}
              placeholder="Cole aqui o briefing, escopo ou descrição do projeto. A IA irá analisar e gerar itens de votação automaticamente...

Exemplo:
- Precisamos decidir a paleta de cores do novo site
- Escolher entre 3 layouts para a homepage
- Aprovar ou rejeitar o novo logotipo
- Decidir a tipografia principal"
              value={claudeInput}
              onChange={(e) => setClaudeInput(e.target.value)}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>

          <button
            style={{
              ...secondaryBtn,
              background: "linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)",
              boxShadow: "0 4px 16px rgba(168,85,247,0.3)",
              opacity: aiGenerating ? 0.6 : 1,
              pointerEvents: aiGenerating ? "none" : "auto",
            }}
            onClick={handleAiGenerate}
            disabled={aiGenerating}
          >
            <Sparkles size={16} />
            {aiGenerating ? "Gerando..." : "Gerar Itens de Votação com IA"}
          </button>

          {!aiApiKey && (
            <p style={{ fontSize: 11, color: "var(--foreground-subtle)", marginTop: 8, display: "flex", alignItems: "center", gap: 4 }}>
              <AlertCircle size={12} />
              Configure sua API Key acima para usar esta funcionalidade.
            </p>
          )}
        </div>

        {/* -------- Submit -------- */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
          <button style={outlineBtn} onClick={() => router.push("/")}>
            Cancelar
          </button>
          <button
            style={{
              ...primaryBtn,
              opacity: submitting ? 0.6 : 1,
              pointerEvents: submitting ? "none" : "auto",
            }}
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? "Criando..." : "Criar Projeto"}
          </button>
        </div>
      </div>
    </div>
  );
}
