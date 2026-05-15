import { db } from '@/lib/db';
import { supabase } from '@/lib/supabase';

// ─── Avatar Lineages ──────────────────────────────────────────────────────────
// Each avatar is a 3-character sheet image (left=stage0, center=stage1, right=stage2).
// Stage 3 (final) may have its own dedicated URL.
export interface AvatarDefinition {
    id: string;
    name: string;
    description: string;
    color: string;
    bgColor: string;
    sheetUrl: string;         // The combined 3-stage image
    finalStageUrl?: string;   // Optional override for stage 3
    stageNames: [string, string, string, string];
    // CSS backgroundPositionX for each stage (0–3) within the sheet
    stagePositions: [string, string, string, string];
}

export const AVATARS: AvatarDefinition[] = [
    {
        id: 'dragon',
        name: 'Dragon',
        description: 'A legendary dragon who grows mightier with every book',
        color: '#f59e0b',
        bgColor: '#fff8e0',
        sheetUrl: '/avatars/dragon_sheet.jpeg',
        finalStageUrl: '/avatars/dragon_library.png',
        stageNames:    ['Hatchling', 'Whelp', 'Drake', 'Dragon Lord'],
        stagePositions: ['0%', '50%', '100%', '50%'], // finalStageUrl used for stage 3
    },
    {
        id: 'bunny_white',
        name: 'Spirit Bunny',
        description: 'A mystical bunny whose cosmic power awakens page by page',
        color: '#6366f1',
        bgColor: '#eef2ff',
        sheetUrl: '/avatars/bunny_white_sheet.jpeg',
        stageNames:    ['Seedling', 'Channeller', 'Invoker', 'Cosmic Sage'],
        stagePositions: ['0%', '50%', '100%', '100%'],
    },
    {
        id: 'golem',
        name: 'Stone Golem',
        description: 'An ancient golem who forges wisdom into molten strength',
        color: '#dc2626',
        bgColor: '#fef2f2',
        sheetUrl: '/avatars/golem_sheet.jpeg',
        stageNames:    ['Pebbling', 'Ember Brute', 'Lava Colossus', 'Magma Titan'],
        stagePositions: ['0%', '50%', '100%', '100%'],
    },
    {
        id: 'bunny_red',
        name: 'Scholar Bunny',
        description: 'A bookish bunny whose knowledge transforms into legend',
        color: '#db3125',
        bgColor: '#fff0ec',
        sheetUrl: '/avatars/bunny_red_sheet.jpeg',
        stageNames:    ['Novice', 'Reader', 'Scholar', 'Grandmaster'],
        stagePositions: ['0%', '50%', '100%', '100%'],
    },
];

// ─── Evolution Milestones ─────────────────────────────────────────────────────
export const EVOLUTION_MILESTONES = [
    { stage: 0, booksRequired: 0,   label: 'Starter' },
    { stage: 1, booksRequired: 50,  label: 'Stage 1' },
    { stage: 2, booksRequired: 120, label: 'Stage 2' },
    { stage: 3, booksRequired: 200, label: 'Final'   },
] as const;

export function getAvatarStage(totalBooksRead: number): number {
    if (totalBooksRead >= 200) return 3;
    if (totalBooksRead >= 120) return 2;
    if (totalBooksRead >= 50)  return 1;
    return 0;
}

/** URL of the image to display for a given avatar + stage. */
export function getAvatarUrl(avatarBaseId: string, stage: number): string {
    const av = AVATARS.find(a => a.id === avatarBaseId);
    if (!av) return '';
    if (stage === 3 && av.finalStageUrl) return av.finalStageUrl;
    return av.sheetUrl; // cropped via CSS by AvatarStageImage component
}

export function getNextMilestone(totalBooksRead: number): { stage: number; booksRequired: number } | null {
    const next = EVOLUTION_MILESTONES.find(m => m.booksRequired > totalBooksRead);
    return next ?? null;
}

// ─── Evolution Check ──────────────────────────────────────────────────────────
/**
 * Should run whenever a user completes a book.
 * Returns the new evolution stage if the avatar evolved, null otherwise.
 */
export async function checkAvatarEvolution(userId: string): Promise<number | null> {
    const user = await db.users.get(userId);
    if (!user?.avatarBaseId) return null;

    const totalBooksRead = user.totalBooksRead || 0;
    const currentStage   = user.currentAvatarStage ?? 0;
    const newStage       = getAvatarStage(totalBooksRead);

    if (newStage <= currentStage) return null;

    const newUrl = getAvatarUrl(user.avatarBaseId, newStage);
    await db.users.update(userId, {
        currentAvatarStage: newStage,
        currentAvatarUrl:   newUrl,
    });

    if (typeof navigator !== 'undefined' && navigator.onLine && supabase) {
        try {
            await supabase.from('users').update({
                avatar_base_id:       user.avatarBaseId,
                current_avatar_stage: newStage,
                current_avatar_url:   newUrl,
                total_books_read:     totalBooksRead,
            }).eq('id', userId);
        } catch (e) {
            console.warn('[Avatar] Cloud sync failed — will retry when online', e);
        }
    }

    return newStage;
}

/**
 * Increments totalBooksRead and triggers an evolution check.
 * Returns the evolved stage, or null if no evolution happened.
 */
export async function onBookCompleted(userId: string): Promise<number | null> {
    const GUEST_IDS = ['local-user', 'local-admin'];
    const user = await db.users.get(userId);
    if (!user) return null;

    const newCount = (user.totalBooksRead || 0) + 1;
    await db.users.update(userId, { totalBooksRead: newCount });

    // Persist to Supabase via sync queue so re-logins and new devices keep the count
    if (!GUEST_IDS.includes(userId)) {
        await db.syncQueue.add({
            type: 'UPDATE_BOOKS_READ',
            payload: { userId, totalBooksRead: newCount },
            createdAt: Date.now(),
        });
    }

    return checkAvatarEvolution(userId);
}
