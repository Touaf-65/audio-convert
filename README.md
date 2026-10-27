# Audio Convert

Convertisseur de formats audio qui fonctionne **entièrement dans le navigateur** grâce à [ffmpeg.wasm](https://github.com/ffmpegwasm/ffmpeg.wasm) : aucun fichier n'est envoyé sur un serveur.

Interface disponible en français et en anglais.

## Formats

- **En entrée** : tout ce que ffmpeg sait lire (MP3, AAC/M4A, Ogg, Opus, FLAC, ALAC, WAV, AIFF, WMA, APE, WavPack, AC-3…), y compris la piste audio des vidéos (MP4, MKV, MOV, WebM).
- **En sortie** :

| Format | Type | Réglage |
|---|---|---|
| MP3, AAC (M4A), Opus, Ogg Vorbis | Avec perte | Débit de 96 à 320 kb/s |
| FLAC, ALAC (M4A) | Sans perte | — |
| WAV, AIFF | Non compressé (PCM 16 bits) | — |

L'application signale les conversions qui n'apportent rien (avec perte → sans perte) ou qui dégradent la qualité (avec perte → avec perte).

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

## Licence

Ce projet est distribué sous licence [GNU GPL v3 ou ultérieure](LICENSE).

Il embarque [ffmpeg.wasm](https://github.com/ffmpegwasm/ffmpeg.wasm), dont le cœur (`@ffmpeg/core`) est sous licence GPL-2.0 ou ultérieure ; la GPL-3.0 est compatible avec cette licence.
