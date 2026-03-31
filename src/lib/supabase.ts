import type { SupabaseClient } from '@supabase/supabase-js';

// ==================== TYPES ====================

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: 'draft' | 'voting' | 'finalized' | 'archived';
  cover_image: string | null;
  max_voters: number;
  required_winners: number;
  created_by_email: string;
  created_by_name: string;
  created_by_avatar: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_email: string;
  user_name: string;
  user_avatar: string | null;
  role: 'owner' | 'voter';
  has_finalized: boolean;
  finalized_at: string | null;
  created_at: string;
}

export interface VotingItem {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  type: 'single_choice' | 'image_select' | 'approval';
  position: number;
  max_winners: number;
  winner_option_id: string | null;
  created_at: string;
}

export interface VotingOption {
  id: string;
  item_id: string;
  project_id: string;
  label: string;
  description: string | null;
  image_url: string | null;
  file_url: string | null;
  file_type: string | null;
  position: number;
  created_at: string;
}

export interface Vote {
  id: string;
  option_id: string;
  item_id: string;
  project_id: string;
  voter_email: string;
  voter_name: string;
  voter_avatar: string | null;
  tiebreaker_round_id: string | null;
  created_at: string;
}

export interface TiebreakerRound {
  id: string;
  project_id: string;
  original_item_id: string;
  round_number: number;
  status: 'voting' | 'resolved';
  tied_option_ids: string[];
  winner_option_id: string | null;
  created_at: string;
}

export interface WinnerResult {
  item: VotingItem;
  winners: Array<{ option: VotingOption; voteCount: number }>;
  totalVotes: number;
  isTied: boolean;
  tiedOptions: VotingOption[];
  tiebreakerRound: TiebreakerRound | null;
}

export interface Document {
  id: string;
  project_id: string;
  title: string;
  file_url: string | null;
  file_type: string | null;
  content_md: string | null;
  uploaded_by_email: string;
  uploaded_by_name: string;
  created_at: string;
}

// ==================== PROJECTS ====================

export async function getProjects(sb: SupabaseClient) {
  const { data, error } = await sb.from('projects').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data as Project[];
}

export async function getProject(sb: SupabaseClient, id: string) {
  const { data, error } = await sb.from('projects').select('*').eq('id', id).single();
  if (error) throw error;
  return data as Project;
}

export async function createProject(sb: SupabaseClient, project: Partial<Project>) {
  const { data, error } = await sb.from('projects').insert(project).select().single();
  if (error) throw error;
  return data as Project;
}

