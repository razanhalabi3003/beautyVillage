import { FC } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { z } from "zod";

const HEBREW_DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

// One entry per fixed day index (0-6) - duplicate days are impossible by
// construction, since the array is always exactly 7 long and rendered by
// index, never dynamically added/removed.
export const workingHourSchema = z
    .object({
        day: z.number(),
        isOpen: z.boolean(),
        startTime: z.string().optional(),
        endTime: z.string().optional(),
    })
    .refine((entry) => !entry.isOpen || (!!entry.startTime && !!entry.endTime && entry.endTime > entry.startTime), {
        message: "יש להזין שעת פתיחה וסגירה תקינות (שעת הסגירה מאוחרת משעת הפתיחה)",
        path: ["endTime"],
    });

export type WorkingHourFormValue = z.infer<typeof workingHourSchema>;

export const defaultWorkingHours: WorkingHourFormValue[] = Array.from({ length: 7 }, (_, day) => ({
    day,
    isOpen: false,
    startTime: "09:00",
    endTime: "18:00",
}));

interface WorkingHoursFormValues {
    workingHours: WorkingHourFormValue[];
}

// Reads/writes through the parent form's React Hook Form context
// (FormProvider) rather than prop-drilled control/register - the standard
// RHF pattern for a reusable nested-array sub-form like this one.
const WorkingHoursEditor: FC = () => {
    const {
        control,
        register,
        watch,
        formState: { errors },
    } = useFormContext<WorkingHoursFormValues>();
    const { fields } = useFieldArray({ control, name: "workingHours" });
    const values = watch("workingHours");
    const hasWorkingHoursError = !!errors.workingHours;

    return (
        <div>
            <div className="table-responsive">
                <table className="table align-middle mb-2">
                    <thead>
                        <tr>
                            <th>יום</th>
                            <th>פתוח</th>
                            <th>שעת פתיחה</th>
                            <th>שעת סגירה</th>
                        </tr>
                    </thead>
                    <tbody>
                        {fields.map((field, index) => {
                            const isOpen = values?.[index]?.isOpen ?? false;
                            return (
                                <tr key={field.id}>
                                    <td className="text-nowrap">{HEBREW_DAYS[index]}</td>
                                    <td>
                                        <div className="form-check form-switch m-0">
                                            <input
                                                type="checkbox"
                                                className="form-check-input"
                                                role="switch"
                                                aria-label={`${HEBREW_DAYS[index]} פתוח`}
                                                {...register(`workingHours.${index}.isOpen`)}
                                            />
                                        </div>
                                    </td>
                                    <td>
                                        <input
                                            type="time"
                                            className="form-control form-control-sm"
                                            disabled={!isOpen}
                                            aria-label={`${HEBREW_DAYS[index]} שעת פתיחה`}
                                            {...register(`workingHours.${index}.startTime`)}
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="time"
                                            className="form-control form-control-sm"
                                            disabled={!isOpen}
                                            aria-label={`${HEBREW_DAYS[index]} שעת סגירה`}
                                            {...register(`workingHours.${index}.endTime`)}
                                        />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            {hasWorkingHoursError && (
                <div className="text-danger small">
                    יש לתקן את שעות הפעילות - עבור כל יום פתוח יש להזין שעת פתיחה וסגירה תקינות (שעת הסגירה מאוחרת
                    משעת הפתיחה)
                </div>
            )}
        </div>
    );
};

export default WorkingHoursEditor;
