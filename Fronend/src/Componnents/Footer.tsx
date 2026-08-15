import { FC } from "react";

const Footer: FC = () => (
    <footer className="mt-auto py-4" style={{ backgroundColor: "var(--bv-bg-alt)", borderTop: "1px solid var(--bv-border)" }}>
        <div className="container text-center text-muted small">
            <p className="mb-0">© {new Date().getFullYear()} BeautyVillage - כל הזכויות שמורות</p>
        </div>
    </footer>
);

export default Footer;
