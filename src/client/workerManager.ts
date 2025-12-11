/**
 * Web Worker Manager for img2mcstructure
 * Provides promise-based API for offloading heavy computation to a worker
 */

import type {
  Axis,
  IBlock,
  IMcStructure,
  PaletteSource,
} from "../types.ts";
import type {
  WorkerMessageType,
  WorkerRequest,
  WorkerResponse,
  SerializableFrame,
} from "./worker.ts";
import createPalette from "./palette.ts";
import rotateStructure from "./rotate.ts";

// Re-export SerializableFrame for external use
export type { SerializableFrame };

/**
 * Serializable decoded frames for worker communication
 */
export type WorkerDecodedFrames = SerializableFrame[];

/**
 * Manager class for the conversion worker
 */
class ConversionWorkerManager {
  private worker: Worker | null = null;
  private messageId = 0;
  private pendingRequests = new Map<number, {
    resolve: (value: unknown) => void;
    reject: (reason: unknown) => void;
  }>();
  private workerUrl: string | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize the worker with a URL to the worker script
   * @param workerUrl URL to the worker script (e.g., './worker.js')
   */
  async init(workerUrl: string): Promise<void> {
    if (this.worker) {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      try {
        this.workerUrl = workerUrl;
        this.worker = new Worker(workerUrl, { type: "module" });

        this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
          const { id, success, result, error } = event.data;
          const pending = this.pendingRequests.get(id);

          if (pending) {
            this.pendingRequests.delete(id);
            if (success) {
              pending.resolve(result);
            } else {
              pending.reject(new Error(error));
            }
          }
        };

        this.worker.onerror = (error) => {
          console.error("Worker error:", error);
          // Reject all pending requests
          for (const [id, pending] of this.pendingRequests) {
            pending.reject(new Error(`Worker error: ${error.message}`));
            this.pendingRequests.delete(id);
          }
        };

        resolve();
      } catch (err) {
        reject(err);
      }
    });

    return this.initPromise;
  }

  /**
   * Check if the worker is initialized
   */
  isInitialized(): boolean {
    return this.worker !== null;
  }

  /**
   * Terminate the worker
   */
  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.initPromise = null;

      // Reject all pending requests
      for (const [id, pending] of this.pendingRequests) {
        pending.reject(new Error("Worker terminated"));
        this.pendingRequests.delete(id);
      }
    }
  }

  /**
   * Send a message to the worker and wait for response
   */
  private async sendMessage<T>(
    type: WorkerMessageType,
    payload: unknown,
    transferables?: Transferable[]
  ): Promise<T> {
    if (!this.worker) {
      throw new Error("Worker not initialized. Call init() first.");
    }

    const id = ++this.messageId;
    const request: WorkerRequest = { id, type, payload };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
      });

      if (transferables && transferables.length > 0) {
        this.worker!.postMessage(request, transferables);
      } else {
        this.worker!.postMessage(request);
      }
    });
  }

  /**
   * Decode an image file in the worker
   * @param data Image data as ArrayBuffer
   * @param options Decode options
   * @returns Decoded frames
   */
  async decode(
    data: ArrayBuffer,
    options?: { clamp?: boolean }
  ): Promise<WorkerDecodedFrames> {
    return this.sendMessage<WorkerDecodedFrames>("decode", { data, options }, [data]);
  }

  /**
   * Construct mcstructure data from frames in the worker
   * @param frames Decoded frames
   * @param palette Block palette
   * @param axis Axis orientation
   * @returns Mcstructure data object
   */
  async constructMcstructure(
    frames: WorkerDecodedFrames,
    palette: IBlock[],
    axis: Axis = "x"
  ): Promise<IMcStructure> {
    return this.sendMessage<IMcStructure>("constructMcstructure", {
      frames,
      palette,
      axis,
    });
  }

  /**
   * Construct schematic data from frames in the worker
   */
  async constructSchematic(
    frames: WorkerDecodedFrames,
    palette: IBlock[],
    axis: Axis = "x"
  ): Promise<unknown> {
    return this.sendMessage<unknown>("constructSchematic", {
      frames,
      palette,
      axis,
    });
  }

  /**
   * Construct NBT data from frames in the worker
   */
  async constructNbt(
    frames: WorkerDecodedFrames,
    palette: IBlock[],
    axis: Axis = "x"
  ): Promise<unknown> {
    return this.sendMessage<unknown>("constructNbt", {
      frames,
      palette,
      axis,
    });
  }

  /**
   * Serialize data to NBT format in the worker
   * @param data Structure data
   * @param options NBT options
   * @returns Serialized NBT as Uint8Array
   */
  async serializeNbt(
    data: object,
    options: { endian: "little" | "big"; name?: string }
  ): Promise<Uint8Array> {
    return this.sendMessage<Uint8Array>("serializeNbt", { data, options });
  }

  /**
   * Parse a VOX file in the worker
   * @param data VOX file data
   * @returns Parsed VOX data
   */
  async parseVox(data: ArrayBuffer): Promise<{
    size: { x: number; y: number; z: number };
    voxels: Array<{ x: number; y: number; z: number; colorIndex: number }>;
    palette: Array<{ r: number; g: number; b: number; a: number }>;
  }> {
    return this.sendMessage("parseVox", { data }, [data]);
  }

  /**
   * Batch get nearest colors for optimization
   * @param colors Array of RGB colors
   * @param palette Block palette
   * @returns Array of nearest blocks
   */
  async getNearestColors(
    colors: Array<[number, number, number]>,
    palette: IBlock[]
  ): Promise<IBlock[]> {
    return this.sendMessage<IBlock[]>("getNearestColors", { colors, palette });
  }
}

