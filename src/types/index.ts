export interface Job {
  title: string;
  location: string;
  date: string;
  endDate: string;
  link: string;
  city: string;
  region: string;
  country: string;
  description: string;
  type: string;
  company: string;
  vacantPost: number;
  level: string;
}

export type NotificationType =
  | "WELCOME"
  | "CHANGE_OF_STOCK"
  | "LOWEST_PRICE"
  | "THRESHOLD_MET";

export type EmailContent = {
  subject: string;
  body: string;
};

export type EmailOfferInfo = {
  title: string;
  url: string;
  company: string;
  id: string;
};
