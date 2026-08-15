import { FC, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, useLocation, Link } from "react-router-dom";
import type { Location } from "react-router-dom";
import useAuth from "../../custom_hooks/useAuth";

const registerSchema = z
    .object({
        name: z.string().min(2, "שם חייב להכיל לפחות 2 תווים"),
        email: z.string().email("כתובת אימייל לא תקינה"),
        password: z.string().min(6, "הסיסמה חייבת להכיל לפחות 6 תווים"),
        confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "הסיסמאות אינן תואמות",
        path: ["confirmPassword"],
    });

type RegisterFormValues = z.infer<typeof registerSchema>;

const Register: FC = () => {
    const { register: registerUser } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [serverError, setServerError] = useState<string | null>(null);
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema) });

    const onSubmit = async (values: RegisterFormValues) => {
        setServerError(null);
        try {
            await registerUser(values.name, values.email, values.password);
            const from = (location.state as { from?: Location } | null)?.from;
            navigate(from?.pathname ?? "/", { replace: true });
        } catch {
            setServerError("ההרשמה נכשלה - ייתכן שהאימייל כבר קיים במערכת");
        }
    };

    return (
        <div className="container" style={{ maxWidth: "420px" }}>
            <div className="card p-4">
                <h1 className="h4 mb-4 text-center">הרשמה</h1>
                {serverError && (
                    <div className="alert alert-danger" role="alert">
                        {serverError}
                    </div>
                )}
                <form onSubmit={handleSubmit(onSubmit)} noValidate>
                    <div className="mb-3">
                        <label className="form-label" htmlFor="name">
                            שם מלא
                        </label>
                        <input
                            id="name"
                            type="text"
                            autoComplete="name"
                            className={`form-control${errors.name ? " is-invalid" : ""}`}
                            aria-invalid={!!errors.name}
                            aria-describedby={errors.name ? "name-error" : undefined}
                            {...register("name")}
                        />
                        {errors.name && (
                            <div id="name-error" className="invalid-feedback">
                                {errors.name.message}
                            </div>
                        )}
                    </div>
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
                            autoComplete="new-password"
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
                    <div className="mb-3">
                        <label className="form-label" htmlFor="confirmPassword">
                            אימות סיסמה
                        </label>
                        <input
                            id="confirmPassword"
                            type="password"
                            autoComplete="new-password"
                            className={`form-control${errors.confirmPassword ? " is-invalid" : ""}`}
                            aria-invalid={!!errors.confirmPassword}
                            aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
                            {...register("confirmPassword")}
                        />
                        {errors.confirmPassword && (
                            <div id="confirmPassword-error" className="invalid-feedback">
                                {errors.confirmPassword.message}
                            </div>
                        )}
                    </div>
                    <button type="submit" className="btn btn-primary w-100" disabled={isSubmitting}>
                        {isSubmitting ? "נרשם..." : "הרשמה"}
                    </button>
                </form>
                <p className="text-center mt-3 mb-0">
                    כבר יש לך חשבון? <Link to="/login" state={location.state}>התחברות</Link>
                </p>
            </div>
        </div>
    );
};

export default Register;
