import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function isValidPhone(phone: string): boolean {
  // Allows optional +, spaces, dashes, parentheses. Requires at least 10 digits.
  const phoneRegex = /^\+?[\d\s-]{10,}$/
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10
}
