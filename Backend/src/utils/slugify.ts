// Converts a category name into a URL-safe slug. Uses Unicode letter/number
// classes (not just a-z0-9) so Hebrew names slugify correctly too, e.g.
// "ציפורניים" stays intact instead of being stripped to an empty string.
const slugify = (value: string): string => {
    const slug = value
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^\p{L}\p{N}-]+/gu, "")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

    // If the name had no usable characters (e.g. only symbols), fall back to
    // a still-unique value instead of ever saving an empty slug.
    return slug.length > 0 ? slug : `category-${Date.now()}`;
};

export default slugify;
