import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
// Ajout de la fonction pour calculer le temps écoulé
export function getElapsedTime(postDate: string): string {
  try {
    // Supposons que postDate est au format "DD/MM/YYYY"
    const [day, month, year] = postDate.split("/").map(Number);
    const date = new Date(year, month - 1, day); // month - 1 car les mois commencent à 0 en JavaScript
    const now = new Date();

    const diffInDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (isNaN(diffInDays)) return "Date inconnue";
    if (diffInDays === 0) return "Aujourd'hui";
    if (diffInDays === 1) return "Hier";
    if (diffInDays < 7) return `Il y a ${diffInDays} jours`;
    if (diffInDays < 30) return `Il y a ${Math.floor(diffInDays / 7)} semaines`;
    if (diffInDays < 365) return `Il y a ${Math.floor(diffInDays / 30)} mois`;
    return `Il y a ${Math.floor(diffInDays / 365)} ans`;
  } catch (error) {
    console.error("Erreur lors de la conversion de la date", error);
    return "Date inconnue";
  }
}
