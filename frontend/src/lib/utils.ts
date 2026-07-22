import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number | undefined | null): string {
  if (price == null || isNaN(price)) return 'E£ 0.00';
  return `E£ ${price.toFixed(2)}`;
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

export function generateSessionId(): string {
  return 'sess_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}
