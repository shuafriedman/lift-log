"use client";

import { useState, useEffect } from "react";
import { useUserStore } from "@/store/userStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
// Wait, I didn't check for toast library. I'll stick to basic alert or console for now if not sure, but let's check package.json or just implementing basic logic.
// Actually, I saw "sonner" is common. Let me check package.json first? No, I should just implement it robustly.
// Let's assume standard fetch pattern first, maybe add toast later if confirmed.
// I see I didn't check for toast package. I'll look at the file list again.
// src/components has `ui/` but no `toast.tsx` or `sonner.tsx` visible in previous `list_dir`.
// But wait, `list_dir` of `src/components/ui` showed:
// avatar, button, card, carousel, dialog, dropdown-menu, input, label, separator, sheet, sidebar, skeleton, tabs, tooltip.
// No toast/sonner. I will handle errors with simple state message or console for now to be safe.

export default function MissingProfileDataPrompt() {
    const { user, setUser } = useUserStore();
    const [open, setOpen] = useState(false);
    const [height, setHeight] = useState("");
    const [weight, setWeight] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (user && (user.height === null || user.height === undefined || user.weight === null || user.weight === undefined)) {
            setOpen(true);
        } else {
            setOpen(false);
        }
    }, [user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const res = await fetch("/api/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ height, weight }),
            });

            if (!res.ok) {
                const data = await res.json(); // Try to get error message
                throw new Error(data.message || "Failed to update profile");
            }

            // Update local store on success
            if (user) {
                setUser({
                    ...user,
                    height: Number(height),
                    weight: Number(weight)
                });
            }
            setOpen(false);

        } catch (err: unknown) {
            console.error(err);
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
                {/* Prevent closing by clicking outside or escape to ensure data is entered? 
            The requirement is "prompt if not in profile". Usually this implies required.
            I'll make it persistent (cannot close without entering) for now as it seems critical?
            Actually, let's allow closing (onOpenChange) so they aren't STUCK, but it will pop up again next load.
            Wait, I'll block closing for better UX if it's "missing data". 
            But `onOpenChange` is required by Dialog type usually.
            I will blocking "outside" clicks.
        */}
                <DialogHeader>
                    <DialogTitle>Complete Your Profile</DialogTitle>
                    <DialogDescription>
                        Please enter your height and weight to get the best experience.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <div className="grid w-full items-center gap-1.5">
                        <Label htmlFor="height">Height (cm)</Label>
                        <Input
                            id="height"
                            type="number"
                            inputMode="numeric"
                            enterKeyHint="next"
                            placeholder="e.g. 175"
                            value={height}
                            onChange={(e) => setHeight(e.target.value)}
                            required
                            min={50}
                            max={300}
                        />
                    </div>
                    <div className="grid w-full items-center gap-1.5">
                        <Label htmlFor="weight">Weight (kg)</Label>
                        <Input
                            id="weight"
                            type="number"
                            inputMode="decimal"
                            enterKeyHint="done"
                            placeholder="e.g. 70"
                            value={weight}
                            onChange={(e) => setWeight(e.target.value)}
                            required
                            min={20}
                            max={500}
                        />
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Saving..." : "Save Details"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
