import LiftLogMark from "./lift-log-mark";

export default function Footer() {
  return (
    <footer className="mt-auto w-full border-t border-white/10 bg-white/[0.02] pb-safe">
      <div className="container mx-auto flex flex-col items-center justify-between gap-3 px-5 py-6 text-center md:flex-row md:text-left">
        <div className="flex items-center gap-2">
          <LiftLogMark className="h-10 w-10" />
          <span className="text-sm font-bold text-gray-100">Lift Log</span>
          <span className="text-sm text-gray-400">Track • Train • Transform</span>
        </div>

        <div className="text-xs text-gray-400 md:text-sm">
          © {new Date().getFullYear()} Lift Log. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
