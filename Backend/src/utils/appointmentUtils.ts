const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Extracts the Israel-local weekday (0=Sun..6=Sat, matching
// Business.workingHours.day) and "HH:mm" from a stored UTC Date. Using
// Intl.DateTimeFormat with an explicit timeZone (instead of .getDay()/
// .getHours()) keeps this correct no matter what timezone the server itself
// happens to run in.
export const getIsraelDateParts = (date: Date): { dayOfWeek: number; hhmm: string } => {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Jerusalem",
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).formatToParts(date);

    const weekday = parts.find((p) => p.type === "weekday")!.value;
    const hour = parts.find((p) => p.type === "hour")!.value;
    const minute = parts.find((p) => p.type === "minute")!.value;

    return { dayOfWeek: WEEKDAYS.indexOf(weekday), hhmm: `${hour}:${minute}` };
};

export const computeEndDateTime = (startDateTime: Date, durationMinutes: number): Date => {
    return new Date(startDateTime.getTime() + durationMinutes * 60000);
};

interface WorkingHourEntry {
    day: number;
    isOpen: boolean;
    startTime?: string | null;
    endTime?: string | null;
}

// The appointment must start and end within the same Israel-local day, and
// entirely inside that day's configured working hours. No overnight
// appointments in v1.
export const isWithinWorkingHours = (
    workingHours: WorkingHourEntry[],
    startDateTime: Date,
    endDateTime: Date
): boolean => {
    const start = getIsraelDateParts(startDateTime);
    const end = getIsraelDateParts(endDateTime);

    if (start.dayOfWeek !== end.dayOfWeek) {
        return false;
    }

    const entry = workingHours.find((w) => w.day === start.dayOfWeek);
    if (!entry || !entry.isOpen || !entry.startTime || !entry.endTime) {
        return false;
    }

    return start.hhmm >= entry.startTime && end.hhmm <= entry.endTime;
};