// Singleton instance
let workerManager: ConversionWorkerManager | null = null;

/**
 * Get the singleton worker manager instance
 */
export function getWorkerManager(): ConversionWorkerManager {
  if (!workerManager) {
    workerManager = new ConversionWorkerManager();
  }
  return workerManager;
}

/**
 * Initialize the worker with a URL to the worker script
 * @param workerUrl URL to the worker script
 */
export async function initWorker(workerUrl: string): Promise<void> {
  const manager = getWorkerManager();
  await manager.init(workerUrl);
}

/**
 * Check if the worker is available and initialized
 */
export function isWorkerAvailable(): boolean {
  return workerManager?.isInitialized() ?? false;
}

/**
 * Terminate the worker
 */
export function terminateWorker(): void {
  if (workerManager) {
    workerManager.terminate();
    workerManager = null;
  }
}

// High-level conversion functions that use the worker

/**
 * Decode an image file using the worker
 * @param file File object
 * @param options Decode options
 * @returns Decoded frames
 */
export async function decodeFileWithWorker(
  file: File,
  options?: { clamp?: boolean }
): Promise<WorkerDecodedFrames> {
  const manager = getWorkerManager();
  const buffer = await file.arrayBuffer();
  return manager.decode(buffer, options);
}

/**
 * Convert a file to mcstructure using the worker
 * @param file Input file
 * @param options Conversion options
 * @returns Mcstructure data as Uint8Array
 */
export async function img2mcstructureWithWorker(
  file: File,
  options: {
    palette: PaletteSource | IBlock[];
    axis?: Axis;
    name?: string;
    decodeOptions?: { clamp?: boolean };
  }
): Promise<Uint8Array> {
  const manager = getWorkerManager();
  const { palette, axis = "x", name = "img2mcstructure", decodeOptions } = options;

  // Decode the image
  const buffer = await file.arrayBuffer();
  const frames = await manager.decode(buffer, decodeOptions);

  // Create palette if needed
  const blockPalette = Array.isArray(palette) ? palette : createPalette(palette);

  // Construct the structure
  const structure = await manager.constructMcstructure(frames, blockPalette, axis);

  // Rotate if needed
  const rotated = axis !== "x" ? rotateStructure(structure, axis) : structure;

  // Serialize to NBT
  return manager.serializeNbt(rotated, { endian: "little", name });
}

/**
 * Convert a file to schematic using the worker
 * @param file Input file
 * @param options Conversion options
 * @returns Schematic data as Uint8Array
 */
export async function img2schematicWithWorker(
  file: File,
  options: {
    palette: PaletteSource | IBlock[];
    axis?: Axis;
    name?: string;
    decodeOptions?: { clamp?: boolean };
  }
): Promise<Uint8Array> {
  const manager = getWorkerManager();
  const { palette, axis = "x", name = "img2schematic", decodeOptions } = options;

  // Decode the image
  const buffer = await file.arrayBuffer();
  const frames = await manager.decode(buffer, decodeOptions);

  // Create palette if needed
  const blockPalette = Array.isArray(palette) ? palette : createPalette(palette);

  // Construct the structure
  const structure = await manager.constructSchematic(frames, blockPalette, axis);

  // Serialize to NBT
  return manager.serializeNbt(structure, { endian: "big" });
}

/**
 * Convert a file to NBT using the worker
 * @param file Input file
 * @param options Conversion options
 * @returns NBT data as Uint8Array
 */
export async function img2nbtWithWorker(
  file: File,
  options: {
    palette: PaletteSource | IBlock[];
    axis?: Axis;
    decodeOptions?: { clamp?: boolean };
  }
): Promise<Uint8Array> {
  const manager = getWorkerManager();
  const { palette, axis = "x", decodeOptions } = options;

  // Decode the image
  const buffer = await file.arrayBuffer();
  const frames = await manager.decode(buffer, decodeOptions);

  // Create palette if needed
  const blockPalette = Array.isArray(palette) ? palette : createPalette(palette);

  // Construct the structure
  const structure = await manager.constructNbt(frames, blockPalette, axis);

  // Serialize to NBT
  return manager.serializeNbt(structure, { endian: "big" });
}

export { ConversionWorkerManager };
