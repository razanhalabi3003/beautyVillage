import { FC } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";

const Layout: FC = () => (
    <div className="d-flex flex-column min-vh-100">
        <Navbar />
        <main className="flex-grow-1 py-4">
            <Outlet />
        </main>
        <Footer />
    </div>
);

export default Layout;
