import { z } from "zod";

// --- Workout Schema ---
export const workoutSchema = z.object({
    name: z.string(),
    exercises: z.array(z.number()).nonempty("selected at least one exercise")
});

// --- Exercise Schema ---
export const exerciseSchema = z.object({
    name: z.string().min(1, "Name is required"),
    sets: z.int(),
    reps: z.int(),
    // Set when the exercise was picked from the shared catalog.
    catalogId: z.string().min(1).nullable().optional(),
})

// PATCH /api/exercise — update the library prescription (sets/reps/name).
export const exerciseUpdateSchema = z
    .object({
        id: z.coerce.number().int().positive(),
        name: z.string().trim().min(1).optional(),
        sets: z.coerce.number().int().min(0).optional(),
        reps: z.coerce.number().int().min(0).optional(),
    })
    .refine(
        (d) => d.sets !== undefined || d.reps !== undefined || d.name !== undefined,
        { message: "Nothing to update" }
    );

// --- Progress Schema ---
export const progressSchema = z.object({
    streak: z.number().min(0),
    weight: z.number().optional() // Changed float32 to number, as JS numbers are floats
})

// --- Session Schemas ---
// Start an on-the-fly session (name optional).
export const sessionCreateSchema = z.object({
    name: z.string().trim().max(100).optional(),
});

// Add / edit a single exercise logged inside a session.
export const sessionExerciseSchema = z.object({
    name: z.string().trim().min(1, "Exercise name is required").max(100),
    exerciseId: z.number().int().positive().nullable().optional(),
    // Set when the exercise was picked from the shared catalog.
    catalogId: z.string().min(1).nullable().optional(),
    sets: z.number().int().min(0).nullable().optional(),
    reps: z.number().int().min(0).nullable().optional(),
    weight: z.number().min(0).nullable().optional(),
    // When true and the exercise isn't already in the library, save it there.
    saveToLibrary: z.boolean().optional(),
});

export const sessionExerciseUpdateSchema = z.object({
    entryId: z.number().int().positive(),
    name: z.string().trim().min(1).max(100).optional(),
    sets: z.number().int().min(0).nullable().optional(),
    reps: z.number().int().min(0).nullable().optional(),
    weight: z.number().min(0).nullable().optional(),
});

export const profileSchema = z.object({
    // Input is string, Output is number | null | undefined
    height: z.string()
        .transform((val) => (val === "" ? null : Number(val)))
        .nullable()
        .refine((val) => val === null || (val >= 50 && val <= 300), {
            message: "Height must be between 50 and 300 cm.",
        })
        .optional(),
    // Weight... (similar logic)
    weight: z.string()
        .transform((val) => (val === "" ? null : Number(val)))
        .nullable()
        .refine((val) => val === null || (val >= 20 && val <= 500), {
            message: "Weight must be between 20 and 500 kg.",
        })
        .optional(),
});

// Server-side schema for PUT /api/profile. Callers are inconsistent: some send
// height/weight as strings (raw inputs), ProfileForm sends numbers (already
// transformed by its resolver). Accept both, normalizing "" / null → null.
const toNullableNumber = (min: number, max: number, label: string) =>
    z
        .preprocess(
            (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
            z
                .number()
                .refine((n) => !Number.isNaN(n), { message: `${label} must be a number.` })
                .refine((n) => n >= min && n <= max, {
                    message: `${label} must be between ${min} and ${max}.`,
                })
                .nullable()
        )
        .optional();

export const apiProfileSchema = z.object({
    height: toNullableNumber(50, 300, "Height"),
    weight: toNullableNumber(20, 500, "Weight"),
});

// The final transformed output type (for API/Zustand update)
export type ProfileFormValues = z.infer<typeof profileSchema>;

// The raw input type (for useForm defaultValues)
export type ProfileFormInput = {
    height?: string | null | undefined;
    weight?: string | null | undefined;
};