import type { BookReview } from "@/lib/db";

export interface RatingStats {
    averageRating: number;
    reviewCount: number;
}

type MinimalReview = Pick<BookReview, "userId" | "rating" | "createdAt">;

export function dedupeReviewsByUser<T extends MinimalReview>(reviews: T[]): T[] {
    const latestByUser = new Map<string, T>();

    for (const review of reviews) {
        const existing = latestByUser.get(review.userId);
        if (!existing || review.createdAt >= existing.createdAt) {
            latestByUser.set(review.userId, review);
        }
    }

    return Array.from(latestByUser.values());
}

export function getBookRatingStats<T extends MinimalReview>(reviews: T[]): RatingStats {
    const uniqueReviews = dedupeReviewsByUser(reviews);

    if (uniqueReviews.length === 0) {
        return { averageRating: 0, reviewCount: 0 };
    }

    const total = uniqueReviews.reduce((sum, review) => sum + review.rating, 0);

    return {
        averageRating: total / uniqueReviews.length,
        reviewCount: uniqueReviews.length,
    };
}

export function getImdbWeightedRating(
    averageRating: number,
    reviewCount: number,
    globalAverageRating: number,
    minimumVotes: number
) {
    if (reviewCount === 0) return 0;

    const safeMinimumVotes = Math.max(1, minimumVotes);
    return (
        (reviewCount / (reviewCount + safeMinimumVotes)) * averageRating +
        (safeMinimumVotes / (reviewCount + safeMinimumVotes)) * globalAverageRating
    );
}
