-- =============================================
-- ACERVO FIPS - Portfólio + Votação de Mídia
-- Execute no Supabase SQL Editor
-- =============================================

-- Item do acervo (um tópico - pode ser registro ou votação)
CREATE TABLE acervo_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  mode TEXT NOT NULL DEFAULT 'registro' CHECK (mode IN ('registro', 'votacao')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'voting', 'resolved')),
  winner_option_id UUID,
  uploaded_by_email TEXT NOT NULL,
  uploaded_by_name TEXT NOT NULL,
  uploaded_by_avatar TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Opções/arquivos de cada item (1 para registro, 2+ para votação)
CREATE TABLE acervo_options (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES acervo_items(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Likes (para modo registro)
CREATE TABLE acervo_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES acervo_items(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(item_id, user_email)
);

-- Votos (para modo votação)
CREATE TABLE acervo_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES acervo_items(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES acervo_options(id) ON DELETE CASCADE,
  voter_email TEXT NOT NULL,
  voter_name TEXT NOT NULL,
  voter_avatar TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(item_id, voter_email)
);

-- Índices
CREATE INDEX idx_acervo_options_item ON acervo_options(item_id);
CREATE INDEX idx_acervo_likes_item ON acervo_likes(item_id);
CREATE INDEX idx_acervo_votes_item ON acervo_votes(item_id);

-- RLS (tudo público - todos admin)
ALTER TABLE acervo_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE acervo_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE acervo_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE acervo_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_all" ON acervo_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON acervo_options FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON acervo_likes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON acervo_votes FOR ALL USING (true) WITH CHECK (true);
