import { FC, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import useBusinesses from "../../custom_hooks/useBusinesses";
import useCategories from "../../custom_hooks/useCategories";
import BusinessCard from "../../Componnents/BusinessCard";
import LoadingSpinner from "../../Componnents/LoadingSpinner";
import ErrorMessage from "../../Componnents/ErrorMessage";
import EmptyState from "../../Componnents/EmptyState";
import Pagination from "../../Componnents/Pagination";

const SEARCH_DEBOUNCE_MS = 400;

const BusinessList: FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const { categories } = useCategories();

    const search = searchParams.get("search") ?? "";
    const category = searchParams.get("category") ?? "";
    const sort = searchParams.get("sort") === "rating" ? "rating" : undefined;
    const page = Math.max(parseInt(searchParams.get("page") ?? "1", 10) || 1, 1);

    // Local text buffer so typing doesn't fire a request on every keystroke -
    // only committed to the URL (and therefore the actual API call) after a
    // short pause.
    const [searchInput, setSearchInput] = useState(search);
    useEffect(() => {
        setSearchInput(search);
    }, [search]);

    useEffect(() => {
        const timeout = setTimeout(() => {
            if (searchInput !== search) {
                const next = new URLSearchParams(searchParams);
                if (searchInput) {
                    next.set("search", searchInput);
                } else {
                    next.delete("search");
                }
                next.set("page", "1");
                setSearchParams(next, { replace: true });
            }
        }, SEARCH_DEBOUNCE_MS);
        return () => clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchInput]);

    const { businesses, pagination, isLoading, error } = useBusinesses({
        page,
        search: search || undefined,
        category: category || undefined,
        sort,
    });

    const updateParam = (key: string, value: string) => {
        const next = new URLSearchParams(searchParams);
        if (value) {
            next.set(key, value);
        } else {
            next.delete(key);
        }
        next.set("page", "1");
        setSearchParams(next);
    };

    const goToPage = (nextPage: number) => {
        const next = new URLSearchParams(searchParams);
        next.set("page", String(nextPage));
        setSearchParams(next);
    };

    return (
        <div className="container">
            <h1 className="h3 mb-4">עסקים</h1>

            <div className="card p-3 mb-4">
                <div className="row g-3">
                    <div className="col-12 col-md-5">
                        <label className="form-label" htmlFor="business-search">
                            חיפוש
                        </label>
                        <input
                            id="business-search"
                            type="search"
                            className="form-control"
                            placeholder="חפשו עסק לפי שם..."
                            value={searchInput}
                            onChange={(event) => setSearchInput(event.target.value)}
                        />
                    </div>
                    <div className="col-6 col-md-4">
                        <label className="form-label" htmlFor="business-category">
                            קטגוריה
                        </label>
                        <select
                            id="business-category"
                            className="form-select"
                            value={category}
                            onChange={(event) => updateParam("category", event.target.value)}
                        >
                            <option value="">כל הקטגוריות</option>
                            {categories.map((cat) => (
                                <option key={cat._id} value={cat._id}>
                                    {cat.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="col-6 col-md-3">
                        <label className="form-label" htmlFor="business-sort">
                            מיון
                        </label>
                        <select
                            id="business-sort"
                            className="form-select"
                            value={sort ?? ""}
                            onChange={(event) => updateParam("sort", event.target.value)}
                        >
                            <option value="">החדשים ביותר</option>
                            <option value="rating">דירוג גבוה</option>
                        </select>
                    </div>
                </div>
            </div>

            {isLoading && <LoadingSpinner />}
            {!isLoading && error && <ErrorMessage message={error} />}
            {!isLoading && !error && businesses.length === 0 && (
                <EmptyState title="לא נמצאו עסקים" description="נסו לשנות את החיפוש או הסינון" />
            )}
            {!isLoading && !error && businesses.length > 0 && (
                <>
                    <div className="row g-4 mb-4">
                        {businesses.map((business) => (
                            <div className="col-12 col-sm-6 col-lg-4" key={business._id}>
                                <BusinessCard business={business} />
                            </div>
                        ))}
                    </div>
                    {pagination && (
                        <Pagination
                            page={pagination.page}
                            totalPages={pagination.totalPages}
                            onPageChange={goToPage}
                        />
                    )}
                </>
            )}
        </div>
    );
};

export default BusinessList;
