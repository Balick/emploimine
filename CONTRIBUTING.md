# Contribuer à EmploiMine

Merci de votre intérêt ! EmploiMine est un projet communautaire : toute aide est bienvenue,
qu'il s'agisse de signaler un site carrière qui manque, de corriger un bug ou d'améliorer
l'interface.

- [Mettre en place le projet](#mettre-en-place-le-projet)
- [Ajouter une source d'offres](#ajouter-une-source-doffres) (la contribution la plus utile)
- [Règles de scraping](#règles-de-scraping)
- [Proposer une modification](#proposer-une-modification)

## Mettre en place le projet

Prérequis : Node.js 24 (voir `.nvmrc`) et npm.

```bash
git clone https://github.com/Balick/emploimine.git
cd emploimine
npm ci
```

**Pour travailler sur une source, aucune base de données n'est nécessaire** :

```bash
npm run scrape -- --source=kobold-metals --dry-run          # résumé
npm run scrape -- --source=kobold-metals --dry-run --json   # offres en JSON
npm test                                                    # tests hors-ligne
```

Pour lancer le site, il faut un projet [Supabase](https://supabase.com) (gratuit) :

1. créez un projet, puis exécutez `supabase/migrations/*.sql` dans l'éditeur SQL
   (ou `npx supabase db push` avec la CLI) ;
2. copiez `.env.example` en `.env.local` et renseignez les clés ;
3. remplissez la base : `npm run scrape -- --no-email` ;
4. lancez `npm run dev` et ouvrez http://localhost:3000.

Avant d'ouvrir une pull request : `npm run lint && npm run typecheck && npm test`.

> **Windows** : lancez les tests depuis un terminal dont le chemin commence par `C:\`
> (majuscule). Avec `c:\`, Vitest charge deux fois ses modules et échoue avec
> « Vitest failed to find the current suite ».

## Ajouter une source d'offres

Une source est un fichier `src/lib/scraper/sources/<id>.ts` qui renvoie les offres
**situées en RDC** et **actuellement ouvertes** d'un site. Le runner s'occupe du reste :
validation, nettoyage du HTML, dédoublonnage, enregistrement, envoi de la newsletter.

### 1. Trouver la meilleure façon de lire le site

Par ordre de préférence :

1. **Une API JSON ou un flux RSS public.** Ouvrez l'onglet *Réseau* des outils de
   développement de votre navigateur sur la page carrières et regardez les requêtes
   XHR/Fetch. Beaucoup d'entreprises utilisent un logiciel de recrutement (ATS) qui en
   expose un, et **un adaptateur existe peut-être déjà** dans `src/lib/scraper/adapters/` :

   | ATS | Reconnaître l'URL | Adaptateur |
   | --- | --- | --- |
   | Greenhouse | `boards.greenhouse.io/<board>` | `greenhouse.ts` |
   | Workday | `<tenant>.wd3.myworkdayjobs.com/<site>` | `workday.ts` |
   | SAP SuccessFactors | pages `/search/?q=` avec `optionsFacetsDD_country` | `successfactors.ts` |
   | SmartRecruiters | `jobs.smartrecruiters.com/<company>` | `smartrecruiters.ts` |
   | Manatal | `careers-page.com/<slug>` | `manatal.ts` |
   | Talent-soft (Cegid) | `<tenant>.talent-soft.com` | `talentsoft.ts` |
   | Simplify.hr | `<tenant>.simplify.hr` | `simplify.ts` |
   | Oracle HCM | `…oraclecloud.com/hcmUI/CandidateExperience` | `oracle-hcm.ts` |

2. **Du HTML rendu côté serveur**, lu avec [cheerio](https://cheerio.js.org/).
3. En dernier recours seulement, un navigateur headless : ouvrez d'abord une issue pour en
   discuter.

### 2. Écrire la source

Partez d'un exemple existant. Avec un adaptateur, quelques lignes suffisent
(`sources/kobold-metals.ts`) :

```ts
/**
 * KoBold Metals DRC: lithium exploration at Manono (Tanganyika).
 * Endpoint: Greenhouse public Job Board API, board "koboldmetalsdrc".
 * robots.txt: API host, no restriction. Verified 2026-11-14 (8 DRC offers).
 */
import { greenhouse } from "../adapters/greenhouse";
import { defineSource } from "../types";

export default defineSource({
  id: "kobold-metals",
  name: "KoBold Metals",
  website: "https://job-boards.greenhouse.io/koboldmetalsdrc",
  kind: "employer", // employer | contractor | recruiter | job_board
  scrape: (ctx) => greenhouse(ctx, { board: "koboldmetalsdrc", company: "KoBold Metals" }),
});
```

Sans adaptateur, implémentez `scrape(ctx)` vous-même. Le contrat complet est documenté
dans `src/lib/scraper/types.ts`. En résumé :

- faites **toutes** les requêtes avec `ctx.http.text()` / `ctx.http.json()` (jamais `fetch`
  directement) : elles s'identifient, respectent un délai entre deux requêtes et réessaient
  en cas d'erreur ;
- ne gardez que les offres en RDC (`isInDrc()`), avec un `externalId` **stable** (l'identifiant
  de l'ATS de préférence) ;
- utilisez les helpers de `utils.ts` : `parseDate` (dates en ISO), `findDrcCity`,
  `normalizeContractType` ;
- laissez un champ à `null` plutôt que de deviner ;
- **levez une erreur** si la page n'a plus la structure attendue : une source cassée doit se
  voir, pas renvoyer silencieusement zéro offre.

Puis ajoutez la source à la liste de `src/lib/scraper/sources/index.ts`.

### 3. Tester

1. Vérifiez en conditions réelles :
   `npm run scrape -- --source=<id> --dry-run --json`.
2. Enregistrez une **petite** réponse réelle dans
   `src/lib/scraper/sources/__fixtures__/<id>/` (quelques offres, descriptions raccourcies,
   au moins une offre hors RDC si le site en mélange).
3. Écrivez `src/lib/scraper/sources/<id>.test.ts` sur le modèle de `kobold-metals.test.ts` :
   le test tourne **hors-ligne** grâce à `fixtureContext()`.

## Règles de scraping

EmploiMine doit rester un bon citoyen du web, et les sites que nous lisons doivent pouvoir
nous faire confiance :

- **respectez `robots.txt`**, y compris `Crawl-delay` (à déclarer dans `HOST_DELAYS_MS`,
  `src/lib/scraper/run.ts`), et indiquez ce que vous avez vérifié en tête du fichier ;
- **ne vous faites pas passer pour un navigateur** : le User-Agent du bot pointe vers ce
  dépôt. Si un site bloque les bots, on ne le scrape pas ;
- **pas de sites dont les conditions d'utilisation interdisent le scraping** (LinkedIn,
  Indeed, Glassdoor…), pas de contournement de captcha ou de protection anti-bot ;
- limitez le nombre de requêtes : la liste, puis les pages de détail des seules offres
  en RDC.

Vous connaissez un site sans pouvoir écrire la source ? Ouvrez une issue « Nouvelle source » :
quelqu'un d'autre pourra s'en charger.

## Proposer une modification

1. Créez une branche depuis `master`.
2. Utilisez des messages de commit [Conventional Commits](https://www.conventionalcommits.org/fr/) :
   `feat(sources): add Sandvik`, `fix(ui): …`, `docs: …`.
3. Vérifiez `npm run lint && npm run typecheck && npm test`.
4. Ouvrez une pull request en décrivant ce qui change et comment vous l'avez testé.
