import { FC, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import useCategories from "../../custom_hooks/useCategories";
import useBusinesses from "../../custom_hooks/useBusinesses";
import BusinessCard from "../../Componnents/BusinessCard";
import LoadingSpinner from "../../Componnents/LoadingSpinner";
import ErrorMessage from "../../Componnents/ErrorMessage";
import EmptyState from "../../Componnents/EmptyState";
import mediaService from "../../services/media-service";

const FEATURED_LIMIT = 6;

const Home: FC = () => {
    const { categories, isLoading: categoriesLoading, error: categoriesError } = useCategories();
    const {
        businesses,
        isLoading: businessesLoading,
        error: businessesError,
    } = useBusinesses({ limit: FEATURED_LIMIT, sort: "rating" });

    // A small, bounded fetch (at most FEATURED_LIMIT requests) for the
    // featured section's cover images - not done for the full business list,
    // which could otherwise mean one media request per card per page.
    const [coverUrls, setCoverUrls] = useState<Record<string, string>>({});

    useEffect(() => {
        if (businesses.length === 0) {
            return;
        }
        let cancelled = false;

        Promise.all(
            businesses.map(async (business) => {
                const { request } = mediaService.getBusinessMedia(business._id);
                try {
                    const response = await request;
                    const media = response.data.data;
                    const cover = media.find((item) => item.type === "cover") ?? media.find((item) => item.type === "logo");
                    return cover ? ([business._id, mediaService.getMediaUrl(cover._id)] as const) : null;
                } catch {
                    return null;
                }
            })
        ).then((entries) => {
            if (cancelled) {
                return;
            }
            const map: Record<string, string> = {};
            for (const entry of entries) {
                if (entry) {
                    map[entry[0]] = entry[1];
                }
            }
            setCoverUrls(map);
        });

        return () => {
            cancelled = true;
        };
    }, [businesses]);

    return (
        <div>
            <section className="section-alt py-5">
                <div className="container text-center py-4">
                    <h1 className="display-5 fw-bold mb-3">כל היופי של הכפר במקום אחד</h1>
                    <p className="text-muted fs-5 mb-4 mx-auto" style={{ maxWidth: "640px" }}>
                        BeautyVillage עוזר לכם לגלות עסקי יופי בקרבתכם, לעיין בשירותים ובעבודות שלהם, לקרוא ביקורות
                        אמיתיות מלקוחות ולקבוע תור בקלות.
                    </p>
                    <div className="d-flex flex-column flex-sm-row justify-content-center gap-3">
                        <Link to="/businesses" className="btn btn-primary btn-lg px-4">
                            חיפוש עסקים
                        </Link>
                        <Link to="/submit-business" className="btn btn-outline-secondary btn-lg px-4">
                            יש לך עסק? הצטרפי אלינו
                        </Link>
                    </div>
                </div>
            </section>

            <section className="container py-5">
                <h2 className="h4 mb-4 text-center">קטגוריות</h2>
                {categoriesLoading && <LoadingSpinner />}
                {!categoriesLoading && categoriesError && <ErrorMessage message={categoriesError} />}
                {!categoriesLoading && !categoriesError && categories.length === 0 && (
                    <EmptyState title="עדיין לא נוספו קטגוריות" />
                )}
                {!categoriesLoading && !categoriesError && categories.length > 0 && (
                    <div className="d-flex flex-wrap justify-content-center gap-2">
                        {categories.map((category) => (
                            <Link
                                key={category._id}
                                to={`/businesses?category=${category._id}`}
                                className="btn rounded-pill px-4 py-2 text-decoration-none fw-medium"
                                style={{ backgroundColor: "var(--bv-primary-soft)", color: "var(--bv-primary)" }}
                            >
                                {category.name}
                            </Link>
                        ))}
                    </div>
                )}
            </section>

            <section className="section-alt py-5">
                <div className="container">
                    <h2 className="h4 mb-4 text-center">עסקים מומלצים</h2>
                    {businessesLoading && <LoadingSpinner />}
                    {!businessesLoading && businessesError && <ErrorMessage message={businessesError} />}
                    {!businessesLoading && !businessesError && businesses.length === 0 && (
                        <EmptyState title="עדיין אין עסקים להצגה" description="חזרו לבקר בקרוב" />
                    )}
                    {!businessesLoading && !businessesError && businesses.length > 0 && (
                        <div className="row g-4">
                            {businesses.map((business) => (
                                <div className="col-12 col-sm-6 col-lg-4" key={business._id}>
                                    <BusinessCard business={business} coverUrl={coverUrls[business._id]} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            <section className="container py-5 text-center">
                <h2 className="h4 mb-3">יש לכם עסק בתחום היופי?</h2>
                <p className="text-muted mb-4 mx-auto" style={{ maxWidth: "560px" }}>
                    הצטרפו ל-BeautyVillage וחשפו את העסק שלכם ללקוחות חדשים - הוסיפו שירותים, גלריית עבודות וקבלו
                    תורים ישירות דרך המערכת.
                </p>
                <Link to="/submit-business" className="btn btn-primary btn-lg px-4">
                    הצטרפות כבעל/ת עסק
                </Link>
            </section>
        </div>
    );
};

export default Home;
