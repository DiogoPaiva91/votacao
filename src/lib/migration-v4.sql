-- MIGRATION V4: required_winners per project
-- Quantos itens vencedores o projeto precisa selecionar

ALTER TABLE projects ADD COLUMN IF NOT EXISTS required_winners INTEGER NOT NULL DEFAULT 1;
