"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RedirectToAcervoVencedores() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/acervo?tab=vencedores");
  }, [router]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg, #f4f6fb)" }}>
      <p style={{ fontSize: 14, color: "var(--foreground-muted)" }}>Redirecionando...</p>
    </div>
  );
}
