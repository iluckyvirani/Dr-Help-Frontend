import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    // Add more slices here as modules are integrated:
    // opd: opdReducer,
    // ipd: ipdReducer,
    // rooms: roomsReducer,
    // doctors: doctorsReducer,
    // patients: patientsReducer,
    // billing: billingReducer,
    // services: servicesReducer,
    // expenses: expensesReducer,
    // reports: reportsReducer,
    // settings: settingsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
