/**
 * img2mcstructure Demo Application
 * Client-side image to Minecraft structure converter
 */

import {
  img2mcstructure,
  img2mcfunction,
  img2schematic,
  img2nbt,
  createPalette,
  downloadMcstructure,
  downloadMcfunction,
  downloadSchematic,
  downloadNbt,
  decodeFile,
  type Axis,
  type IBlock,
  type PaletteSource,
} from "../src/client/mod.ts";
import {
  palettes,
  type PaletteName,
} from "./palettes.ts";

// DOM Elements
let imageInput: HTMLInputElement;
let paletteSelect: HTMLSelectElement;
let formatSelect: HTMLSelectElement;
let axisSelect: HTMLSelectElement;
let convertBtn: HTMLButtonElement;
let previewCanvas: HTMLCanvasElement;
let statusEl: HTMLElement;
let downloadSection: HTMLElement;
let filenameInput: HTMLInputElement;

// State
let currentFile: File | null = null;
let lastResult: Uint8Array | string | null = null;
let lastFormat: string = "";

function setStatus(message: string, type: "info" | "success" | "error" = "info") {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
}

async function previewImage(file: File) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const ctx = previewCanvas.getContext("2d")!;

      // Scale to fit canvas while maintaining aspect ratio
      const maxSize = 256;
      let width = img.width;
      let height = img.height;

      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = (height / width) * maxSize;
          width = maxSize;
        } else {
          width = (width / height) * maxSize;
          height = maxSize;
        }
      }

      previewCanvas.width = width;
      previewCanvas.height = height;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, width, height);
    };
    img.src = e.target?.result as string;
  };
  reader.readAsDataURL(file);
}

function getSelectedPalette(): PaletteSource | IBlock[] {
  const paletteName = paletteSelect.value as PaletteName;
  return palettes[paletteName];
}

async function convert() {
  if (!currentFile) {
    setStatus("Please select an image file", "error");
    return;
  }

  setStatus("Converting...", "info");
  convertBtn.disabled = true;

  try {
    const palette = getSelectedPalette();
    const axis = axisSelect.value as Axis;
    const format = formatSelect.value;

    let result: Uint8Array | string;

    switch (format) {
      case "mcstructure":
        result = await img2mcstructure(currentFile, { palette, axis });
        break;
      case "mcfunction":
        result = await img2mcfunction(currentFile, { palette });
        break;
      case "schematic":
        result = await img2schematic(currentFile, { palette, axis });
        break;
      case "nbt":
        result = await img2nbt(currentFile, { palette, axis });
        break;
      default:
        throw new Error(`Unknown format: ${format}`);
    }

    lastResult = result;
    lastFormat = format;

    // Show download section
    downloadSection.style.display = "block";

    // Set default filename
    const baseName = currentFile.name.replace(/\.[^.]+$/, "");
    filenameInput.value = `${baseName}.${format}`;

    const size = typeof result === "string"
      ? new TextEncoder().encode(result).length
      : result.length;
    setStatus(`Conversion complete! Size: ${(size / 1024).toFixed(2)} KB`, "success");

  } catch (error) {
    console.error(error);
    setStatus(`Error: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
  } finally {
    convertBtn.disabled = false;
  }
}

function download() {
  if (!lastResult) {
    setStatus("No converted file to download", "error");
    return;
  }

  const filename = filenameInput.value || `structure.${lastFormat}`;

  switch (lastFormat) {
    case "mcstructure":
      downloadMcstructure(lastResult as Uint8Array, filename);
      break;
    case "mcfunction":
      downloadMcfunction(lastResult as string, filename);
      break;
    case "schematic":
      downloadSchematic(lastResult as Uint8Array, filename);
      break;
    case "nbt":
      downloadNbt(lastResult as Uint8Array, filename);
      break;
  }
}

function handleDragOver(e: DragEvent) {
  e.preventDefault();
  e.stopPropagation();
  (e.currentTarget as HTMLElement).classList.add("drag-over");
}

function handleDragLeave(e: DragEvent) {
  e.preventDefault();
  e.stopPropagation();
  (e.currentTarget as HTMLElement).classList.remove("drag-over");
}

function handleDrop(e: DragEvent) {
  e.preventDefault();
  e.stopPropagation();
  (e.currentTarget as HTMLElement).classList.remove("drag-over");

  const files = e.dataTransfer?.files;
  if (files && files.length > 0) {
    const file = files[0];
    if (file.type.startsWith("image/")) {
      currentFile = file;
      previewImage(file);
      setStatus(`Selected: ${file.name}`, "info");
      downloadSection.style.display = "none";
      lastResult = null;
    } else {
      setStatus("Please drop an image file", "error");
    }
  }
}

function init() {
  // Get DOM elements
  imageInput = document.getElementById("imageInput") as HTMLInputElement;
  paletteSelect = document.getElementById("paletteSelect") as HTMLSelectElement;
  formatSelect = document.getElementById("formatSelect") as HTMLSelectElement;
  axisSelect = document.getElementById("axisSelect") as HTMLSelectElement;
  convertBtn = document.getElementById("convertBtn") as HTMLButtonElement;
  previewCanvas = document.getElementById("previewCanvas") as HTMLCanvasElement;
  statusEl = document.getElementById("status") as HTMLElement;
  downloadSection = document.getElementById("downloadSection") as HTMLElement;
  filenameInput = document.getElementById("filenameInput") as HTMLInputElement;

  const dropZone = document.getElementById("dropZone") as HTMLElement;
  const downloadBtn = document.getElementById("downloadBtn") as HTMLButtonElement;

  // Event listeners
  imageInput.addEventListener("change", (e) => {
    const files = (e.target as HTMLInputElement).files;
    if (files && files.length > 0) {
      currentFile = files[0];
      previewImage(currentFile);
      setStatus(`Selected: ${currentFile.name}`, "info");
      downloadSection.style.display = "none";
      lastResult = null;
    }
  });

  convertBtn.addEventListener("click", convert);
  downloadBtn.addEventListener("click", download);

  // Drag and drop
  dropZone.addEventListener("dragover", handleDragOver);
  dropZone.addEventListener("dragleave", handleDragLeave);
  dropZone.addEventListener("drop", handleDrop);

  // Click on drop zone to trigger file input
  dropZone.addEventListener("click", () => imageInput.click());

  setStatus("Ready - Select an image to convert", "info");
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
