import ShareButtons from "@/components/share-buttons";
import Sidebar from "@/components/sidebar";
import { Button } from "@/components/ui/button";
//import { scrapeGlencoreJobItem } from "@/lib/scraper";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default async function Page({ params }: { params: { job: string } }) {
  //const data = await scrapeGlencoreJobItem(params.job);

  return (
    <main className="min-h-screen main py-10">
      <Link href={"/"} className="flex items-center gap-2">
        <Button className="bg-[#f8f7f4] hover:bg-[#fffdf6] text-black rounded-full flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" />
          <span className="text-[13px] font-[600]">Toutes les offres</span>
        </Button>
      </Link>
      <div className="mt-[32px] max-w-[1152px] mx-auto flex flex-col md:flex-row gap-[60px]">
        <div className="grow">
          <span className="block font-mona leading-[22px] text-[16px] font-medium">
            Détails de l&apos;offre
          </span>
          <h1 className="leading-[29px] md:leading-[38px] font-bold text-[24px] md:text-[32px] font-mona">
            Ingénieur(e) en sécurité des procédés
          </h1>
          <ShareButtons />

          <div className="font-mona mt-[40px] text-[16px] font-[400] leading-[28px]">
            <strong className="mb-4">Objectifs principaux du poste</strong>
            <p className="mb-4">
              Sous la supervision directe du chef de département -gestion des
              risques, le/la titulaire de ce poste devra se concentrer sur
              l’amélioration des normes d’intégrité technique et de sécurité des
              procédés à l’usine de traitement MUMI. Il/Elle devra assurer
              l’intégration des équipes, le leadership, le soutien et
              l’orientation en ce qui concerne la sécurité des procédés et
              l’ingénierie en rapport à l’intégrité technique.
            </p>

            <strong className="mb-4">Qualification minimale</strong>
            <ul className="mb-4 list-disc ml-4">
              <li>
                <span>
                  Posséder un diplôme de licence en ingénierie chimique ou dans
                  un domaine similaire.
                </span>
              </li>
              <li>
                <span>
                  Certification dans la gestion de la sécurité des procédés est
                  un atout.
                </span>
              </li>
            </ul>

            <strong className="mb-4">Expériences Requises</strong>
            <ul className="mb-4 list-disc ml-4">
              <li>
                <span>
                  Démontrer une expérience trois (3) ans minimum dans la gestion
                  de la sécurité des procédés, d’ingénierie, d’intégrité et 2
                  ans minimum dans la gestion des risques opérationnels.
                </span>
              </li>
            </ul>

            <strong className="mb-4">Compétences requises</strong>
            <ul className="mb-4 list-disc ml-4">
              <li>
                <span>
                  Capacité à identifier et à évaluer les dangers et recommander
                  les actions correctives,
                </span>
              </li>
              <li>
                <span>Communication interpersonnelle et interculturelle,</span>
              </li>
              <li>
                <span>La maitrise de l’Anglais est un atout,</span>
              </li>
              <li>
                <span>
                  Familiarité avec les logiciels d’ingénierie de la sécurité des
                  procédés, et
                </span>
              </li>
              <li>
                <span>
                  Maitrise des réactions chimiques dans un environnement de
                  traitement du cuivre et du cobalt.
                </span>
              </li>
            </ul>

            <strong className="mb-4">Responsabilités-clés</strong>
            <ul className="mb-4 list-disc ml-4">
              <li>
                <span>
                  Examiner et mettre en œuvre les normes d’intégrité technique
                  et d’ingénierie de la sécurité des processus conformément aux
                  normes de Glencore.
                </span>
              </li>
              <li>
                <span>
                  Fournir un encadrement et un soutien aux responsables du site
                  sur l’intégrité technique et les normes d’ingénierie de la
                  sécurité des processus.
                </span>
              </li>
              <li>
                <span>
                  Mettre en œuvre les activités d’assurance pour que les risques
                  liés à l’intégrité technique soient gérés de manière adéquate,
                </span>
              </li>
              <li>
                <span>
                  Élaborer, contribuer et examiner, analyser les dangers liés au
                  processus et d’autres activités pertinentes de sécurité des
                  procédés.
                </span>
              </li>
              <li>
                <span>
                  Se conformer aux exigences et procédures de Glencore en
                  matière de la gestion de l’environnement ainsi qu’à la
                  politique environnementale de MUMI SARL.
                </span>
              </li>
            </ul>
          </div>
        </div>
        <Sidebar />
      </div>
    </main>
  );
}
