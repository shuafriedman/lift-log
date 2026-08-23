"use client";

import { useForm, SubmitHandler, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
    ProfileFormValues,
    profileSchema,
    ProfileFormInput
} from "@/lib/validation";
import { useUserStore } from "@/store/userStore";

interface ProfileData {
    height: number | null;
    weight: number | null;
}

export function ProfileForm() {
    const router = useRouter();
    const setUser = useUserStore((state) => state.setUser);
    const [isLoading, setIsLoading] = useState(false);
    const [isDataLoading, setIsDataLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<ProfileFormInput>({
        resolver: zodResolver(profileSchema) as Resolver<ProfileFormInput>,
        defaultValues: {
            height: "",
            weight: "",
        },
    });

    useEffect(() => {
        async function fetchProfile() {
            try {
                const response = await fetch("/api/profile");
                if (!response.ok) throw new Error("Failed to fetch profile data.");

                const data: ProfileData = await response.json();

                reset({
                    height: data.height?.toString() ?? "",
                    weight: data.weight?.toString() ?? "",
                });
            } catch (err) {
                setError(err instanceof Error ? err.message : "Error fetching data.");
            } finally {
                setIsDataLoading(false);
            }
        }
        fetchProfile();
    }, [reset]);

    const onSubmit: SubmitHandler<ProfileFormValues> = async (data) => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    height: data.height,
                    weight: data.weight,
                }),
            });

            if (!response.ok) {
                const e = await response.json();
                throw new Error(e.message || "Failed to update profile.");
            }

            setUser((prev) => ({
                ...prev!,
                height: data.height ?? undefined,
                weight: data.weight ?? undefined,
            }));

            // Clear the dirty state, confirm, then continue to the dashboard.
            reset({
                height: data.height != null ? String(data.height) : "",
                weight: data.weight != null ? String(data.weight) : "",
            });
            setSaved(true);
            router.push("/dashboard");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Update failed.");
        } finally {
            setIsLoading(false);
        }
    };

    if (isDataLoading) {
        return <div className="text-center p-4 text-muted-foreground">Loading...</div>;
    }

    return (
        <form
            onSubmit={handleSubmit(onSubmit as SubmitHandler<ProfileFormInput>)}
            className="mx-auto max-w-sm space-y-5 rounded-2xl border border-border bg-card p-5 text-left text-card-foreground shadow-md md:p-8"
        >
            <h2 className="text-2xl font-bold tracking-tight">Body Metrics</h2>

            {/* Height */}
            <div className="space-y-1.5">
                <label htmlFor="height" className="text-sm font-medium">
                    Height (cm)
                </label>
                <input
                    id="height"
                    type="number"
                    inputMode="numeric"
                    enterKeyHint="next"
                    className="h-12 w-full rounded-md border border-border bg-background px-3 text-base"
                    placeholder="e.g., 175"
                    {...register("height")}
                />
                {errors.height && (
                    <p className="text-sm text-destructive">{errors.height.message}</p>
                )}
            </div>

            {/* Weight */}
            <div className="space-y-1.5">
                <label htmlFor="weight" className="text-sm font-medium">
                    Weight (kg)
                </label>
                <input
                    id="weight"
                    type="number"
                    inputMode="decimal"
                    enterKeyHint="done"
                    step="0.1"
                    className="h-12 w-full rounded-md border border-border bg-background px-3 text-base"
                    placeholder="e.g., 75.5"
                    {...register("weight")}
                />
                {errors.weight && (
                    <p className="text-sm text-destructive">{errors.weight.message}</p>
                )}
            </div>

            {error && (
                <p className="text-sm text-destructive bg-destructive/10 p-2 rounded border border-destructive/20">
                    {error}
                </p>
            )}

            {saved && !error && (
                <p className="text-sm text-emerald-400 bg-emerald-500/10 p-2 rounded border border-emerald-500/20">
                    Saved! Taking you to your dashboard…
                </p>
            )}

            <button
                type="submit"
                disabled={isLoading || saved}
                className={`
          h-12 w-full rounded-xl px-4 text-base font-semibold
          transition
          ${isLoading || saved
                        ? "bg-muted text-muted-foreground cursor-not-allowed"
                        : "bg-emerald-500 hover:bg-emerald-600 text-black"
                    }
        `}
            >
                {isLoading ? "Saving..." : saved ? "Saved!" : "Save Profile"}
            </button>
        </form>
    );
}
