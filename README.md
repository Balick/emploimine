# EmploiMine

**Les offres d'emploi du secteur minier en République démocratique du Congo, au même endroit.**

Les entreprises minières de la RDC, leurs sous-traitants et les cabinets de recrutement
publient leurs offres sur des dizaines de sites différents. EmploiMine les récupère
automatiquement plusieurs fois par jour, les affiche sur un site unique avec recherche et
filtres, et prévient les abonnés à la newsletter dès qu'une nouvelle offre apparaît.

Le projet est open source : vous pouvez [ajouter une source](CONTRIBUTING.md#ajouter-une-source-doffres),
signaler un problème ou améliorer le site.

## Sources

<!-- SOURCES:START -->
| Type | Sources | Méthode |
| --- | --- | --- |
| Entreprises minières | Glencore (KCC, Mutanda), Barrick (Kibali), Ivanhoe Mines (Kipushi), Kamoa Copper, KoBold Metals (Manono) | API JSON, HTML |
| Sous-traitants et fournisseurs | BIA (Komatsu), Epiroc, Orica, Metso, Hatch, Weir Minerals, SGS, Trafigura, AGL, CIS | API Workday, SAP SuccessFactors, RSS Talent-soft, HTML |
| Cabinets de recrutement miniers | Kilele DRC, Gladys Synergies | API Manatal |
| Sites d'emploi | Mediacongo, MINING.COM | HTML (offres minières uniquement, sans doublons des sources ci-dessus) |

Le 14 novembre 2026, ces 19 sources donnaient **127 offres en RDC**, principalement à Kolwezi,
Lubumbashi et Durba.

Sites étudiés mais non scrapés : LinkedIn, Indeed et Glassdoor (conditions d'utilisation),
Sandvik (`robots.txt`), MMG Kinsevere (protection anti-robots), Emploi.cd et AfricaWork
(Cloudflare), Optioncarrière (`robots.txt`). ERG (Boss Mining, Metalkol, Frontier) ne publie
que sur LinkedIn et Chemaf recrute uniquement par email.
<!-- SOURCES:END -->

Un site manque ? [Proposez-le](https://github.com/Balick/emploimine/issues/new?template=new-source.yml).

## Fonctionnement

```
GitHub Actions (toutes les 6 h)
  └─ npm run scrape
       ├─ src/lib/scraper/sources/*.ts   une source par site (API JSON, RSS ou HTML)
       ├─ run.ts                         validation (zod), nettoyage du HTML, dédoublonnage
       ├─ store.ts                       enregistrement dans Supabase (clé service_role)
       └─ newsletter.ts                  email récapitulatif des nouvelles offres
Next.js (Vercel)
  └─ lit les offres dans Supabase avec la clé publique (lecture seule, RLS)
```

- **Aucun service payant** : les sources sont lues avec de simples requêtes HTTP (API publiques
  des logiciels de recrutement, flux RSS, HTML), sans navigateur ni proxy.
- **Robuste** : une source en panne n'empêche pas les autres d'être mises à jour, et le workflow
  GitHub échoue visiblement pour qu'on la répare.
- **Respectueux** : le bot s'identifie, respecte `robots.txt` et son `Crawl-delay`, et ne lit
  pas les sites qui interdisent le scraping.
- Une offre qui disparaît de sa source, ou dont la date limite est passée, rejoint
  l'**historique**.
- **Newsletter respectueuse** : double confirmation de l'inscription, un email par abonné
  (personne ne voit les autres adresses), lien de désabonnement en un clic. La première
  exécution d'une nouvelle source n'envoie rien, pour ne pas inonder les abonnés.

## Démarrage rapide

Prérequis : Node.js 24 et un projet [Supabase](https://supabase.com) gratuit.

```bash
npm ci
cp .env.example .env.local          # puis renseignez les clés Supabase
npm run scrape -- --dry-run         # teste les sources sans base de données
npm run scrape -- --no-email        # remplit la base
npm run dev                         # http://localhost:3000
```

Le schéma de la base se trouve dans [`supabase/migrations/`](supabase/migrations) : exécutez-le
dans l'éditeur SQL de Supabase, ou avec `npx supabase db push`.

| Commande | Rôle |
| --- | --- |
| `npm run dev` | site en développement |
| `npm run scrape -- [--source=a,b] [--dry-run] [--json] [--no-email]` | lance le scraper |
| `npm test` | tests des sources, hors-ligne |
| `npm run lint` / `npm run typecheck` | qualité du code |

## Déploiement

1. **Base** : appliquez `supabase/migrations/*.sql` sur votre projet Supabase.
2. **Site** : déployez sur Vercel avec `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY` (inscriptions à la newsletter), `NEXT_PUBLIC_SITE_URL` et,
   pour les emails, les variables `SMTP_*` (voir [`.env.example`](.env.example)).
3. **Scraper** : dans *Settings → Secrets and variables → Actions* du dépôt GitHub, ajoutez les
   secrets `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`,
   `SMTP_PASSWORD`, `EMAIL_FROM` et la variable `SITE_URL`. Le workflow
   [`scrape.yml`](.github/workflows/scrape.yml) tourne toutes les 6 heures et peut être lancé à
   la main (onglet *Actions*).

> GitHub désactive les workflows planifiés d'un dépôt public après 60 jours sans activité :
> un commit, ou un clic sur *Enable workflow*, les réactive.

### Migrer une base créée avant 2026

L'ancienne version stockait les dates en texte (`jj/mm/aaaa`) dans les tables `offers` et
`emails`, accessibles avec la clé publique. Pour conserver ces données :

1. exécutez [`supabase/legacy/migrate-from-v0.sql`](supabase/legacy/migrate-from-v0.sql) : il
   renomme les anciennes tables et les rend inaccessibles à la clé publique ;
2. exécutez [`supabase/migrations/20261114120000_init.sql`](supabase/migrations) ;
3. lancez `npm run migrate:legacy -- --dry-run`, puis `npm run migrate:legacy` : les anciennes
   offres rejoignent l'historique (descriptions nettoyées, anciens liens toujours valides) et
   les abonnés sont conservés ;
4. vérifiez le site, puis supprimez `offers_legacy` et `emails_legacy`.

## Contribuer

Toutes les contributions sont bienvenues : voir [CONTRIBUTING.md](CONTRIBUTING.md).

## Licence

[MIT](LICENSE) : vous pouvez utiliser, modifier et redistribuer le code librement, en
conservant la mention de copyright.
