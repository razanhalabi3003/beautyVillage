import { FC, memo } from "react";
import { Link } from "react-router-dom";
import { Business } from "../types/business";
import StarRating from "./StarRating";
import MediaImage from "./MediaImage";

interface BusinessCardProps {
    business: Business;
    coverUrl?: string;
}

// Rendered many times per business-list page - memoized so scrolling/paging
// the list doesn't re-render every card, only the ones whose props changed.
const BusinessCard: FC<BusinessCardProps> = ({ business, coverUrl }) => {
    const categoryName = typeof business.category === "string" ? "" : business.category.name;

    return (
        <Link to={`/businesses/${business._id}`} className="text-decoration-none text-reset">
            <div className="card h-100">
                <MediaImage
                    src={coverUrl}
                    alt={business.name}
                    fallbackLabel={business.name.charAt(0)}
                    className="card-img-top"
                    style={{ fontSize: "2.5rem" }}
                />
                <div className="card-body">
                    <h5 className="card-title mb-1">{business.name}</h5>
                    {categoryName && <p className="text-muted small mb-1">{categoryName}</p>}
                    <p className="text-muted small mb-2">{business.address}</p>
                    <div className="d-flex align-items-center gap-2">
                        <StarRating rating={business.averageRating} />
                        <span className="text-muted small">({business.reviewCount})</span>
                    </div>
                </div>
            </div>
        </Link>
    );
};

export default memo(BusinessCard);
