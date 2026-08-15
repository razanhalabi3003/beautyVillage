import { FC, useEffect } from "react";
import { Link, NavLink } from "react-router-dom";
import useAuth from "../custom_hooks/useAuth";
import { useAppDispatch, useAppSelector } from "../redux/hooks";
import { fetchMyBusiness } from "../redux/businessesSlice";

interface NavItem {
    to: string;
    label: string;
}

const Navbar: FC = () => {
    const { isAuthenticated, user, logout } = useAuth();
    const dispatch = useAppDispatch();
    const business = useAppSelector((state) => state.businesses.mine);

    // A customer's submission status (none/pending/rejected) decides the nav
    // label below - fetched here since the label needs it on every page, not
    // just on /submit-business itself.
    useEffect(() => {
        if (isAuthenticated && user?.role === "customer") {
            dispatch(fetchMyBusiness());
        }
    }, [dispatch, isAuthenticated, user?.role]);

    const navItems: NavItem[] = [{ to: "/", label: "בית" }, { to: "/businesses", label: "עסקים" }];

    if (isAuthenticated && (user?.role === "customer" || user?.role === "businessOwner")) {
        navItems.push({ to: "/my-appointments", label: "התורים שלי" });
    }
    if (isAuthenticated && user?.role === "businessOwner") {
        navItems.push({ to: "/dashboard", label: "ניהול העסק" });
    }
    if (isAuthenticated && user?.role === "customer") {
        navItems.push({ to: "/submit-business", label: business ? "העסק שלי" : "הוספת עסק" });
    }
    if (isAuthenticated && user?.role === "admin") {
        navItems.push({ to: "/admin", label: "ניהול מערכת" });
    }

    return (
        <nav
            className="navbar navbar-expand-lg"
            style={{ backgroundColor: "var(--bv-surface)", borderBottom: "1px solid var(--bv-border)" }}
        >
            <div className="container">
                <Link className="navbar-brand fw-bold" to="/" style={{ color: "var(--bv-primary)" }}>
                    BeautyVillage
                </Link>
                <button
                    className="navbar-toggler"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#mainNavbar"
                    aria-controls="mainNavbar"
                    aria-expanded="false"
                    aria-label="פתח תפריט ניווט"
                >
                    <span className="navbar-toggler-icon" />
                </button>
                <div className="collapse navbar-collapse" id="mainNavbar">
                    <ul className="navbar-nav me-auto mb-2 mb-lg-0">
                        {navItems.map((item) => (
                            <li className="nav-item" key={item.to}>
                                <NavLink className="nav-link" to={item.to} end={item.to === "/"}>
                                    {item.label}
                                </NavLink>
                            </li>
                        ))}
                    </ul>
                    <ul className="navbar-nav align-items-lg-center">
                        {isAuthenticated ? (
                            <>
                                <li className="nav-item">
                                    <NavLink className="nav-link" to="/profile">
                                        פרופיל
                                    </NavLink>
                                </li>
                                <li className="nav-item">
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-outline-secondary ms-lg-2"
                                        onClick={logout}
                                    >
                                        התנתקות
                                    </button>
                                </li>
                            </>
                        ) : (
                            <>
                                <li className="nav-item">
                                    <NavLink className="nav-link" to="/login">
                                        התחברות
                                    </NavLink>
                                </li>
                                <li className="nav-item">
                                    <NavLink className="btn btn-primary btn-sm ms-lg-2" to="/register">
                                        הרשמה
                                    </NavLink>
                                </li>
                            </>
                        )}
                    </ul>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
