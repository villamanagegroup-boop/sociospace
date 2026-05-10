import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Standard utility for combining Tailwind classes with conditional logic
// while letting later classes override earlier ones.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
