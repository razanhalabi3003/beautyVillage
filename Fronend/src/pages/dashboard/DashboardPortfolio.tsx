import { ChangeEvent, FC, useEffect, useState } from "react";
import { useAppSelector } from "../../redux/hooks";
import businessService from "../../services/business-service";
import mediaService from "../../services/media-service";
import { CanceledError } from "../../services/api-client";
import { MediaMeta } from "../../types/media";
import { getApiErrorMessage } from "../../utils/apiError";
import LoadingSpinner from "../../Componnents/LoadingSpinner";
import ErrorMessage from "../../Componnents/ErrorMessage";
import MediaImage from "../../Componnents/MediaImage";
import ConfirmDialog from "../../Componnents/ConfirmDialog";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 2 * 1024 * 1024;
const MAX_PORTFOLIO_IMAGES = 6;

const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
        return "ניתן להעלות קבצי JPEG, PNG או WEBP בלבד";
    }
    if (file.size > MAX_FILE_SIZE) {
        return "גודל הקובץ חייב להיות עד 2MB";
    }
    return null;
};

// Business is guaranteed non-null here - DashboardLayout gates rendering of
// this whole route subtree until state.businesses.mine is loaded.
const DashboardPortfolio: FC = () => {
    const business = useAppSelector((state) => state.businesses.mine)!;

    const [media, setMedia] = useState<MediaMeta[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);

    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [logoProgress, setLogoProgress] = useState<number | null>(null);
    const [uploadingCover, setUploadingCover] = useState(false);
    const [coverProgress, setCoverProgress] = useState<number | null>(null);
    const [uploadingPortfolio, setUploadingPortfolio] = useState(false);
    const [portfolioProgress, setPortfolioProgress] = useState<number | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<MediaMeta | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchMedia = () => {
        setIsLoading(true);
        const { request, abort } = mediaService.getBusinessMedia(business._id);
        request
            .then((response) => {
                setMedia(response.data.data);
                setIsLoading(false);
            })
            .catch((err) => {
                if (!(err instanceof CanceledError)) {
                    setLoadError("שגיאה בטעינת התמונות");
                    setIsLoading(false);
                }
            });
        return abort;
    };

    useEffect(() => {
        const abort = fetchMedia();
        return abort;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [business._id]);

    const logo = media.find((m) => m.type === "logo");
    const cover = media.find((m) => m.type === "cover");
    const portfolio = media.filter((m) => m.type === "portfolio");

    const handleSingleUpload = async (
        file: File,
        kind: "logo" | "cover",
        setUploading: (value: boolean) => void,
        setProgress: (value: number | null) => void
    ) => {
        const validationError = validateFile(file);
        if (validationError) {
            setActionError(validationError);
            return;
        }
        setActionError(null);
        setUploading(true);
        setProgress(0);
        try {
            await businessService.uploadMedia(business._id, kind, file, setProgress);
            fetchMedia();
        } catch (err) {
            setActionError(getApiErrorMessage(err, "אירעה שגיאה בהעלאת התמונה"));
        } finally {
            setUploading(false);
            setProgress(null);
        }
    };

    const handleLogoChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (file) {
            handleSingleUpload(file, "logo", setUploadingLogo, setLogoProgress);
        }
    };

    const handleCoverChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (file) {
            handleSingleUpload(file, "cover", setUploadingCover, setCoverProgress);
        }
    };

    const handlePortfolioChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) {
            return;
        }
        if (portfolio.length >= MAX_PORTFOLIO_IMAGES) {
            setActionError(`ניתן להעלות עד ${MAX_PORTFOLIO_IMAGES} תמונות בתיק העבודות`);
            return;
        }
        const validationError = validateFile(file);
        if (validationError) {
            setActionError(validationError);
            return;
        }
        setActionError(null);
        setUploadingPortfolio(true);
        setPortfolioProgress(0);
        try {
            await businessService.uploadMedia(business._id, "portfolio", file, setPortfolioProgress);
            fetchMedia();
        } catch (err) {
            setActionError(getApiErrorMessage(err, "אירעה שגיאה בהעלאת התמונה"));
        } finally {
            setUploadingPortfolio(false);
            setPortfolioProgress(null);
        }
    };

    const handleConfirmDelete = async () => {
        if (!deleteTarget) {
            return;
        }
        setIsDeleting(true);
        setActionError(null);
        try {
            await businessService.deletePortfolioImage(business._id, deleteTarget._id);
            setDeleteTarget(null);
            fetchMedia();
        } catch (err) {
            setActionError(getApiErrorMessage(err, "אירעה שגיאה במחיקת התמונה"));
        } finally {
            setIsDeleting(false);
        }
    };

    if (isLoading) {
        return <LoadingSpinner />;
    }
    if (loadError) {
        return <ErrorMessage message={loadError} />;
    }

    return (
        <div>
            <h2 className="h5 mb-3">תיק עבודות</h2>

            {actionError && (
                <div className="alert alert-danger" role="alert">
                    {actionError}
                </div>
            )}

            <div className="row g-4 mb-4">
                <div className="col-12 col-md-6">
                    <label className="form-label d-block">לוגו</label>
                    <MediaImage
                        src={logo ? mediaService.getMediaUrl(logo._id) : undefined}
                        alt="לוגו העסק"
                        fallbackLabel="לוגו"
                        className="rounded mb-2"
                        height="140px"
                    />
                    <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="form-control form-control-sm"
                        disabled={uploadingLogo}
                        onChange={handleLogoChange}
                    />
                    {uploadingLogo && (
                        <div className="progress mt-2" style={{ height: "6px" }}>
                            <div
                                className="progress-bar"
                                style={{ width: `${logoProgress ?? 0}%`, backgroundColor: "var(--bv-primary)" }}
                            />
                        </div>
                    )}
                </div>

                <div className="col-12 col-md-6">
                    <label className="form-label d-block">תמונת שער</label>
                    <MediaImage
                        src={cover ? mediaService.getMediaUrl(cover._id) : undefined}
                        alt="תמונת שער"
                        fallbackLabel="שער"
                        className="rounded mb-2"
                        height="140px"
                    />
                    <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="form-control form-control-sm"
                        disabled={uploadingCover}
                        onChange={handleCoverChange}
                    />
                    {uploadingCover && (
                        <div className="progress mt-2" style={{ height: "6px" }}>
                            <div
                                className="progress-bar"
                                style={{ width: `${coverProgress ?? 0}%`, backgroundColor: "var(--bv-primary)" }}
                            />
                        </div>
                    )}
                </div>
            </div>

            <div>
                <div className="d-flex justify-content-between align-items-center mb-2">
                    <label className="form-label mb-0">
                        גלריית עבודות ({portfolio.length}/{MAX_PORTFOLIO_IMAGES})
                    </label>
                </div>
                <div className="row g-3 mb-2">
                    {portfolio.map((item) => (
                        <div className="col-6 col-md-4" key={item._id}>
                            <div className="position-relative">
                                <MediaImage
                                    src={mediaService.getMediaUrl(item._id)}
                                    alt="תמונה מתיק העבודות"
                                    className="rounded"
                                    height="120px"
                                />
                                <button
                                    type="button"
                                    className="btn btn-sm btn-danger position-absolute top-0 end-0 m-1"
                                    onClick={() => setDeleteTarget(item)}
                                >
                                    מחיקה
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
                {portfolio.length < MAX_PORTFOLIO_IMAGES && (
                    <>
                        <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="form-control form-control-sm"
                            disabled={uploadingPortfolio}
                            onChange={handlePortfolioChange}
                        />
                        {uploadingPortfolio && (
                            <div className="progress mt-2" style={{ height: "6px" }}>
                                <div
                                    className="progress-bar"
                                    style={{
                                        width: `${portfolioProgress ?? 0}%`,
                                        backgroundColor: "var(--bv-primary)",
                                    }}
                                />
                            </div>
                        )}
                    </>
                )}
            </div>

            <ConfirmDialog
                show={!!deleteTarget}
                title="מחיקת תמונה"
                message="למחוק את התמונה מתיק העבודות? לא ניתן לשחזר לאחר המחיקה."
                confirmLabel={isDeleting ? "מוחק..." : "מחיקה"}
                onConfirm={handleConfirmDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        </div>
    );
};

export default DashboardPortfolio;
