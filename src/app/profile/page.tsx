"use client";

import HandleLogout from "@/components/handle-logout";
import { useUserStore } from "@/store/userStore";
import EditProfileDialog from "@/components/edit-profile-dialog";
import Image from "next/image";
import MissingProfileDataPrompt from "@/components/missing-profile-data-prompt";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Ruler, Weight, Flame, Mail } from "lucide-react";

interface StreakData {
  streak: number;
}

export default function Profile() {
  const { user, setUser } = useUserStore();
  const [streak, setStreak] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);

  // Fetch streak once
  useEffect(() => {
    const fetchStreak = async () => {
      try {
        const res = await fetch("/api/streak", { credentials: "include" });
        if (!res.ok) return;
        const data: StreakData = await res.json();
        setStreak(data.streak ?? 0);
      } catch (err) {
        console.error(err);
      }
    };

    fetchStreak();
  }, []);

  // Fetch profile only once, or when we haven't loaded it yet.
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/profile", { credentials: "include" });
        if (!res.ok) throw new Error("Failed to fetch profile data");
        const data = await res.json();
        setUser((prev) => ({ ...prev, ...data }));
      } catch (err) {
        console.error(err);
      } finally {
        setProfileLoaded(true);
        setLoading(false);
      }
    };

    if (!profileLoaded) {
      fetchProfile();
    }
  }, [profileLoaded, setUser]);

  // Loading UI
  if (loading || !user) {
    return (
      <div className="flex min-h-[60dvh] items-center justify-center bg-black text-white">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
          className="text-2xl font-bold tracking-widest uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-500"
        >
          Loading...
        </motion.div>
      </div>
    );
  }



  return (
    <motion.div
      className="px-4 py-5 md:p-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="mx-auto max-w-4xl">
        <MissingProfileDataPrompt />

        {/* Header Section */}
        <div className="mb-6 flex flex-col items-center gap-5 rounded-2xl border border-neutral-800 bg-black/20 p-5 shadow-lift-gradient backdrop-blur-sm md:flex-row md:gap-8 md:p-8">
          <div className="relative group">
            <div className="relative h-24 w-24 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 p-[2px] md:h-40 md:w-40">
              <div className="w-full h-full rounded-full border-4 border-black overflow-hidden relative">
                {user.image ? (
                  <Image
                    src={user.image}
                    fill
                    alt="User Image"
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-4xl font-bold text-emerald-500">
                    {user.name?.[0] ?? "U"}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 text-center md:text-left space-y-3">
            <h1 className="text-2xl font-bold tracking-tight break-words text-white md:text-5xl">
              {user.name}
            </h1>
            <div className="flex items-center justify-center gap-2 font-medium text-gray-400 md:justify-start">
              <Mail className="h-4 w-4 shrink-0" />
              <span className="truncate text-sm md:text-base">{user.email}</span>
            </div>
            <div className="pt-2">
              <EditProfileDialog />
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="mb-8 grid grid-cols-3 gap-3 md:gap-6">
          {/* Height Card */}
          <motion.div
            className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-neutral-800/70 bg-black/20 p-3 shadow-lift-gradient backdrop-blur-xl md:gap-4 md:p-6"
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10 text-blue-400 md:h-12 md:w-12">
              <Ruler className="h-5 w-5 md:h-6 md:w-6" />
            </div>
            <div className="text-center">
              <p className="mb-1 text-[11px] font-medium tracking-wider text-gray-400 uppercase md:text-sm">Height</p>
              <p className="text-xl font-bold text-white md:text-3xl">
                {user.height ? <span className="text-blue-100">{user.height}</span> : <span className="text-gray-600 text-xl">--</span>}
                <span className="text-sm text-gray-500 ml-1 font-normal">cm</span>
              </p>
            </div>
          </motion.div>

          {/* Weight Card */}
          <motion.div
            className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-neutral-800/70 bg-black/20 p-3 shadow-lift-gradient backdrop-blur-xl md:gap-4 md:p-6"
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 md:h-12 md:w-12">
              <Weight className="h-5 w-5 md:h-6 md:w-6" />
            </div>
            <div className="text-center">
              <p className="mb-1 text-[11px] font-medium tracking-wider text-gray-400 uppercase md:text-sm">Weight</p>
              <p className="text-xl font-bold text-white md:text-3xl">
                {user.weight ? <span className="text-emerald-100">{user.weight}</span> : <span className="text-gray-600 text-xl">--</span>}
                <span className="text-sm text-gray-500 ml-1 font-normal">kg</span>
              </p>
            </div>
          </motion.div>

          {/* Streak Card */}
          <motion.div
            className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-neutral-800/70 bg-black/20 p-3 shadow-lift-gradient backdrop-blur-xl md:gap-4 md:p-6"
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/10 text-orange-400 md:h-12 md:w-12">
              <Flame className="h-5 w-5 md:h-6 md:w-6" />
            </div>
            <div className="text-center">
              <p className="mb-1 text-[11px] font-medium tracking-wider text-gray-400 uppercase md:text-sm">Streak</p>
              <p className="text-xl font-bold text-white md:text-3xl">
                <span className="text-orange-100">{streak}</span>
                <span className="text-sm text-gray-500 ml-1 font-normal">days</span>
              </p>
            </div>
          </motion.div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-center">
          <HandleLogout />
        </div>
      </div>
    </motion.div>
  );
}

