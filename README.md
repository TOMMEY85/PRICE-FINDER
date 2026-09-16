# PRICE FINDER V3

Comparateur React + Netlify pour 11 revendeurs : Grosbill, Materiel.net, Cybertek, LDLC.COM, PcComponentes.fr, Rue du Commerce, Infomax Paris, Memory PC, PCSpecialist.fr, Boulanger et Maxesport.

## Installation

```bash
npm install
npx netlify dev
```

## Principe
- API officielle/gratuite lorsqu'une API shopper réellement exploitable est disponible.
- Sinon scraping côté serveur.
- Aucun faux prix.
- Prix classés par total.

Le scraper V3 lit d'abord le JSON-LD Product puis utilise des sélecteurs HTML génériques. Les sites peuvent changer leur structure ou refuser l'accès automatisé : dans ce cas la source apparaît indisponible au lieu d'inventer une valeur.
