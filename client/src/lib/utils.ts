import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getUserLandingRoute(
  userType?: string | null,
  role?: string | null,
) {
  // Use userType if available, otherwise fall back to role for backward compatibility
  const type = userType || (role === "Admin" ? "admin" : role === "Teacher" ? "teacher" : role === "Student" ? "student" : "website_user");
  
  switch (type) {
    case "admin":
      return "/admin/console";
    case "teacher":
      return "/teacher";
    case "student":
      return "/student";
    case "website_user":
    default:
      return "/dashboard";
  }
}

// Backward compatibility
export function getRoleLandingRoute(role?: string | null) {
  return getUserLandingRoute(null, role);
}
