"use client";

import { useAuth } from "@/lib/auth";
import { useState } from "react";
import Logo3D from "./Logo3D";

export default function LoginScreen() {
  const { signInWithGoogle, loading } = useAuth();
  const [btnHover, setBtnHover] = useState(false);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        position: "relative",
        overflow: "hidden",
        background: "var(--gradient-hero)",
      }}
    >
      {/* Decorative circles */}
      <div
        style={{
          position: "absolute",
          top: -80,
          right: -80,
          width: 320,
          height: 320,
          borderRadius: "50%",
          opacity: 0.07,
          background: "#fff",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -128,
          left: -64,
          width: 384,
          height: 384,
          borderRadius: "50%",
          opacity: 0.07,
          background: "#fff",
        }}
      />

      {/* Card */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 400,
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          animation: "loginCardAppear 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        }}
      >
        {/* 3D Logo - floating above card */}
        <div
          style={{
            position: "relative",
            marginBottom: -36,
            zIndex: 20,
          }}
        >
          <Logo3D size={80} />
        </div>

        {/* Glass Card Body */}
        <div
          style={{
            width: "100%",
            padding: "52px 28px 28px",
            background: "rgba(255, 255, 255, 0.1)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(255, 255, 255, 0.18)",
            borderRadius: 24,
            boxShadow:
              "0 25px 60px -12px rgba(0,0,0,0.35), " +
              "inset 0 1px 0 rgba(255,255,255,0.2), " +
              "inset 0 -1px 0 rgba(255,255,255,0.05)",
          }}
        >
          {/* Title */}
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <h1
              style={{
                fontSize: 26,
                fontWeight: 800,
                letterSpacing: "-0.02em",
                color: "#fff",
                margin: 0,
                textShadow: "0 2px 8px rgba(0,0,0,0.15)",
              }}
            >
              Votação
            </h1>
            <p
              style={{
                fontSize: 13,
                marginTop: 6,
                fontWeight: 500,
                color: "rgba(255, 255, 255, 0.55)",
              }}
            >
              Centro de Aprovação de Projetos
            </p>
          </div>

          {/* Divider */}
          <div
            style={{
              height: 1,
              marginBottom: 14,
              background:
                "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)",
            }}
          />

          {/* Description */}
          <div
            style={{
              borderRadius: 14,
              padding: 14,
              marginBottom: 20,
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <p
              style={{
                fontSize: 12,
                lineHeight: 1.7,
                textAlign: "center",
                color: "rgba(255, 255, 255, 0.5)",
                margin: 0,
              }}
            >
              Faça login com seu Google para acessar a plataforma de votação.
              Crie projetos, adicione itens para aprovação e acompanhe as decisões
              dos gestores em tempo real.
            </p>
          </div>

          {/* Google Login Button */}
          <button
            onClick={signInWithGoogle}
            disabled={loading}
            onMouseEnter={() => setBtnHover(true)}
            onMouseLeave={() => setBtnHover(false)}
            style={{
              position: "relative",
              overflow: "hidden",
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              padding: "14px 24px",
              fontSize: 14,
              fontWeight: 600,
              fontFamily: "inherit",
              cursor: "pointer",
              borderRadius: 14,
              background: btnHover
                ? "rgba(255, 255, 255, 0.95)"
                : "rgba(255, 255, 255, 0.9)",
              border: "none",
              color: "#333",
              transform: btnHover ? "translateY(-2px)" : "translateY(0)",
              boxShadow: btnHover
                ? "0 12px 28px -4px rgba(0, 0, 0, 0.25), inset 0 -2px 0 rgba(0,0,0,0.05)"
                : "0 4px 12px -2px rgba(0, 0, 0, 0.15), inset 0 -2px 0 rgba(0,0,0,0.04)",
              transition: "all 0.25s cubic-bezier(0.33, 1, 0.68, 1)",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            {loading ? "Carregando..." : "Entrar com Google"}
          </button>

          {/* Footer */}
          <p
            style={{
              textAlign: "center",
              fontSize: 10,
              marginTop: 20,
              fontWeight: 500,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "rgba(255, 255, 255, 0.25)",
            }}
          >
            Projetos &bull; Votação &bull; Aprovação em tempo real
          </p>
        </div>
      </div>
    </div>
  );
}
