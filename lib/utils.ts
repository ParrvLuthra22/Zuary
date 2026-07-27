import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/** 2999 → "₹2,999". Rupees in, never paise. */
export const formatINR = (rupees: number) => inr.format(rupees);

/** 1 → "SERIES 01" */
export const seriesLabel = (n: number) =>
  `Series ${String(n).padStart(2, "0")}`;
