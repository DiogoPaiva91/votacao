-- MIGRATION V3: max_voters on projects + winner tracking on voting_items
ALTER TABLE projects ADD COLUMN IF NOT EXISTS max_voters INTEGER NOT NULL DEFAULT 3;
ALTER TABLE voting_items ADD COLUMN IF NOT EXISTS winner_option_id UUID REFERENCES voting_options(id);
