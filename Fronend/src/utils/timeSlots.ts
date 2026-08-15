import { WorkingHour } from "../types/business";

const SLOT_INCREMENT_MINUTES = 30;

const toMinutes = (hhmm: string): number => {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
};

const toHHMM = (totalMinutes: number): string => {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

// Generates candidate "HH:mm" start-time slots for a given calendar date,
// based on the business's own working hours for that date's weekday and the
// selected service's duration - not a real availability/booking engine (the
// backend has none), just a simple, explainable 30-minute-increment picker.
// Overlap with existing appointments is still enforced server-side; this
// only narrows the UI to slots that could plausibly work.
export const getAvailableTimeSlots = (workingHours: WorkingHour[], date: Date, durationMinutes: number): string[] => {
    const dayOfWeek = date.getDay(); // 0=Sun..6=Sat, matches Business.workingHours.day
    const entry = workingHours.find((wh) => wh.day === dayOfWeek);
    if (!entry || !entry.isOpen || !entry.startTime || !entry.endTime) {
        return [];
    }

    const openMinutes = toMinutes(entry.startTime);
    const closeMinutes = toMinutes(entry.endTime);
    const lastPossibleStart = closeMinutes - durationMinutes;

    const slots: string[] = [];
    for (let minutes = openMinutes; minutes <= lastPossibleStart; minutes += SLOT_INCREMENT_MINUTES) {
        slots.push(toHHMM(minutes));
    }
    return slots;
};

// Combines a "YYYY-MM-DD" date string and an "HH:mm" time string into a real
// JS Date using the local multi-argument constructor - never string
// concatenation-then-parsing, which has an inconsistent UTC-vs-local
// interpretation gotcha in JS (a date-only ISO string parses as UTC
// midnight, but a date-time ISO string without an offset parses as local
// time instead). The multi-arg constructor always uses the machine's local
// timezone; since the target users are in Israel, the resulting real
// instant is then correctly re-derived Israel-local by the backend
// regardless of what timezone this code happens to run in.
export const combineDateAndTime = (dateStr: string, timeStr: string): Date => {
    const [year, month, day] = dateStr.split("-").map(Number);
    const [hour, minute] = timeStr.split(":").map(Number);
    return new Date(year, month - 1, day, hour, minute, 0, 0);
};

// Filters out slots that are already in the past - only meaningful when the
// selected date is today.
export const isSlotInFuture = (dateStr: string, timeStr: string): boolean =>
    combineDateAndTime(dateStr, timeStr).getTime() > Date.now();
