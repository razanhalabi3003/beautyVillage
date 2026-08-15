import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../redux/hooks";
import { fetchMyAppointments, fetchBusinessAppointments } from "../redux/appointmentsSlice";
import { AppointmentQuery } from "../services/appointment-service";

type Scope = "mine" | { businessId: string };

const useAppointments = (scope: Scope, params: AppointmentQuery = {}) => {
    const dispatch = useAppDispatch();
    const { mine, businessAppointments, status, error } = useAppSelector((state) => state.appointments);
    const scopeKey = scope === "mine" ? "mine" : scope.businessId;

    useEffect(() => {
        if (scope === "mine") {
            dispatch(fetchMyAppointments(params));
        } else {
            dispatch(fetchBusinessAppointments({ businessId: scope.businessId, params }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dispatch, scopeKey, JSON.stringify(params)]);

    return {
        appointments: scope === "mine" ? mine : businessAppointments,
        isLoading: status === "loading",
        error,
    };
};

export default useAppointments;