export async function updateProjectStatus(sb: SupabaseClient, id: string, status: Project['status']) {
  const { error } = await sb.from('projects').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

// ==================== MEMBERS ====================

export async function getProjectMembers(sb: SupabaseClient, projectId: string) {
  const { data, error } = await sb.from('project_members').select('*').eq('project_id', projectId);
  if (error) throw error;
  return data as ProjectMember[];
}

export async function addProjectMember(sb: SupabaseClient, member: Partial<ProjectMember>) {
  const { data, error } = await sb.from('project_members').upsert(member, { onConflict: 'project_id,user_email' }).select().single();
  if (error) throw error;
  return data as ProjectMember;
}

export async function finalizeMemberVote(sb: SupabaseClient, projectId: string, email: string) {
  const { error } = await sb.from('project_members')
    .update({ has_finalized: true, finalized_at: new Date().toISOString() })
    .eq('project_id', projectId)
    .eq('user_email', email);
  if (error) throw error;
}

// ==================== VOTING ITEMS ====================

export async function getVotingItems(sb: SupabaseClient, projectId: string) {
  const { data, error } = await sb.from('voting_items').select('*').eq('project_id', projectId).order('position');
  if (error) throw error;
  return data as VotingItem[];
}

export async function createVotingItem(sb: SupabaseClient, item: Partial<VotingItem>) {
  const { data, error } = await sb.from('voting_items').insert(item).select().single();
  if (error) throw error;
  return data as VotingItem;
}

// ==================== VOTING OPTIONS ====================

export async function getVotingOptions(sb: SupabaseClient, projectId: string) {
  const { data, error } = await sb.from('voting_options').select('*').eq('project_id', projectId).order('position');
  if (error) throw error;
  return data as VotingOption[];
}

export async function createVotingOption(sb: SupabaseClient, option: Partial<VotingOption>) {
  const { data, error } = await sb.from('voting_options').insert(option).select().single();
  if (error) throw error;
  return data as VotingOption;
}

// ==================== VOTES ====================

export async function getProjectVotes(sb: SupabaseClient, projectId: string) {
  const { data, error } = await sb.from('votes').select('*').eq('project_id', projectId).order('created_at', { ascending: false });
  if (error) throw error;
  return data as Vote[];
}

export async function submitVote(sb: SupabaseClient, vote: Omit<Vote, 'id' | 'created_at' | 'tiebreaker_round_id'>) {
  const { data, error } = await sb.from('votes')
    .upsert(vote, { onConflict: 'item_id,voter_email' })
    .select().single();
  if (error) throw error;
  return data as Vote;
}

// ==================== DOCUMENTS ====================

export async function getProjectDocuments(sb: SupabaseClient, projectId: string) {
  const { data, error } = await sb.from('documents').select('*').eq('project_id', projectId).order('created_at', { ascending: false });
  if (error) throw error;
  return data as Document[];
}

export async function createDocument(sb: SupabaseClient, doc: Partial<Document>) {
  const { data, error } = await sb.from('documents').insert(doc).select().single();
  if (error) throw error;
  return data as Document;
}

// ==================== FILE UPLOAD ====================

const ACCEPTED_EXTENSIONS = [
  '.doc', '.docx', '.ppt', '.pptx', '.pdf', '.md', '.txt',
  '.jpeg', '.jpg', '.png', '.svg', '.gif', '.webp',
  '.xls', '.xlsx', '.csv', '.json',
];

export function isAcceptedFile(filename: string): boolean {
  const ext = '.' + filename.split('.').pop()?.toLowerCase();
  return ACCEPTED_EXTENSIONS.includes(ext);
}

export function getAcceptString(): string {
  return ACCEPTED_EXTENSIONS.join(',');
}

export async function uploadFile(sb: SupabaseClient, projectId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
  const safeName = `${projectId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await sb.storage.from('project-files').upload(safeName, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;

  const { data } = sb.storage.from('project-files').getPublicUrl(safeName);
  return data.publicUrl;
}

// ==================== WINNERS / RESULTS ====================

export async function getWinningOptions(sb: SupabaseClient, projectId: string): Promise<WinnerResult[]> {
  const [items, options, allVotes, tiebreakerRounds] = await Promise.all([
    getVotingItems(sb, projectId),
    getVotingOptions(sb, projectId),
    getProjectVotes(sb, projectId),
    getTiebreakerRounds(sb, projectId),
  ]);

  const results: WinnerResult[] = [];

  for (const item of items) {
    const itemOpts = options.filter(o => o.item_id === item.id);
    const itemVotes = allVotes.filter(v => v.item_id === item.id && !v.tiebreaker_round_id);
    const maxWinners = item.max_winners || 1;

    // Count votes per option
    const voteCounts: Array<{ option: VotingOption; count: number }> = itemOpts.map(opt => ({
      option: opt,
      count: itemVotes.filter(v => v.option_id === opt.id).length,
    }));

    // Sort by count descending
    voteCounts.sort((a, b) => b.count - a.count);

    // Get top N winners
    const topWinners = voteCounts.slice(0, maxWinners).filter(w => w.count > 0);

    // Check for ties at the cutoff point
    const cutoffCount = topWinners.length > 0 ? topWinners[topWinners.length - 1].count : 0;
    const tiedAtCutoff = voteCounts.filter(w => w.count === cutoffCount && w.count > 0);
    const isTied = tiedAtCutoff.length > maxWinners - (topWinners.filter(w => w.count > cutoffCount).length);

    // Check if there's an active tiebreaker round
    const activeRound = tiebreakerRounds.find(
      r => r.original_item_id === item.id && r.status === 'voting'
    );
    const resolvedRound = tiebreakerRounds.find(
      r => r.original_item_id === item.id && r.status === 'resolved'
    );

    // If tiebreaker resolved, use its winner
    let finalWinners = topWinners.map(w => ({ option: w.option, voteCount: w.count }));
    if (resolvedRound && resolvedRound.winner_option_id) {
      const tiedOpts = tiedAtCutoff.map(w => w.option);
      const resolvedWinner = tiedOpts.find(o => o.id === resolvedRound.winner_option_id);
      if (resolvedWinner) {
        // Replace tied options with the resolved winner
        finalWinners = voteCounts
          .filter(w => w.count > cutoffCount)
          .map(w => ({ option: w.option, voteCount: w.count }));
        const resolvedEntry = voteCounts.find(w => w.option.id === resolvedRound.winner_option_id);
        if (resolvedEntry) {
          finalWinners.push({ option: resolvedEntry.option, voteCount: resolvedEntry.count });
        }
      }
    }

    results.push({
      item,
      winners: finalWinners,
      totalVotes: itemVotes.length,
      isTied: isTied && !resolvedRound,
      tiedOptions: isTied ? tiedAtCutoff.map(w => w.option) : [],
      tiebreakerRound: activeRound || resolvedRound || null,
    });
  }

  return results;
}

export async function getProjectTopWinners(
  sb: SupabaseClient,
  projectId: string,
): Promise<WinnerResult[]> {
  const project = await getProject(sb, projectId);
  const results = await getWinningOptions(sb, projectId);
  const requiredWinners = project?.required_winners || 1;

  // Rank resolved items by winner vote count (higher = stronger consensus)
  const resolved = results
    .filter(r => r.winners.length > 0 && !r.isTied)
    .sort((a, b) => {
      const aVotes = a.winners[0]?.voteCount || 0;
      const bVotes = b.winners[0]?.voteCount || 0;
      return bVotes - aVotes;
    });

  return resolved.slice(0, requiredWinners);
}

// ==================== TIEBREAKER ====================

export async function getTiebreakerRounds(sb: SupabaseClient, projectId: string) {
  const { data, error } = await sb.from('tiebreaker_rounds')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });
  if (error) return [] as TiebreakerRound[];
  return data as TiebreakerRound[];
}

export async function createTiebreakerRound(
  sb: SupabaseClient,
  projectId: string,
  originalItemId: string,
  tiedOptionIds: string[],
  roundNumber: number = 1,
) {
  const { data, error } = await sb.from('tiebreaker_rounds').insert({
    project_id: projectId,
    original_item_id: originalItemId,
    round_number: roundNumber,
    status: 'voting',
    tied_option_ids: tiedOptionIds,
  }).select().single();
  if (error) throw error;
  return data as TiebreakerRound;
}

export async function submitTiebreakerVote(
  sb: SupabaseClient,
  vote: Omit<Vote, 'id' | 'created_at'>,
) {
  const { data, error } = await sb.from('votes')
    .upsert(vote, { onConflict: 'item_id,voter_email' })
    .select().single();
  if (error) throw error;
  return data as Vote;
}

export async function resolveTiebreakerRound(
  sb: SupabaseClient,
  roundId: string,
  winnerOptionId: string,
) {
  const { error } = await sb.from('tiebreaker_rounds')
    .update({ status: 'resolved', winner_option_id: winnerOptionId })
    .eq('id', roundId);
  if (error) throw error;
}

export async function detectTies(sb: SupabaseClient, projectId: string) {
  const results = await getWinningOptions(sb, projectId);
  return results.filter(r => r.isTied);
}

export async function getVotersByOption(sb: SupabaseClient, projectId: string) {
  const votes = await getProjectVotes(sb, projectId);
  const map: Record<string, Vote[]> = {};
  votes.forEach(v => {
    if (!map[v.option_id]) map[v.option_id] = [];
    map[v.option_id].push(v);
  });
  return map;
}

export async function clearProjectVotes(sb: SupabaseClient, projectId: string) {
  // 1. Delete tiebreaker rounds
  await sb.from('tiebreaker_rounds').delete().eq('project_id', projectId);
  // 2. Delete all votes
  await sb.from('votes').delete().eq('project_id', projectId);
  // 3. Reset member finalization
  const { error } = await sb.from('project_members')
    .update({ has_finalized: false, finalized_at: null })
    .eq('project_id', projectId);
  if (error) throw error;
  // 4. Set project back to voting
  await sb.from('projects')
    .update({ status: 'voting', updated_at: new Date().toISOString() })
    .eq('id', projectId);
}

// ==================== FINALIZE / FORCE CLOSE ====================

export async function finalizeProject(sb: SupabaseClient, projectId: string): Promise<'finalized' | 'tiebreaker'> {
  // 1. Calculate winners and detect ties
  const results = await getWinningOptions(sb, projectId);
  const ties = results.filter(r => r.isTied);

  // 2. If there are ties, create tiebreaker rounds and move to Desempate
  if (ties.length > 0) {
    for (const tie of ties) {
      const tiedIds = tie.tiedOptions.map(o => o.id);
      await createTiebreakerRound(sb, projectId, tie.item.id, tiedIds);
    }
    // Save winners for non-tied items
    for (const r of results) {
      if (!r.isTied && r.winners.length > 0) {
        await sb.from('voting_items')
          .update({ winner_option_id: r.winners[0].option.id })
          .eq('id', r.item.id);
      }
    }
    await updateProjectStatus(sb, projectId, 'archived');
    return 'tiebreaker';
  }

  // 3. No ties — store winner_option_id on each voting_item and finalize
  for (const r of results) {
    if (r.winners.length > 0) {
      await sb.from('voting_items')
        .update({ winner_option_id: r.winners[0].option.id })
        .eq('id', r.item.id);
    }
  }
  await updateProjectStatus(sb, projectId, 'finalized');
  return 'finalized';
}

export async function forceCloseVoting(sb: SupabaseClient, projectId: string): Promise<'finalized' | 'tiebreaker'> {
  // Mark all non-finalized members as finalized
  await sb.from('project_members')
    .update({ has_finalized: true, finalized_at: new Date().toISOString() })
    .eq('project_id', projectId)
    .eq('has_finalized', false);

  return finalizeProject(sb, projectId);
}

export async function deleteProject(sb: SupabaseClient, projectId: string) {
  await sb.from('votes').delete().eq('project_id', projectId);
  await sb.from('tiebreaker_rounds').delete().eq('project_id', projectId);
  await sb.from('voting_options').delete().eq('project_id', projectId);
  await sb.from('voting_items').delete().eq('project_id', projectId);
  await sb.from('documents').delete().eq('project_id', projectId);
  await sb.from('project_members').delete().eq('project_id', projectId);
  const { error } = await sb.from('projects').delete().eq('id', projectId);
  if (error) throw error;
}

export async function getFinalizedProjects(sb: SupabaseClient) {
  const { data, error } = await sb.from('projects')
    .select('*')
    .eq('status', 'finalized')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data as Project[];
}

// ==================== ACERVO ====================

export interface AcervoItem {
  id: string;
  title: string;
  description: string | null;
  mode: 'registro' | 'votacao';
  status: 'active' | 'voting' | 'resolved';
  winner_option_id: string | null;
  uploaded_by_email: string;
  uploaded_by_name: string;
  uploaded_by_avatar: string | null;
  created_at: string;
}

export interface AcervoOption {
  id: string;
  item_id: string;
  label: string;
  file_url: string | null;
  file_type: string | null;
  content_text: string | null;
  position: number;
  created_at: string;
}

export interface AcervoLike {
  id: string;
  item_id: string;
  user_email: string;
  user_name: string;
  created_at: string;
}

export interface AcervoVote {
  id: string;
  item_id: string;
  option_id: string;
  voter_email: string;
  voter_name: string;
  voter_avatar: string | null;
  created_at: string;
}

export async function getAcervoItems(sb: SupabaseClient) {
  const { data, error } = await sb.from('acervo_items').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data as AcervoItem[];
}

export async function getAcervoOptions(sb: SupabaseClient, itemIds: string[]) {
  if (itemIds.length === 0) return [] as AcervoOption[];
  const { data, error } = await sb.from('acervo_options').select('*').in('item_id', itemIds).order('position');
  if (error) throw error;
  return data as AcervoOption[];
}

export async function getAcervoLikes(sb: SupabaseClient, itemIds: string[]) {
  if (itemIds.length === 0) return [] as AcervoLike[];
  const { data, error } = await sb.from('acervo_likes').select('*').in('item_id', itemIds);
  if (error) throw error;
  return data as AcervoLike[];
}

export async function getAcervoVotes(sb: SupabaseClient, itemIds: string[]) {
  if (itemIds.length === 0) return [] as AcervoVote[];
  const { data, error } = await sb.from('acervo_votes').select('*').in('item_id', itemIds);
  if (error) throw error;
  return data as AcervoVote[];
}

export async function createAcervoItem(sb: SupabaseClient, item: Partial<AcervoItem>) {
  const { data, error } = await sb.from('acervo_items').insert(item).select().single();
  if (error) throw error;
  return data as AcervoItem;
}

export async function createAcervoOptions(sb: SupabaseClient, options: Partial<AcervoOption>[]) {
  const { data, error } = await sb.from('acervo_options').insert(options).select();
  if (error) throw error;
  return data as AcervoOption[];
}

export async function toggleAcervoLike(sb: SupabaseClient, itemId: string, email: string, name: string): Promise<boolean> {
  const { data: existing } = await sb.from('acervo_likes').select('id').eq('item_id', itemId).eq('user_email', email).maybeSingle();
  if (existing) {
    await sb.from('acervo_likes').delete().eq('id', existing.id);
    return false;
  }
  await sb.from('acervo_likes').insert({ item_id: itemId, user_email: email, user_name: name });
  return true;
}

export async function submitAcervoVote(
  sb: SupabaseClient,
  itemId: string,
  optionId: string,
  email: string,
  name: string,
  avatar: string | null,
) {
  const { data, error } = await sb.from('acervo_votes')
    .upsert({ item_id: itemId, option_id: optionId, voter_email: email, voter_name: name, voter_avatar: avatar }, { onConflict: 'item_id,voter_email' })
    .select().single();
  if (error) throw error;
  return data as AcervoVote;
}

export async function resolveAcervoItem(sb: SupabaseClient, itemId: string, winnerOptionId: string) {
  const { error } = await sb.from('acervo_items').update({ status: 'resolved', winner_option_id: winnerOptionId }).eq('id', itemId);
  if (error) throw error;
}

export async function deleteAcervoItem(sb: SupabaseClient, itemId: string) {
  const { error } = await sb.from('acervo_items').delete().eq('id', itemId);
  if (error) throw error;
}

// Single-item queries (for detail page)
export async function getAcervoItem(sb: SupabaseClient, id: string) {
  const { data, error } = await sb.from('acervo_items').select('*').eq('id', id).single();
  if (error) throw error;
  return data as AcervoItem;
}

export async function getAcervoOptionsByItem(sb: SupabaseClient, itemId: string) {
  const { data, error } = await sb.from('acervo_options').select('*').eq('item_id', itemId).order('position');
  if (error) throw error;
  return data as AcervoOption[];
}

export async function getAcervoLikesByItem(sb: SupabaseClient, itemId: string) {
  const { data, error } = await sb.from('acervo_likes').select('*').eq('item_id', itemId);
  if (error) throw error;
  return data as AcervoLike[];
}

export async function getAcervoVotesByItem(sb: SupabaseClient, itemId: string) {
  const { data, error } = await sb.from('acervo_votes').select('*').eq('item_id', itemId);
  if (error) throw error;
  return data as AcervoVote[];
}

export async function uploadAcervoFile(sb: SupabaseClient, file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
  const safeName = `acervo/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await sb.storage.from('project-files').upload(safeName, file, { cacheControl: '3600', upsert: false });
  if (error) throw error;
  const { data } = sb.storage.from('project-files').getPublicUrl(safeName);
  return data.publicUrl;
}
