import type { SupabaseClient } from '@supabase/supabase-js';
import { modulosCaos } from '@/data/modulosCaos';

export async function seedAto1Project(
  sb: SupabaseClient,
  userEmail: string,
  userName: string,
  userAvatar: string | null,
): Promise<boolean> {
  // Check if already exists
  const { data: existing } = await sb
    .from('projects')
    .select('id')
    .eq('name', 'ATO 1 - O Caos')
    .limit(1);

  if (existing && existing.length > 0) return false;

  // 1. Create project
  const { data: project, error: projErr } = await sb
    .from('projects')
    .insert({
      name: 'ATO 1 - O Caos',
      description:
        'Votação dos 44 módulos do ATO 1 - O Caos. Para cada módulo, escolha o exemplo mais representativo do caos que existia antes do FIPS.',
      status: 'voting',
      created_by_email: userEmail,
      created_by_name: userName,
      created_by_avatar: userAvatar,
    })
    .select()
    .single();

  if (projErr || !project) {
    console.error('Failed to seed ATO 1 project:', projErr);
    return false;
  }

  // 2. Add owner as member
  await sb.from('project_members').insert({
    project_id: project.id,
    user_email: userEmail,
    user_name: userName,
    user_avatar: userAvatar,
    role: 'owner',
  });

  // 3. Insert 44 voting items + 132 options
  for (let i = 0; i < modulosCaos.length; i++) {
    const modulo = modulosCaos[i];

    const { data: item, error: itemErr } = await sb
      .from('voting_items')
      .insert({
        project_id: project.id,
        title: modulo.name,
        description: `${modulo.sector} — Escolha o exemplo mais representativo do caos`,
        type: 'single_choice',
        position: i,
        max_winners: 1,
      })
      .select()
      .single();

    if (itemErr || !item) {
      console.error(`Failed to create voting item ${modulo.name}:`, itemErr);
      continue;
    }

    const optionsToInsert = modulo.examples.map((ex, j) => ({
      item_id: item.id,
      project_id: project.id,
      label: ex.title,
      description: ex.description,
      position: j,
    }));

    const { error: optErr } = await sb.from('voting_options').insert(optionsToInsert);
    if (optErr) {
      console.error(`Failed to create options for ${modulo.name}:`, optErr);
    }
  }

  return true;
}
