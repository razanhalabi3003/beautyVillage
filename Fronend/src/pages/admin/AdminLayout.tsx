import { FC } from "react";
import { NavLink, Outlet } from "react-router-dom";

const AdminLayout: FC = () => (
    <div className="container">
        <h1 className="h4 mb-4">
            ניהול מערכת
            <span
                className="badge rounded-pill ms-2"
                style={{ backgroundColor: "var(--bv-primary-soft)", color: "var(--bv-primary)" }}
            >
                מנהל
            </span>
        </h1>
        <div className="row">
            <div className="col-12 col-md-3 mb-4">
                <div className="list-group">
                    <NavLink to="/admin" end className="list-group-item list-group-item-action">
                        סקירה כללית
                    </NavLink>
                    <NavLink to="/admin/businesses" className="list-group-item list-group-item-action">
                        עסקים
                    </NavLink>
                    <NavLink to="/admin/users" className="list-group-item list-group-item-action">
                        משתמשים
                    </NavLink>
                    <NavLink to="/admin/reviews" className="list-group-item list-group-item-action">
                        ביקורות
                    </NavLink>
                    <NavLink to="/admin/categories" className="list-group-item list-group-item-action">
                        קטגוריות
                    </NavLink>
                </div>
            </div>
            <div className="col-12 col-md-9">
                <Outlet />
            </div>
        </div>
    </div>
);

export default AdminLayout;
