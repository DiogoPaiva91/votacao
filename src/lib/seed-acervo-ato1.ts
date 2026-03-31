import type { SupabaseClient } from '@supabase/supabase-js';
import { modulosCaos } from '@/data/modulosCaos';

let seedInProgress = false;

export async function seedAcervoAto1(
  sb: SupabaseClient,
  userEmail: string,
  userName: string,
): Promise<boolean> {
  if (seedInProgress) return false;
  seedInProgress = true;

  try {
    return await _doSeed(sb, userEmail, userName);
  } finally {
    seedInProgress = false;
  }
}

async function _doSeed(
  sb: SupabaseClient,
  userEmail: string,
  userName: string,
): Promise<boolean> {
  // Check if already seeded (first module title)
  const { data: existing } = await sb
    .from('acervo_items')
    .select('id')
    .eq('title', `ATO 1 — ${modulosCaos[0].name}`)
    .limit(1);

  if (existing && existing.length > 0) return false;

  // Insert 44 acervo items (one per module) with 3 text options each
  for (const modulo of modulosCaos) {
    const { data: item, error: itemErr } = await sb
      .from('acervo_items')
      .insert({
        title: `ATO 1 — ${modulo.name}`,
        description: `${modulo.sector} — Escolha o exemplo mais representativo do caos que existia antes do FIPS`,
        mode: 'votacao',
        status: 'voting',
        uploaded_by_email: userEmail,
        uploaded_by_name: userName,
      })
      .select()
      .single();

    if (itemErr || !item) {
      console.error(`Failed to seed acervo item ${modulo.name}:`, itemErr);
      continue;
    }

    const options = modulo.examples.map((ex, idx) => ({
      item_id: item.id,
      label: ex.title,
      content_text: ex.description,
      file_url: null,
      file_type: null,
      position: idx,
    }));

    const { error: optErr } = await sb.from('acervo_options').insert(options);
    if (optErr) {
      console.error(`Failed to seed options for ${modulo.name}:`, optErr);
    }
  }

  console.log('Acervo ATO 1 seeded: 44 items with 132 text options');
  return true;
}
