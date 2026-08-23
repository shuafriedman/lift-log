import Link from "next/link";
import { Home, Dumbbell, List, BarChart, Timer } from "lucide-react";
import { useUserStore } from "@/store/userStore";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "../ui/sidebar";
import { usePathname } from "next/navigation";

export default function AppSidebar() {
  const user = useUserStore((state) => state.user);
  const pathname = usePathname();

  const menuItems = [
    { name: "Dashboard", href: "/dashboard", icon: <Home size={20} /> },
    { name: "Sessions", href: "/sessions", icon: <Timer size={20} /> },
    { name: "Workouts", href: "/workouts", icon: <Dumbbell size={20} /> },
    { name: "Exercises", href: "/exercises", icon: <List size={20} /> },
    { name: "Progress", href: "/progress", icon: <BarChart size={20} /> },
  ];

  return (
    <Sidebar className="bg-neutral-900 text-white border-r border-white/10">
      <SidebarHeader className="p-4 gap-3">
        <div className="flex items-center gap-2">
          <svg
            width="50"
            height="50"
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient
                id="liftlogGradient"
                x1="0"
                y1="0"
                x2="64"
                y2="64"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="50%" stopColor="#5eead4" />
                <stop offset="100%" stopColor="#14b8a6" />
              </linearGradient>
            </defs>

            <path
              d="M10 26H6V38H10V26ZM18 22H14V42H18V22ZM26 30V26H22V38H26V34H36L30 40L34 44L48 30L34 16L30 20L36 26H26ZM50 22H46V42H50V22ZM58 26H54V38H58V26Z"
              fill="url(#liftlogGradient)"
            />
          </svg>

          <h1 className="text-xl font-bold tracking-wide">LiftLog</h1>
        </div>
      </SidebarHeader>

      <SidebarContent className="flex flex-col gap-1 px-2 mt-2">
        {menuItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors font-semibold hover:text-emerald-500"
            >
              <span className={isActive ? "text-emerald-400" : "text-white"}>
                {item.icon}
              </span>

              <span
                className={
                  isActive
                    ? "bg-gradient-to-br from-emerald-400 via-teal-300 to-teal-500 text-transparent bg-clip-text"
                    : "text-white"
                }
              >
                {item.name}
              </span>
            </Link>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="mt-auto p-2">
        <Link
          href="/profile"
          className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors
            font-semibold"
        >
          <Avatar>
            <AvatarImage src={user?.image} />
            <AvatarFallback>
              {user?.name?.[0]?.toUpperCase() ?? "U"}
            </AvatarFallback>
          </Avatar>
          <span>{user?.name ?? "User"}</span>
        </Link>
      </SidebarFooter>
    </Sidebar>
  );
}
