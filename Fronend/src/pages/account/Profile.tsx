import { FC } from "react";
import useAuth from "../../custom_hooks/useAuth";
import { userRoleLabels } from "../../utils/userRole";

const Profile: FC = () => {
    const { user } = useAuth();

    if (!user) {
        return null;
    }

    return (
        <div className="container" style={{ maxWidth: "480px" }}>
            <div className="card p-4">
                <h1 className="h4 mb-4">הפרופיל שלי</h1>
                <dl className="row mb-0">
                    <dt className="col-4">שם</dt>
                    <dd className="col-8">{user.name}</dd>
                    <dt className="col-4">אימייל</dt>
                    <dd className="col-8">{user.email}</dd>
                    <dt className="col-4">סוג משתמש</dt>
                    <dd className="col-8">{userRoleLabels[user.role]}</dd>
                </dl>
            </div>
        </div>
    );
};

export default Profile;
