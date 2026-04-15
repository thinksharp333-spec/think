"use client";

import { AVATARS } from '@/lib/avatar';

interface AvatarStageImageProps {
    avatarBaseId: string;
    stage: number;
    size?: number;
    className?: string;
    style?: React.CSSProperties;
    rounded?: boolean; // whether to apply borderRadius:50%
}

/**
 * Displays a single character from a 3-wide avatar sheet by cropping via CSS.
 * Stage 3 (final) uses finalStageUrl when available.
 */
export function AvatarStageImage({
    avatarBaseId,
    stage,
    size = 80,
    className = '',
    style = {},
    rounded = true,
}: AvatarStageImageProps) {
    const av = AVATARS.find(a => a.id === avatarBaseId);
    if (!av) return null;

    const isFinalWithOwnUrl = stage === 3 && av.finalStageUrl;
    const imageUrl = isFinalWithOwnUrl ? av.finalStageUrl! : av.sheetUrl;
    const posX     = av.stagePositions[Math.min(stage, 3)];

    if (isFinalWithOwnUrl) {
        // Final stage: show entire dedicated image (e.g. dragon_library.png)
        return (
            <div
                className={className}
                style={{
                    width: size,
                    height: size,
                    borderRadius: rounded ? '50%' : undefined,
                    backgroundImage: `url(${imageUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    flexShrink: 0,
                    ...style,
                }}
            />
        );
    }

    // Sheet stages: 300% wide background positions the correct 1/3
    return (
        <div
            className={className}
            style={{
                width: size,
                height: size,
                borderRadius: rounded ? '50%' : undefined,
                backgroundImage: `url(${imageUrl})`,
                backgroundSize: '300% auto',
                backgroundPositionX: posX,
                backgroundPositionY: 'center',
                backgroundRepeat: 'no-repeat',
                flexShrink: 0,
                ...style,
            }}
        />
    );
}

/** Full-width banner showing the entire evolution sheet (used in avatar selection card) */
export function AvatarSheetBanner({
    avatarBaseId,
    height = 120,
    className = '',
}: {
    avatarBaseId: string;
    height?: number;
    className?: string;
}) {
    const av = AVATARS.find(a => a.id === avatarBaseId);
    if (!av) return null;

    return (
        <div
            className={className}
            style={{
                width: '100%',
                height,
                backgroundImage: `url(${av.sheetUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
            }}
        />
    );
}
