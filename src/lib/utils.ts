import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface DateFormatOptions {
  locale?: string;
  timeZone?: string;
}

export const DateService = {
  parseDate: (dateString: string): Date | null => {
    try {
      // Gestion des formats de date français
      const cleanedDate = dateString.replace(
        /(\d{1,2})\s+([a-zA-Zéû]+)\s+(\d{4})/,
        (_, day, month, year) => {
          const monthMap: { [key: string]: string } = {
            janvier: "01",
            février: "02",
            mars: "03",
            avril: "04",
            mai: "05",
            juin: "06",
            juillet: "07",
            août: "08",
            septembre: "09",
            octobre: "10",
            novembre: "11",
            décembre: "12",
          };
          return `${day.padStart(2, "0")}/${
            monthMap[month.toLowerCase()]
          }/${year}`;
        }
      );

      return new Date(cleanedDate);
    } catch (error) {
      console.error("Erreur de parsing de date:", error);
      return null;
    }
  },

  formatRelativeTime: (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `Posté il y a ${days} jour${days > 1 ? "s" : ""}`;
    if (hours > 0) return `Posté il y a ${hours} heure${hours > 1 ? "s" : ""}`;
    return `Posté il y a ${minutes} minute${minutes > 1 ? "s" : ""}`;
  },

  formatFrenchDate: (date: Date): string => {
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  },
};
