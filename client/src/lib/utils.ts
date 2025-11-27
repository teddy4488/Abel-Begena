import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getRoleLandingRoute(role?: string | null) {
  switch (role) {
    case "Admin":
      return "/admin/console";
    case "Teacher":
      return "/teacher";
    default:
      return "/dashboard";
  }
}

