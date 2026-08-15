import { FC, memo } from "react";

interface StarRatingProps {
    rating: number;
    outOf?: number;
    // When provided, the stars become a clickable rating input (used by
    // ReviewModal) instead of a read-only display - every existing
    // read-only usage omits this and is unaffected.
    onRate?: (value: number) => void;
}

// Rendered inside every BusinessCard/review row in a list - memoized so a
// parent list re-render doesn't recompute every star for every unrelated item.
const StarRating: FC<StarRatingProps> = ({ rating, outOf = 5, onRate }) => {
    const stars = Array.from({ length: outOf }, (_, index) => index < Math.round(rating));

    if (onRate) {
        return (
            <span role="radiogroup" aria-label="דירוג">
                {stars.map((filled, index) => (
                    <button
                        key={index}
                        type="button"
                        role="radio"
                        aria-checked={filled}
                        aria-label={`דרג ${index + 1} מתוך ${outOf}`}
                        onClick={() => onRate(index + 1)}
                        className="btn btn-link p-0 border-0"
                        style={{
                            color: filled ? "var(--bv-primary)" : "var(--bv-border)",
                            fontSize: "1.75rem",
                            lineHeight: 1,
                            textDecoration: "none",
                        }}
                    >
                        ★
                    </button>
                ))}
            </span>
        );
    }

    return (
        <span aria-label={`דירוג ${rating} מתוך ${outOf}`} title={`${rating} מתוך ${outOf}`}>
            {stars.map((filled, index) => (
                <span key={index} style={{ color: filled ? "var(--bv-primary)" : "var(--bv-border)" }}>
                    ★
                </span>
            ))}
        </span>
    );
};

export default memo(StarRating);
