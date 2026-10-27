export type Compression = "lossy" | "lossless" | "uncompressed";

export interface OutputFormat {
  id: string;
  label: string;
  extension: string;
  mime: string;
  compression: Compression;
  /** Arguments ffmpeg propres au codec (après `-i`). */
  codecArgs: (options: ConversionOptions) => string[];
}

export interface ConversionOptions {
  /** Débit en kb/s, utilisé uniquement par les formats avec perte. */
  bitrate: number;
}

export const BITRATES = [96, 128, 160, 192, 256, 320] as const;
export const DEFAULT_BITRATE = 192;

export const OUTPUT_FORMATS: OutputFormat[] = [
  {
    id: "mp3",
    label: "MP3",
    extension: "mp3",
    mime: "audio/mpeg",
    compression: "lossy",
    codecArgs: ({ bitrate }) => ["-c:a", "libmp3lame", "-b:a", `${bitrate}k`],
  },
  {
    id: "aac",
    label: "AAC (M4A)",
    extension: "m4a",
    mime: "audio/mp4",
    compression: "lossy",
    codecArgs: ({ bitrate }) => ["-c:a", "aac", "-b:a", `${bitrate}k`],
  },
  {
    id: "opus",
    label: "Opus",
    extension: "opus",
    mime: "audio/ogg",
    compression: "lossy",
    // libopus plante dans @ffmpeg/core 0.12 (« memory access out of bounds ») : on utilise
    // l'encodeur Opus natif de ffmpeg, qui n'accepte que 48 kHz et la stéréo (ou le mono).
    codecArgs: ({ bitrate }) => ["-c:a", "opus", "-strict", "-2", "-ar", "48000", "-ac", "2", "-b:a", `${bitrate}k`],
  },
  {
    id: "vorbis",
    label: "Ogg Vorbis",
    extension: "ogg",
    mime: "audio/ogg",
    compression: "lossy",
    codecArgs: ({ bitrate }) => ["-c:a", "libvorbis", "-b:a", `${bitrate}k`],
  },
  {
    id: "flac",
    label: "FLAC",
    extension: "flac",
    mime: "audio/flac",
    compression: "lossless",
    codecArgs: () => ["-c:a", "flac", "-compression_level", "5"],
  },
  {
    id: "alac",
    label: "ALAC (M4A)",
    extension: "m4a",
    mime: "audio/mp4",
    compression: "lossless",
    codecArgs: () => ["-c:a", "alac"],
  },
  {
    id: "wav",
    label: "WAV",
    extension: "wav",
    mime: "audio/wav",
    compression: "uncompressed",
    codecArgs: () => ["-c:a", "pcm_s16le"],
  },
  {
    id: "aiff",
    label: "AIFF",
    extension: "aiff",
    mime: "audio/aiff",
    compression: "uncompressed",
    codecArgs: () => ["-c:a", "pcm_s16be"],
  },
];

export function getOutputFormat(id: string): OutputFormat {
  return OUTPUT_FORMATS.find((format) => format.id === id) ?? OUTPUT_FORMATS[0];
}

/**
 * Nature probable d'un fichier source, déduite de son extension.
 * `.m4a`, `.mp4`, `.mkv`… peuvent contenir aussi bien de l'AAC que de l'ALAC : on renvoie `unknown`.
 */
const INPUT_COMPRESSION: Record<string, Compression> = {
  mp3: "lossy",
  aac: "lossy",
  ogg: "lossy",
  oga: "lossy",
  opus: "lossy",
  wma: "lossy",
  amr: "lossy",
  ac3: "lossy",
  eac3: "lossy",
  dts: "lossy",
  mp2: "lossy",
  spx: "lossy",
  webm: "lossy",
  flac: "lossless",
  ape: "lossless",
  wv: "lossless",
  tta: "lossless",
  wav: "uncompressed",
  aif: "uncompressed",
  aiff: "uncompressed",
  caf: "uncompressed",
};

export function getExtension(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot > 0 ? fileName.slice(dot + 1).toLowerCase() : "";
}

export function guessInputCompression(fileName: string): Compression | "unknown" {
  return INPUT_COMPRESSION[getExtension(fileName)] ?? "unknown";
}

export type QualityWarning = "lossy-to-lossless" | "lossy-to-lossy";

export function getQualityWarning(fileName: string, target: OutputFormat): QualityWarning | null {
  if (guessInputCompression(fileName) !== "lossy") return null;
  return target.compression === "lossy" ? "lossy-to-lossy" : "lossy-to-lossless";
}

/** Arguments complets pour ffmpeg. `-vn` ignore la vidéo et les pochettes intégrées. */
export function buildArgs(input: string, output: string, target: OutputFormat, options: ConversionOptions): string[] {
  return ["-i", input, "-vn", "-map_metadata", "0", ...target.codecArgs(options), output];
}

export function outputFileName(inputName: string, target: OutputFormat): string {
  const dot = inputName.lastIndexOf(".");
  const base = dot > 0 ? inputName.slice(0, dot) : inputName;
  return `${base}.${target.extension}`;
}
