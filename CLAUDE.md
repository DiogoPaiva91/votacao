@AGENTS.md

# Votacao FIPS - Centro de Aprovacao de Projetos

## O que e FIPS
Plataforma interna de votacao e aprovacao de projetos. Permite que gestores votem em opcoes, aprovem documentos e registrem decisoes de forma organizada. O sistema e usado para a apresentacao "3 Atos":
- **ATO 1 - O Caos**: 44 modulos mostrando problemas que existiam antes do FIPS (8 setores)
- **ATO 2 - O FIPS**: Solucoes implementadas pelo FIPS para cada modulo
- **ATO 3 - Resultados**: Metricas e resultados alcancados

## Stack
- Next.js 16.2.1 (App Router, Turbopack)
- React 19, TypeScript
- Tailwind CSS v4 + CSS variables
- Supabase (Auth Google OAuth, PostgreSQL, Storage bucket: `project-files`)
- Framer Motion 12.x, Lucide React icons
- Manrope font (Google Fonts)

## Deploy
- Vercel: `votacao-fips.vercel.app`
- Supabase ref: `tsldyoygmcqlmqwqkjml`
- Dev: `npx next dev`

## Design System
- Primary/Orange: `#f6921e`
- FIPS Blue: `#0090d0`
- FIPS Cyan: `#3ca9c9`
- Success: `#00c64c`
- Error: `#ef4444`
- Background: `#f4f6fb`
- Glassmorphism: `rgba(255,255,255,0.92)` + `backdrop-filter: blur(14px)`
- Cards: `borderRadius: 20px`, sombras suaves
- Inline styles com CSS variables (nao usa CSS modules)

## Banco de Dados

### Tabelas principais (votacao)
- `projects` — Projetos com status (draft/voting/finalized/archived)
- `project_members` — Membros e roles (owner/voter), tracking de finalizacao
- `voting_items` — Itens de votacao dentro de projetos (single_choice/image_select/approval)
- `voting_options` — Opcoes de cada item com label, description, image_url
- `votes` — Votos (1 por item por usuario, com suporte a desempate)
- `tiebreaker_rounds` — Rodadas de desempate
- `documents` — Documentos anexados a projetos (project_id NOT NULL)

### Tabelas acervo (portfolio)
- `acervo_items` — Items do portfolio (mode: registro/votacao, status: active/voting/resolved)
- `acervo_options` — Opcoes/arquivos de cada item (file_url nullable, content_text para texto inline)
- `acervo_likes` — Likes em items de registro
- `acervo_votes` — Votos em items de votacao

## Estrutura de Arquivos
```
src/
  app/
    page.tsx              — Dashboard Kanban (drag-and-drop, 4 colunas)
    projeto/[id]/page.tsx — Interface de votacao detalhada
    projeto/novo/page.tsx — Criar novo projeto
    vencedores/page.tsx   — Resultados e vencedores
    acervo/page.tsx       — Portfolio de trabalhos
    acervo/[id]/page.tsx  — Detalhe de item do acervo
    layout.tsx            — Root layout com AuthProvider
  components/
    Header.tsx            — Navegacao + usuario
    LoginScreen.tsx       — Tela de login Google
  data/
    modulosCaos.ts        — 44 modulos do ATO 1 (3 exemplos cada)
  lib/
    supabase.ts           — Todas operacoes de banco + acervo
    auth.tsx              — Context de auth (Supabase Google OAuth)
    seed-ato1.ts          — Seed do projeto ATO 1 com 44 modulos
    seed-acervo-ato1.ts   — Seed do acervo com 44 modulos
    acervo-schema.sql     — Schema SQL de referencia
```

## Convencoes
- Todos os components sao `"use client"` (client-side rendering)
- Estilos inline com CSS variables (`var(--primary)`, `var(--bg-card)`, etc.)
- Icones do lucide-react
- Idioma: Portugues (pt-BR) na interface
- RLS publico em todas tabelas (todos sao admin)
- Storage path: `acervo/{timestamp}_{random}.{ext}` ou `{projectId}/{timestamp}_{random}.{ext}`
