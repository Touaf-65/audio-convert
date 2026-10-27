# Audio Convert

Convertisseur de formats audio qui fonctionne **entièrement dans le navigateur** grâce à [ffmpeg.wasm](https://github.com/ffmpegwasm/ffmpeg.wasm) : aucun fichier n'est envoyé sur un serveur.

Interface disponible en français et en anglais.

## Stack

- [Vite](https://vite.dev/) + TypeScript, sans framework
- [ffmpeg.wasm](https://ffmpegwasm.netlify.app/) (version mono-thread, aucun en-tête COOP/COEP requis)
- Hébergement : [Netlify](https://www.netlify.com/)

## Développement

Prérequis : Node.js 24 ou plus récent.

```bash
npm install
npm run dev
```

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Vérification des types puis build de production dans `dist/` |
| `npm run preview` | Sert le build de production en local |
| `npm run typecheck` | Vérification des types seule |

## Déploiement

Le fichier `netlify.toml` contient la configuration de build. Il suffit de connecter le dépôt GitHub à Netlify : chaque push sur `main` déclenche un déploiement.
