-- =============================================
-- MIGRATION V2: max_winners + tiebreaker_rounds
-- Execute no Supabase SQL Editor
-- =============================================

-- 1. Adicionar max_winners aos voting_items
ALTER TABLE voting_items ADD COLUMN IF NOT EXISTS max_winners INTEGER NOT NULL DEFAULT 1;

-- 2. Tabela de rodadas de desempate
CREATE TABLE IF NOT EXISTS tiebreaker_rounds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  original_item_id UUID NOT NULL REFERENCES voting_items(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'voting' CHECK (status IN ('voting', 'resolved')),
  tied_option_ids TEXT[] NOT NULL,
  winner_option_id UUID REFERENCES voting_options(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Adicionar round_id aos votos (para votos de desempate)
ALTER TABLE votes ADD COLUMN IF NOT EXISTS tiebreaker_round_id UUID REFERENCES tiebreaker_rounds(id);

-- 4. RLS e indices
ALTER TABLE tiebreaker_rounds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_all" ON tiebreaker_rounds FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_tiebreaker_project ON tiebreaker_rounds(project_id);
CREATE INDEX IF NOT EXISTS idx_tiebreaker_item ON tiebreaker_rounds(original_item_id);
