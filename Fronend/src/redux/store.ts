import { configureStore } from "@reduxjs/toolkit";
import businessesReducer from "./businessesSlice";
import categoriesReducer from "./categoriesSlice";
import appointmentsReducer from "./appointmentsSlice";
import reviewsReducer from "./reviewsSlice";

export const store = configureStore({
    reducer: {
        businesses: businessesReducer,
        categories: categoriesReducer,
        appointments: appointmentsReducer,
        reviews: reviewsReducer,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
