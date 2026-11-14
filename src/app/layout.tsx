import Footer from "@/components/footer";
import Header from "@/components/header";
import { Toaster } from "@/components/ui/sonner";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const sourceSerifProRegular = localFont({
  src: "./fonts/SourceSerifPro-Regular.ttf",
  variable: "--font-source-serif-pro",
  weight: "400",
});

const monaSans = localFont({
  src: "./fonts/Mona-Sans.ttf",
  variable: "--font-mona-sans",
  weight: "400",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME} | Emplois dans les mines en RDC`, template: `%s | ${SITE_NAME}` },
  description:
    "Offres d'emploi du secteur minier en République démocratique du Congo : entreprises minières, sous-traitants et cabinets de recrutement.",
  applicationName: SITE_NAME,
  openGraph: { siteName: SITE_NAME, locale: "fr_CD", type: "website" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body className={`${sourceSerifProRegular.variable} ${monaSans.variable} antialiased`}>
        <Toaster />
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
