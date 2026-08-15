import { FC } from "react";
import { Link } from "react-router-dom";

const NotFound: FC = () => (
    <div className="container text-center py-5">
        <h1 className="display-5 mb-3">404</h1>
        <p className="text-muted mb-4">העמוד שחיפשת לא נמצא</p>
        <Link to="/" className="btn btn-primary">
            חזרה לדף הבית
        </Link>
    </div>
);

export default NotFound;
