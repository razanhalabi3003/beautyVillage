import { CSSProperties, FC, useState } from "react";

interface MediaImageProps {
    src?: string;
    alt: string;
    fallbackLabel?: string;
    className?: string;
    style?: CSSProperties;
    height?: string | number;
}

// Shared image-with-fallback used by BusinessCard and BusinessDetail (cover,
// logo, portfolio) - shows a themed placeholder instead of a broken-image
// icon whenever there is no media, or the media fails to load.
const MediaImage: FC<MediaImageProps> = ({ src, alt, fallbackLabel, className, style, height = "180px" }) => {
    const [failed, setFailed] = useState(false);
    const showFallback = !src || failed;

    if (showFallback) {
        return (
            <div
                className={className}
                role="img"
                aria-label={alt}
                style={{
                    height,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "var(--bv-primary-soft)",
                    color: "var(--bv-primary)",
                    fontSize: "2rem",
                    fontWeight: 600,
                    ...style,
                }}
            >
                {fallbackLabel ?? "✦"}
            </div>
        );
    }

    return (
        <img
            src={src}
            alt={alt}
            className={className}
            style={{ height, objectFit: "cover", width: "100%", ...style }}
            onError={() => setFailed(true)}
        />
    );
};

export default MediaImage;
