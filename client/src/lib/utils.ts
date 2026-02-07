import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getUserLandingRoute(
  userType?: string | null,
  role?: string | null,
) {
  // SuperAdmin has dedicated area (branch admins go to /admin/console)
  if (role === "SuperAdmin") {
    return "/superadmin";
  }
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
