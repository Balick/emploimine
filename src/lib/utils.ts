import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Ajout de la fonction pour calculer le temps écoulé
export function getElapsedTime(postDate: string): string {
  try {
    // Supposons que postDate est au format "DD/MM/YYYY"
    const [day, month, year] = postDate.split("/").map(Number);
    const date = new Date(year, month - 1, day);
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

export function formatDateKCCJobDate(dateString: string): string {
  if (!dateString) {
    return "";
  }

  const moisMapping: Record<string, string> = {
    "janv.": "01",
    "févr.": "02",
    mars: "03",
    "avr.": "04",
    mai: "05",
    juin: "06",
    "juil.": "07",
    août: "08",
    "sept.": "09",
    "oct.": "10",
    "nov.": "11",
    "déc.": "12",
    jan: "01",
    feb: "02",
    mar: "03",
    apr: "04",
    may: "05",
    jun: "06",
    jul: "07",
    aug: "08",
    sep: "09",
    oct: "10",
    nov: "11",
    dec: "12",
    "jan,": "01",
    "feb,": "02",
    "mar,": "03",
    "apr,": "04",
    "jun,": "06",
    "jul,": "07",
    "aug,": "08",
    "sep,": "09",
    "oct,": "10",
    "nov,": "11",
    "dec,": "12",
    january: "01",
    february: "02",
    march: "03",
    april: "04",
    may_long: "05",
    june: "06",
    july: "07",
    august: "08",
    september: "09",
    october: "10",
    november: "11",
    december: "12",
  };

  const moisMappingNormalise: Record<string, string> = Object.keys(
    moisMapping
  ).reduce((acc, key) => {
    const normalizedKey = key.toLowerCase().replace(/[.,\s]*$/g, "");
    // @ts-expect-error - Les clés de l'objet sont des chaînes
    acc[normalizedKey] = moisMapping[key];
    return acc;
  }, {});

  let jour: string, moisNom: string, annee: string;
  let parts: string[];

  if (dateString.includes(",")) {
    parts = dateString.split(/[\s,]+/);
    if (parts.length !== 3) {
      return dateString;
    }
    // Tentative de gérer "Jour Mois,Année" en plus de "Mois Jour,Année"
    if (isNaN(Number(parts[0])) && !isNaN(Number(parts[1]))) {
      // Si le premier élément n'est pas un nombre mais le deuxième l'est, on assume "Mois Jour,Année" (comportement précédent)
      [moisNom, jour, annee] = parts;
    } else {
      // Sinon, on assume "Jour Mois,Année" (nouveau format)
      [jour, moisNom, annee] = parts;
    }
  } else {
    const match = dateString.match(/^(\d{1,2})\s*([^\d\s]+)\s*(\d{4})$/);
    if (!match) {
      return dateString;
    }
    [, jour, moisNom, annee] = match;
  }

  const moisNomNormalise = moisNom.toLowerCase().replace(/[.,\s]*$/g, "");
  const mois = moisMappingNormalise[moisNomNormalise];

  if (!mois) {
    return dateString;
  }

  return `${jour.padStart(2, "0")}/${mois}/${annee}`;
}
