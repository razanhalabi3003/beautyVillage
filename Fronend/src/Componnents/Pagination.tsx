import { FC } from "react";

interface PaginationProps {
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

const Pagination: FC<PaginationProps> = ({ page, totalPages, onPageChange }) => {
    if (totalPages <= 1) {
        return null;
    }
    const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

    return (
        <nav aria-label="ניווט בין עמודים" className="d-flex justify-content-center">
            <ul className="pagination">
                <li className={`page-item ${page === 1 ? "disabled" : ""}`}>
                    <button
                        type="button"
                        className="page-link"
                        onClick={() => onPageChange(page - 1)}
                        disabled={page === 1}
                    >
                        הקודם
                    </button>
                </li>
                {pages.map((p) => (
                    <li key={p} className={`page-item ${p === page ? "active" : ""}`}>
                        <button type="button" className="page-link" onClick={() => onPageChange(p)}>
                            {p}
                        </button>
                    </li>
                ))}
                <li className={`page-item ${page === totalPages ? "disabled" : ""}`}>
                    <button
                        type="button"
                        className="page-link"
                        onClick={() => onPageChange(page + 1)}
                        disabled={page === totalPages}
                    >
                        הבא
                    </button>
                </li>
            </ul>
        </nav>
    );
};

export default Pagination;
