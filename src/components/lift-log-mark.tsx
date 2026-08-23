"use client";

import { useId } from "react";

/**
 * The LiftLog dumbbell mark.
 *
 * This used to be copy-pasted into six files, every copy declaring the same
 * `liftlogGradient` id. Duplicate ids in one document are a real bug — the
 * browser resolves `fill="url(#liftlogGradient)"` to whichever gradient it saw
 * first, so a mark could silently render with another mark's colours. `useId`
 * gives each instance its own id.
 */
export default function LiftLogMark({
  className,
  size,
}: {
  className?: string;
  size?: number;
}) {
  const gradientId = useId();

  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      width={size}
      height={size}
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id={gradientId}
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
        fill={`url(#${gradientId})`}
      />
    </svg>
  );
}
