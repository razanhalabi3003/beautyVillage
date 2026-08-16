import { FC, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import axios from "axios";
import { useNavigate, useLocation, Link } from "react-router-dom";
import type { Location } from "react-router-dom";
import useAuth from "../../custom_hooks/useAuth";

const loginSchema = z.object({
    email: z.string().email("כתובת אימייל לא תקינה"),
    password: z.string().min(6, "הסיסמה חייבת להכיל לפחות 6 תווים"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const Login: FC = () => {
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [serverError, setServerError] = useState<string | null>(null);
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

    const onSubmit = async (values: LoginFormValues) => {
        setServerError(null);
        try {
            await login(values.email, values.password);
            const from = (location.state as { from?: Location } | null)?.from;
            navigate(from?.pathname ?? "/", { replace: true });
        } catch (err) {
            if (axios.isAxiosError(err) && err.response?.status === 429) {
                setServerError("בוצעו יותר מדי ניסיונות התחברות. נסו שוב בעוד מספר דקות.");
            } else {
                setServerError("אימייל או סיסמה שגויים");
            }
        }
    };

    return (
        <div className="container" style={{ maxWidth: "420px" }}>
            <div className="card p-4">
                <h1 className="h4 mb-4 text-center">התחברות</h1>
                {serverError && (
                    <div className="alert alert-danger" role="alert">
                        {serverError}
                    </div>
                )}
                <form onSubmit={handleSubmit(onSubmit)} noValidate>
                    <div className="mb-3">
                        <label className="form-label" htmlFor="email">
                            אימייל
                        </label>
                        <input
                            id="email"
                            type="email"
                            autoComplete="email"
                            className={`form-control${errors.email ? " is-invalid" : ""}`}
                            aria-invalid={!!errors.email}
                            aria-describedby={errors.email ? "email-error" : undefined}
                            {...register("email")}
                        />
                        {errors.email && (
                            <div id="email-error" className="invalid-feedback">
                                {errors.email.message}
                            </div>
                        )}
                    </div>
                    <div className="mb-3">
                        <label className="form-label" htmlFor="password">
                            סיסמה
                        </label>
                        <input
                            id="password"
                            type="password"
                            autoComplete="current-password"
                            className={`form-control${errors.password ? " is-invalid" : ""}`}
                            aria-invalid={!!errors.password}
                            aria-describedby={errors.password ? "password-error" : undefined}
                            {...register("password")}
                        />
                        {errors.password && (
                            <div id="password-error" className="invalid-feedback">
                                {errors.password.message}
                            </div>
                        )}
                    </div>
                    <button type="submit" className="btn btn-primary w-100" disabled={isSubmitting}>
                        {isSubmitting ? "מתחבר..." : "התחברות"}
                    </button>
                </form>
                <p className="text-center mt-3 mb-0">
                    אין לך חשבון? <Link to="/register" state={location.state}>הרשמה</Link>
                </p>
            </div>
        </div>
    );
};

export default Login;
