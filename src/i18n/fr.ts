export const fr = {
  "app.title": "Audio Convert",
  "app.tagline": "Convertissez vos fichiers audio directement dans votre navigateur.",
  "app.privacy": "Vos fichiers ne quittent jamais votre appareil.",
  "lang.label": "Langue",
  "dropzone.title": "Déposez vos fichiers audio ici",
  "dropzone.hint": "ou cliquez pour les sélectionner",
  "options.format": "Format de sortie",
  "options.bitrate": "Débit",
  "compression.lossy": "avec perte",
  "compression.lossless": "sans perte",
  "compression.uncompressed": "non compressé",
  "warning.lossy-to-lossless":
    "{count} fichier(s) déjà compressé(s) avec perte : les convertir vers ce format ne retrouvera pas la qualité d'origine, le fichier sera seulement plus lourd.",
  "warning.lossy-to-lossy":
    "{count} fichier(s) déjà compressé(s) avec perte : un nouvel encodage dégrade légèrement la qualité.",
  "actions.convert": "Convertir ({count})",
  "actions.converting": "Conversion en cours…",
  "actions.clear": "Vider la liste",
  "actions.remove": "Retirer",
  "actions.download": "Télécharger",
  "status.pending": "En attente",
  "status.converting": "Conversion… {percent} %",
  "status.done": "Terminé · {size}",
  "status.error": "Échec : {message}",
  "status.unknownError": "erreur inconnue",
  "engine.loading": "Chargement du moteur de conversion (environ 30 Mo, une seule fois)…",
  "engine.error": "Impossible de charger le moteur de conversion. Vérifiez votre connexion puis réessayez.",
  "footer.engine": "Propulsé par ffmpeg.wasm",
};

export type MessageKey = keyof typeof fr;
