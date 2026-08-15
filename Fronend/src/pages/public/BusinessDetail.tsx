import { FC, useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import useBusiness from "../../custom_hooks/useBusiness";
import useServices from "../../custom_hooks/useServices";
import useReviews from "../../custom_hooks/useReviews";
import useAuth from "../../custom_hooks/useAuth";
import mediaService from "../../services/media-service";
import { MediaMeta } from "../../types/media";
import LoadingSpinner from "../../Componnents/LoadingSpinner";
import ErrorMessage from "../../Componnents/ErrorMessage";
import EmptyState from "../../Componnents/EmptyState";
import StarRating from "../../Componnents/StarRating";
import MediaImage from "../../Componnents/MediaImage";
import BookingModal from "../../Componnents/BookingModal";
import { formatDate } from "../../utils/formatDate";

const HEBREW_DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

const BusinessDetail: FC = () => {
    const { id } = useParams<{ id: string }>();
    const location = useLocation();
    const { user, isAuthenticated } = useAuth();
    const { business, isLoading, error } = useBusiness(id);
    const { services, error: servicesError } = useServices(id);
    const { reviews, error: reviewsError } = useReviews(id);

    const [media, setMedia] = useState<MediaMeta[]>([]);
    const [showBookingModal, setShowBookingModal] = useState(false);

    useEffect(() => {
        if (!id) {
            return;
        }
        const { request, abort } = mediaService.getBusinessMedia(id);
        request
            .then((response) => setMedia(response.data.data))
            .catch(() => setMedia([]));
        return abort;
    }, [id]);

    if (isLoading) {
        return <LoadingSpinner />;
    }
    if (error || !business) {
        return <ErrorMessage message={error ?? "העסק לא נמצא"} />;
    }

    const categoryName = typeof business.category === "string" ? "" : business.category.name;
    const logo = media.find((item) => item.type === "logo");
    const cover = media.find((item) => item.type === "cover");
    const portfolio = media.filter((item) => item.type === "portfolio");

    const workingHoursByDay = new Map(business.workingHours.map((entry) => [entry.day, entry]));

    const isOwnBusiness = !!user && business.owner === user._id;
    const canBook = isAuthenticated && (user?.role === "customer" || user?.role === "businessOwner") && !isOwnBusiness;

    return (
        <div className="container">
            <MediaImage
                src={cover ? mediaService.getMediaUrl(cover._id) : undefined}
                alt={`תמונת שער של ${business.name}`}
                fallbackLabel={business.name.charAt(0)}
                height="240px"
                className="rounded mb-3"
                style={{ fontSize: "3rem" }}
            />

            <div className="d-flex align-items-center gap-3 mb-3">
                <MediaImage
                    src={logo ? mediaService.getMediaUrl(logo._id) : undefined}
                    alt={`לוגו של ${business.name}`}
                    fallbackLabel={business.name.charAt(0)}
                    height="72px"
                    className="rounded-circle flex-shrink-0"
                    style={{ width: "72px", fontSize: "1.5rem" }}
                />
                <div>
                    <h1 className="h3 mb-1">{business.name}</h1>
                    {categoryName && (
                        <span
                            className="badge rounded-pill"
                            style={{ backgroundColor: "var(--bv-primary-soft)", color: "var(--bv-primary)" }}
                        >
                            {categoryName}
                        </span>
                    )}
                </div>
            </div>

            <div className="d-flex flex-wrap align-items-center gap-3 mb-4 text-muted">
                <span className="d-flex align-items-center gap-1">
                    <StarRating rating={business.averageRating} />({business.reviewCount} ביקורות)
                </span>
                <span>{business.address}</span>
                <span>{business.phone}</span>
            </div>

            <div className="row g-4">
                <div className="col-12 col-lg-8">
                    <section className="mb-4">
                        <h2 className="h5 mb-2">אודות</h2>
                        <p className="mb-0">{business.description}</p>
                    </section>

                    <section className="mb-4">
                        <h2 className="h5 mb-3">שירותים</h2>
                        {servicesError ? (
                            <ErrorMessage message={servicesError} />
                        ) : services.length === 0 ? (
                            <EmptyState title="עדיין לא נוספו שירותים" />
                        ) : (
                            <div className="list-group">
                                {services.map((service) => (
                                    <div key={service._id} className="list-group-item">
                                        <div className="d-flex justify-content-between align-items-start gap-3">
                                            <div>
                                                <h3 className="h6 mb-1">{service.name}</h3>
                                                {service.description && (
                                                    <p className="text-muted small mb-1">{service.description}</p>
                                                )}
                                                <p className="text-muted small mb-0">
                                                    {service.durationMinutes} דקות
                                                </p>
                                            </div>
                                            <span className="fw-bold text-nowrap" style={{ color: "var(--bv-primary)" }}>
                                                {service.price} ₪
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    <section className="mb-4">
                        <h2 className="h5 mb-3">גלריית עבודות</h2>
                        {portfolio.length === 0 ? (
                            <EmptyState title="עדיין לא נוספו תמונות לגלריה" />
                        ) : (
                            <div className="row g-3">
                                {portfolio.map((item) => (
                                    <div className="col-6 col-sm-4" key={item._id}>
                                        <MediaImage
                                            src={mediaService.getMediaUrl(item._id)}
                                            alt={`תמונה מהגלריה של ${business.name}`}
                                            fallbackLabel="✦"
                                            height="140px"
                                            className="rounded"
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    <section>
                        <h2 className="h5 mb-3">ביקורות ({reviews.length})</h2>
                        {reviewsError ? (
                            <ErrorMessage message={reviewsError} />
                        ) : reviews.length === 0 ? (
                            <EmptyState title="עדיין אין ביקורות" />
                        ) : (
                            <ul className="list-unstyled mb-0">
                                {reviews.map((review) => {
                                    const customer = typeof review.customer === "string" ? null : review.customer;
                                    return (
                                        <li key={review._id} className="border-bottom py-3">
                                            <div className="d-flex justify-content-between align-items-center mb-1">
                                                <span className="fw-medium">{customer?.name ?? "לקוח/ה"}</span>
                                                <span className="text-muted small">{formatDate(review.createdAt)}</span>
                                            </div>
                                            <StarRating rating={review.rating} />
                                            {review.comment && <p className="mb-0 mt-1">{review.comment}</p>}
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </section>
                </div>

                <div className="col-12 col-lg-4">
                    <div className="card p-3 mb-4">
                        <h2 className="h6 mb-3">שעות פעילות</h2>
                        <ul className="list-unstyled mb-0">
                            {HEBREW_DAYS.map((dayName, dayIndex) => {
                                const entry = workingHoursByDay.get(dayIndex);
                                const isOpen = entry?.isOpen;
                                return (
                                    <li
                                        key={dayIndex}
                                        className="d-flex justify-content-between border-bottom py-1 small"
                                    >
                                        <span>{dayName}</span>
                                        <span className={isOpen ? "" : "text-muted"}>
                                            {isOpen && entry?.startTime && entry?.endTime
                                                ? `${entry.startTime} - ${entry.endTime}`
                                                : "סגור"}
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>

                    <div className="card p-3">
                        {!isAuthenticated && (
                            <Link to="/login" state={{ from: location }} className="btn btn-primary w-100">
                                התחברות לקביעת תור
                            </Link>
                        )}
                        {isAuthenticated && canBook && (
                            <button
                                type="button"
                                className="btn btn-primary w-100"
                                onClick={() => setShowBookingModal(true)}
                            >
                                קביעת תור
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {showBookingModal && (
                <BookingModal business={business} services={services} onClose={() => setShowBookingModal(false)} />
            )}
        </div>
    );
};

export default BusinessDetail;
