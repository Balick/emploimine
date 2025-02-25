"use server";

import { createClient } from "@supabase/supabase-js";

// Initialiser le client Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function getOffers() {
  try {
    const { data: offers, error } = await supabase
      .from("offers")
      .select("*")
      .order("date", { ascending: false });

    if (error) throw error;

    return offers;
  } catch (error) {
    console.error("Erreur lors de la récupération des offres :", error);
    throw new Error(`Impossible de récupérer les offres : ${error}`);
  }
}

export async function getOffer(id: string) {
  try {
    const { data: offer, error } = await supabase
      .from("offers")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;

    return offer;
  } catch (error) {
    console.error("Erreur lors de la récupération de l'offre :", error);
    throw new Error(`Impossible de récupérer l'offre : ${error}`);
  }
}
