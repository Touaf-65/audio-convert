import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
// Le moteur est servi depuis notre propre domaine : aucun appel à un CDN tiers.
import coreURL from "@ffmpeg/core?url";
import wasmURL from "@ffmpeg/core/wasm?url";
import { buildArgs, getExtension, type ConversionOptions, type OutputFormat } from "./formats";

// Dernières lignes de log, pour expliquer un échec à l'utilisateur.
const recentLogs: string[] = [];

function createInstance(): FFmpeg {
  const instance = new FFmpeg();
  instance.on("log", ({ message }) => {
    recentLogs.push(message);
    if (recentLogs.length > 30) recentLogs.shift();
  });
  return instance;
}

let ffmpeg = createInstance();
let loading: Promise<void> | null = null;

export function isEngineLoaded(): boolean {
  return ffmpeg.loaded;
}

export function loadEngine(): Promise<void> {
  loading ??= ffmpeg
    .load({ coreURL, wasmURL })
    .then(() => undefined)
    .catch((error: unknown) => {
      loading = null;
      throw error;
    });
  return loading;
}

/** Après un plantage WebAssembly, l'instance est inutilisable : on repart d'une instance neuve. */
function resetEngine(): void {
  ffmpeg.terminate();
  ffmpeg = createInstance();
  loading = null;
}

export class ConversionError extends Error {
  constructor(public readonly logs: string[]) {
    super(logs.findLast((line) => /error|invalid|unknown|not supported/i.test(line)) ?? logs.at(-1) ?? "ffmpeg");
  }
}

let jobCounter = 0;

/**
 * Convertit un fichier. Les appels doivent être faits l'un après l'autre :
 * la version mono-thread de ffmpeg.wasm ne traite qu'une commande à la fois.
 */
export async function convert(
  file: File,
  target: OutputFormat,
  options: ConversionOptions,
  onProgress: (ratio: number) => void,
): Promise<Blob> {
  await loadEngine();

  const engine = ffmpeg;
  const id = ++jobCounter;
  const extension = getExtension(file.name);
  const input = `in_${id}${extension ? `.${extension}` : ""}`;
  const output = `out_${id}.${target.extension}`;

  const handleProgress = ({ progress }: { progress: number }) => {
    // ffmpeg renvoie parfois des valeurs hors bornes quand la durée est inconnue.
    if (progress >= 0 && progress <= 1) onProgress(progress);
  };

  recentLogs.length = 0;
  engine.on("progress", handleProgress);
  try {
    await engine.writeFile(input, await fetchFile(file));
    const exitCode = await engine.exec(buildArgs(input, output, target, options));
    if (exitCode !== 0) throw new ConversionError([...recentLogs]);

    const data = await engine.readFile(output);
    if (typeof data === "string") throw new ConversionError([...recentLogs]);
    return new Blob([data as Uint8Array<ArrayBuffer>], { type: target.mime });
  } catch (error) {
    if (error instanceof ConversionError) throw error;
    resetEngine();
    throw new ConversionError([...recentLogs, String(error)]);
  } finally {
    engine.off("progress", handleProgress);
    if (engine === ffmpeg) {
      // Libère la mémoire du système de fichiers virtuel, même en cas d'échec.
      await engine.deleteFile(input).catch(() => {});
      await engine.deleteFile(output).catch(() => {});
    }
  }
}
