"use client";

import { useState, useEffect } from "react";
import { useUserStore } from "@/store/userStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Pencil } from "lucide-react"; // Assuming lucide-react is available as is often the case with shadcn

export default function EditProfileDialog() {
    const { user, setUser } = useUserStore();
    const [open, setOpen] = useState(false);
    const [height, setHeight] = useState("");
    const [weight, setWeight] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Initialize with current user data when opening
    useEffect(() => {
        if (open && user) {
            setHeight(user.height ? String(user.height) : "");
            setWeight(user.weight ? String(user.weight) : "");
        }
    }, [open, user]);

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
                const data = await res.json();
                throw new Error(data.message || "Failed to update profile");
            }

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
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
                >
                    <Pencil className="w-4 h-4" />
                    Edit Profile
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Edit Profile</DialogTitle>
                    <DialogDescription>
                        Update your height and weight.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <div className="grid w-full items-center gap-1.5">
                        <Label htmlFor="edit-height">Height (cm)</Label>
                        <Input
                            id="edit-height"
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
                        <Label htmlFor="edit-weight">Weight (kg)</Label>
                        <Input
                            id="edit-weight"
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
                        <Button type="button" size="lg" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button type="submit" size="lg" disabled={loading}>
                            {loading ? "Saving..." : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
