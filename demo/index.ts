/**
 * img2mcstructure Demo Application
 * Client-side image to Minecraft structure converter
 */

import {
  img2mcstructure,
  img2mcfunction,
  img2schematic,
  img2nbt,
  img2mcaddon,
  vox2mcstructure,
  createPalette,
  downloadMcstructure,
  downloadMcfunction,
  downloadSchematic,
  downloadNbt,
  downloadMcaddon,
  decodeFile,
  type Axis,
  type IBlock,
  type PaletteSource,
} from "../src/client/mod.ts";
import {
  palettes,
  type PaletteName,
} from "./palettes.ts";

// Constants
const CUSTOM_PALETTES_STORAGE_KEY = "img2mcstructure_custom_palettes";
const CURRENT_PALETTE_STATE_KEY = "img2mcstructure_current_palette_state";

// Interfaces
interface EditableBlock {
  id: string;
  hexColor: string;
  enabled: boolean;
  states?: Record<string, unknown>;
  version?: number;
}

interface CustomPalette {
  name: string;
  blocks: EditableBlock[];
  basePalette: string;
  createdAt: number;
}

// DOM Elements
let imageInput: HTMLInputElement;
let voxInput: HTMLInputElement;
let paletteSelect: HTMLSelectElement;
let formatSelect: HTMLSelectElement;
let axisSelect: HTMLSelectElement;
let convertBtn: HTMLButtonElement;
let previewCanvas: HTMLCanvasElement;
let statusEl: HTMLElement;
let downloadSection: HTMLElement;
let filenameInput: HTMLInputElement;
let mcaddonOptions: HTMLElement;
let gridSizeInput: HTMLInputElement;
let resolutionSelect: HTMLSelectElement;

// Palette Editor DOM Elements
let paletteEditorModal: HTMLElement;
let paletteSearchInput: HTMLInputElement;
let paletteBlockList: HTMLElement;
let enabledCountEl: HTMLElement;
let totalCountEl: HTMLElement;
let customPaletteNameInput: HTMLInputElement;
let customPalettesGroup: HTMLOptGroupElement;
let importPaletteInput: HTMLInputElement;

// State
let currentFile: File | null = null;
let currentVoxFile: File | null = null;
let lastResult: Uint8Array | string | null = null;
let lastFormat: string = "";
let inputType: "image" | "vox" = "image";

// Palette Editor State
let editableBlocks: EditableBlock[] = [];
let currentBasePalette: string = "minecraft";
let customPalettes: Map<string, CustomPalette> = new Map();

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
  const paletteName = paletteSelect.value;

  // Check if it's a custom palette
  if (paletteName.startsWith("custom:")) {
    const customName = paletteName.replace("custom:", "");
    const customPalette = customPalettes.get(customName);
    if (customPalette) {
      return editableBlocksToPaletteSource(customPalette.blocks);
    }
  }

  // Return built-in palette
  return palettes[paletteName as PaletteName];
}

// Convert editable blocks to palette source
function editableBlocksToPaletteSource(blocks: EditableBlock[]): PaletteSource {
  const source: PaletteSource = {};
  for (const block of blocks) {
    if (block.enabled) {
      if (block.states && Object.keys(block.states).length > 0) {
        source[block.id] = {
          id: block.id,
          hexColor: block.hexColor,
          color: hexToRgb(block.hexColor),
          states: block.states,
          version: block.version || 18153475,
        };
      } else {
        source[block.id] = block.hexColor;
      }
    }
  }
  return source;
}

// Helper function to convert hex to RGB array
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16),
      ]
    : [0, 0, 0];
}

async function convert() {
  const format = formatSelect.value;

  // Check if we have appropriate input
  if (inputType === "vox") {
    if (!currentVoxFile) {
      setStatus("Please select a VOX file", "error");
      return;
    }
  } else if (!currentFile) {
    setStatus("Please select an image file", "error");
    return;
  }

  setStatus("Converting...", "info");
  convertBtn.disabled = true;

  try {
    const palette = getSelectedPalette();
    const axis = axisSelect.value as Axis;

    let result: Uint8Array | string;
    let fileExtension = format;

    switch (format) {
      case "mcstructure":
        if (inputType === "vox" && currentVoxFile) {
          result = await vox2mcstructure(currentVoxFile, { palette });
        } else {
          result = await img2mcstructure(currentFile!, { palette, axis });
        }
        break;
      case "mcfunction":
        if (inputType === "vox") {
          setStatus("VOX to mcfunction is not supported. Please use mcstructure format.", "error");
          convertBtn.disabled = false;
          return;
        }
        result = await img2mcfunction(currentFile!, { palette });
        break;
      case "schematic":
        if (inputType === "vox") {
          setStatus("VOX to schematic is not supported. Please use mcstructure format.", "error");
          convertBtn.disabled = false;
          return;
        }
        result = await img2schematic(currentFile!, { palette, axis });
        break;
      case "nbt":
        if (inputType === "vox") {
          setStatus("VOX to NBT is not supported. Please use mcstructure format.", "error");
          convertBtn.disabled = false;
          return;
        }
        result = await img2nbt(currentFile!, { palette, axis });
        break;
      case "mcaddon": {
        if (inputType === "vox") {
          setStatus("VOX to mcaddon is not supported. Please use an image file.", "error");
          convertBtn.disabled = false;
          return;
        }
        const gridSize = parseInt(gridSizeInput?.value || "4", 10);
        const resolution = parseInt(resolutionSelect?.value || "16", 10);
        result = await img2mcaddon(currentFile!, { gridSize, resolution, axis });
        break;
      }
      default:
        throw new Error(`Unknown format: ${format}`);
    }

    lastResult = result;
    lastFormat = format;

    // Show download section
    downloadSection.style.display = "block";

    // Set default filename
    const sourceFile = inputType === "vox" ? currentVoxFile : currentFile;
    const baseName = sourceFile?.name.replace(/\.[^.]+$/, "") || "structure";
    filenameInput.value = `${baseName}.${fileExtension}`;

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
    case "mcaddon":
      downloadMcaddon(lastResult as Uint8Array, filename);
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
    const fileName = file.name.toLowerCase();

    // Check for VOX files
    if (fileName.endsWith(".vox")) {
      handleVoxFile(file);
    } else if (file.type.startsWith("image/") || fileName.match(/\.(png|jpg|jpeg|gif|webp|bmp)$/)) {
      currentFile = file;
      currentVoxFile = null;
      inputType = "image";
      previewImage(file);
      setStatus(`Selected: ${file.name}`, "info");
      downloadSection.style.display = "none";
      lastResult = null;
    } else {
      setStatus("Please drop an image file (.png, .jpg, .gif) or VOX file (.vox)", "error");
    }
  }
}

// ============================================
// Palette Editor Functions
// ============================================

// Load palette into editable blocks format
function loadPaletteIntoEditor(paletteName: string) {
  const palette = palettes[paletteName as PaletteName];
  if (!palette) return;

  currentBasePalette = paletteName;
  editableBlocks = [];

  if (Array.isArray(palette)) {
    // IBlock[] format (e.g., rgbPalette)
    for (const block of palette as IBlock[]) {
      editableBlocks.push({
        id: block.id,
        hexColor: block.hexColor,
        enabled: true,
        states: block.states,
        version: block.version,
      });
    }
  } else {
    // PaletteSource format (Record<string, string | IBlock>)
    for (const [id, value] of Object.entries(palette)) {
      if (typeof value === "string") {
        editableBlocks.push({
          id,
          hexColor: value,
          enabled: true,
        });
      } else {
        editableBlocks.push({
          id: value.id || id,
          hexColor: value.hexColor,
          enabled: true,
          states: value.states,
          version: value.version,
        });
      }
    }
  }

  renderPaletteBlocks();
  updatePaletteStats();
}

// Render palette blocks in the editor
function renderPaletteBlocks(filterText: string = "") {
  const filter = filterText.toLowerCase();
  paletteBlockList.innerHTML = "";

  const filteredBlocks = editableBlocks.filter(
    (block) => !filter || block.id.toLowerCase().includes(filter)
  );

  if (filteredBlocks.length === 0) {
    paletteBlockList.innerHTML = `
      <div class="empty-state">
        <p>No blocks found matching "${filterText}"</p>
      </div>
    `;
    return;
  }

  for (let i = 0; i < filteredBlocks.length; i++) {
    const block = filteredBlocks[i];
    const originalIndex = editableBlocks.indexOf(block);

    const item = document.createElement("div");
    item.className = `palette-block-item${block.enabled ? "" : " disabled"}`;
    item.dataset.index = originalIndex.toString();

    item.innerHTML = `
      <input type="checkbox" class="block-toggle" ${block.enabled ? "checked" : ""} data-index="${originalIndex}">
      <input type="color" class="color-input" value="${block.hexColor}" data-index="${originalIndex}">
      <span class="block-id" title="${block.id}">${block.id}</span>
      <input type="text" class="hex-input" value="${block.hexColor}" data-index="${originalIndex}" maxlength="7">
      <button class="btn-remove" data-index="${originalIndex}" title="Remove block">&times;</button>
    `;

    paletteBlockList.appendChild(item);
  }

  // Add event listeners
  addBlockItemEventListeners();
}

// Add event listeners to block items
function addBlockItemEventListeners() {
  // Toggle checkboxes
  paletteBlockList.querySelectorAll(".block-toggle").forEach((checkbox) => {
    checkbox.addEventListener("change", (e) => {
      const target = e.target as HTMLInputElement;
      const index = parseInt(target.dataset.index || "0");
      editableBlocks[index].enabled = target.checked;

      const item = target.closest(".palette-block-item");
      if (item) {
        item.classList.toggle("disabled", !target.checked);
      }

      updatePaletteStats();
    });
  });

  // Color inputs
  paletteBlockList.querySelectorAll(".color-input").forEach((input) => {
    input.addEventListener("input", (e) => {
      const target = e.target as HTMLInputElement;
      const index = parseInt(target.dataset.index || "0");
      editableBlocks[index].hexColor = target.value;

      // Update the hex text input
      const item = target.closest(".palette-block-item");
      const hexInput = item?.querySelector(".hex-input") as HTMLInputElement;
      if (hexInput) {
        hexInput.value = target.value;
      }
    });
  });

  // Hex text inputs
  paletteBlockList.querySelectorAll(".hex-input").forEach((input) => {
    input.addEventListener("input", (e) => {
      const target = e.target as HTMLInputElement;
      let value = target.value;

      // Add # if missing
      if (value && !value.startsWith("#")) {
        value = "#" + value;
      }

      // Validate hex color
      if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
        const index = parseInt(target.dataset.index || "0");
        editableBlocks[index].hexColor = value;

        // Update the color input
        const item = target.closest(".palette-block-item");
        const colorInput = item?.querySelector(".color-input") as HTMLInputElement;
        if (colorInput) {
          colorInput.value = value;
        }
      }
    });

    input.addEventListener("blur", (e) => {
      const target = e.target as HTMLInputElement;
      const index = parseInt(target.dataset.index || "0");
      target.value = editableBlocks[index].hexColor;
    });
  });

  // Remove buttons
  paletteBlockList.querySelectorAll(".btn-remove").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const target = e.target as HTMLButtonElement;
      const index = parseInt(target.dataset.index || "0");
      editableBlocks.splice(index, 1);
      renderPaletteBlocks(paletteSearchInput.value);
      updatePaletteStats();
    });
  });
}

// Update palette statistics
function updatePaletteStats() {
  const enabledCount = editableBlocks.filter((b) => b.enabled).length;
  const totalCount = editableBlocks.length;

  enabledCountEl.textContent = enabledCount.toString();
  totalCountEl.textContent = totalCount.toString();
}

// Open palette editor modal
function openPaletteEditor() {
  const currentPalette = paletteSelect.value;

  // If it's a custom palette, load it
  if (currentPalette.startsWith("custom:")) {
    const customName = currentPalette.replace("custom:", "");
    const customPalette = customPalettes.get(customName);
    if (customPalette) {
      editableBlocks = JSON.parse(JSON.stringify(customPalette.blocks));
      currentBasePalette = customPalette.basePalette;
      customPaletteNameInput.value = customName;
    }
  } else {
    // Load the built-in palette
    loadPaletteIntoEditor(currentPalette);
    customPaletteNameInput.value = "";
  }

  renderPaletteBlocks();
  updatePaletteStats();
  paletteEditorModal.classList.add("active");
  document.body.style.overflow = "hidden";
}

// Close palette editor modal
function closePaletteEditor() {
  paletteEditorModal.classList.remove("active");
  document.body.style.overflow = "";
  paletteSearchInput.value = "";
}

// Add new block to palette
function addNewBlock() {
  const blockIdInput = document.getElementById("newBlockId") as HTMLInputElement;
  const blockColorInput = document.getElementById("newBlockColor") as HTMLInputElement;

  const blockId = blockIdInput.value.trim();
  const hexColor = blockColorInput.value;

  if (!blockId) {
    alert("Please enter a block ID");
    return;
  }

  // Check for duplicate
  if (editableBlocks.some((b) => b.id === blockId)) {
    alert("A block with this ID already exists in the palette");
    return;
  }

  editableBlocks.push({
    id: blockId,
    hexColor,
    enabled: true,
  });

  blockIdInput.value = "";
  blockColorInput.value = "#808080";

  renderPaletteBlocks(paletteSearchInput.value);
  updatePaletteStats();
}

// Reset palette to default
function resetPalette() {
  if (confirm("Reset palette to the default? All customizations will be lost.")) {
    loadPaletteIntoEditor(currentBasePalette);
    customPaletteNameInput.value = "";
  }
}

// Save custom palette
function saveCustomPalette() {
  const name = customPaletteNameInput.value.trim();

  if (!name) {
    alert("Please enter a name for your custom palette");
    return;
  }

  // Check for reserved names
  if (Object.keys(palettes).includes(name)) {
    alert("This name is reserved for a built-in palette. Please choose a different name.");
    return;
  }

  const customPalette: CustomPalette = {
    name,
    blocks: JSON.parse(JSON.stringify(editableBlocks)),
    basePalette: currentBasePalette,
    createdAt: Date.now(),
  };

  customPalettes.set(name, customPalette);
  saveCustomPalettesToStorage();
  updateCustomPalettesDropdown();

  // Select the newly saved palette
  paletteSelect.value = `custom:${name}`;

  closePaletteEditor();
  setStatus(`Custom palette "${name}" saved!`, "success");
}

// Delete custom palette
function deleteCustomPalette(name: string) {
  if (confirm(`Delete custom palette "${name}"?`)) {
    customPalettes.delete(name);
    saveCustomPalettesToStorage();
    updateCustomPalettesDropdown();

    // If the deleted palette was selected, switch to default
    if (paletteSelect.value === `custom:${name}`) {
      paletteSelect.value = "minecraft";
    }
  }
}

// Export palette as JSON
function exportPalette() {
  const paletteSource = editableBlocksToPaletteSource(editableBlocks);
  const json = JSON.stringify(paletteSource, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `${customPaletteNameInput.value || "custom-palette"}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Import palette from JSON
function importPalette(file: File) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const json = JSON.parse(e.target?.result as string);
      editableBlocks = [];

      // Handle both PaletteSource and IBlock[] formats
      if (Array.isArray(json)) {
        for (const block of json) {
          editableBlocks.push({
            id: block.id,
            hexColor: block.hexColor,
            enabled: true,
            states: block.states,
            version: block.version,
          });
        }
      } else {
        for (const [id, value] of Object.entries(json)) {
          if (typeof value === "string") {
            editableBlocks.push({
              id,
              hexColor: value,
              enabled: true,
            });
          } else if (typeof value === "object" && value !== null) {
            const block = value as IBlock;
            editableBlocks.push({
              id: block.id || id,
              hexColor: block.hexColor,
              enabled: true,
              states: block.states,
              version: block.version,
            });
          }
        }
      }

      currentBasePalette = "imported";
      const fileName = file.name.replace(/\.json$/i, "");
      customPaletteNameInput.value = fileName;

      renderPaletteBlocks();
      updatePaletteStats();
      setStatus(`Imported ${editableBlocks.length} blocks from ${file.name}`, "success");
    } catch (err) {
      alert("Failed to parse palette JSON. Please check the file format.");
      console.error(err);
    }
  };
  reader.readAsText(file);
}

// ============================================
// LocalStorage Functions
// ============================================

// Save custom palettes to localStorage
function saveCustomPalettesToStorage() {
  const data: Record<string, CustomPalette> = {};
  customPalettes.forEach((palette, name) => {
    data[name] = palette;
  });
  localStorage.setItem(CUSTOM_PALETTES_STORAGE_KEY, JSON.stringify(data));
}

// Load custom palettes from localStorage
function loadCustomPalettesFromStorage() {
  try {
    const data = localStorage.getItem(CUSTOM_PALETTES_STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data) as Record<string, CustomPalette>;
      customPalettes.clear();
      for (const [name, palette] of Object.entries(parsed)) {
        customPalettes.set(name, palette);
      }
    }
  } catch (err) {
    console.error("Failed to load custom palettes from storage:", err);
  }
}

// Update custom palettes dropdown
function updateCustomPalettesDropdown() {
  customPalettesGroup.innerHTML = "";

  if (customPalettes.size === 0) {
    // Hide the optgroup if no custom palettes
    customPalettesGroup.style.display = "none";
    return;
  }

  customPalettesGroup.style.display = "";

  customPalettes.forEach((palette, name) => {
    const option = document.createElement("option");
    option.value = `custom:${name}`;
    option.textContent = name;
    customPalettesGroup.appendChild(option);
  });
}

// Toggle mcaddon options visibility based on format
function toggleMcaddonOptions() {
  if (mcaddonOptions) {
    const format = formatSelect.value;
    mcaddonOptions.style.display = format === "mcaddon" ? "block" : "none";
  }
}

// Handle VOX file selection
function handleVoxFile(file: File) {
  currentVoxFile = file;
  currentFile = null;
  inputType = "vox";

  // Clear the canvas and show VOX info
  const ctx = previewCanvas.getContext("2d")!;
  previewCanvas.width = 256;
  previewCanvas.height = 128;
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(0, 0, 256, 128);
  ctx.fillStyle = "#e94560";
  ctx.font = "14px monospace";
  ctx.textAlign = "center";
  ctx.fillText("VOX File Loaded", 128, 50);
  ctx.fillStyle = "#a0a0a0";
  ctx.font = "12px monospace";
  ctx.fillText(file.name, 128, 75);
  ctx.fillText(`${(file.size / 1024).toFixed(2)} KB`, 128, 95);

  setStatus(`VOX file selected: ${file.name}`, "info");
  downloadSection.style.display = "none";
  lastResult = null;

  // Auto-select mcstructure format for VOX files
  formatSelect.value = "mcstructure";
  toggleMcaddonOptions();
}

function init() {
  // Get DOM elements
  imageInput = document.getElementById("imageInput") as HTMLInputElement;
  voxInput = document.getElementById("voxInput") as HTMLInputElement;
  paletteSelect = document.getElementById("paletteSelect") as HTMLSelectElement;
  formatSelect = document.getElementById("formatSelect") as HTMLSelectElement;
  axisSelect = document.getElementById("axisSelect") as HTMLSelectElement;
  convertBtn = document.getElementById("convertBtn") as HTMLButtonElement;
  previewCanvas = document.getElementById("previewCanvas") as HTMLCanvasElement;
  statusEl = document.getElementById("status") as HTMLElement;
  downloadSection = document.getElementById("downloadSection") as HTMLElement;
  filenameInput = document.getElementById("filenameInput") as HTMLInputElement;
  mcaddonOptions = document.getElementById("mcaddonOptions") as HTMLElement;
  gridSizeInput = document.getElementById("gridSizeInput") as HTMLInputElement;
  resolutionSelect = document.getElementById("resolutionSelect") as HTMLSelectElement;

  // Palette Editor DOM elements
  paletteEditorModal = document.getElementById("paletteEditorModal") as HTMLElement;
  paletteSearchInput = document.getElementById("paletteSearchInput") as HTMLInputElement;
  paletteBlockList = document.getElementById("paletteBlockList") as HTMLElement;
  enabledCountEl = document.getElementById("enabledCount") as HTMLElement;
  totalCountEl = document.getElementById("totalCount") as HTMLElement;
  customPaletteNameInput = document.getElementById("customPaletteName") as HTMLInputElement;
  customPalettesGroup = document.getElementById("customPalettesGroup") as HTMLOptGroupElement;
  importPaletteInput = document.getElementById("importPaletteInput") as HTMLInputElement;

  const dropZone = document.getElementById("dropZone") as HTMLElement;
  const downloadBtn = document.getElementById("downloadBtn") as HTMLButtonElement;

  // Palette Editor buttons
  const editPaletteBtn = document.getElementById("editPaletteBtn") as HTMLButtonElement;
  const closeModalBtn = document.getElementById("closeModalBtn") as HTMLButtonElement;
  const importPaletteBtn = document.getElementById("importPaletteBtn") as HTMLButtonElement;
  const exportPaletteBtn = document.getElementById("exportPaletteBtn") as HTMLButtonElement;
  const addBlockBtn = document.getElementById("addBlockBtn") as HTMLButtonElement;
  const resetPaletteBtn = document.getElementById("resetPaletteBtn") as HTMLButtonElement;
  const savePaletteBtn = document.getElementById("savePaletteBtn") as HTMLButtonElement;

  // Load custom palettes from localStorage
  loadCustomPalettesFromStorage();
  updateCustomPalettesDropdown();

  // Event listeners
  imageInput.addEventListener("change", (e) => {
    const files = (e.target as HTMLInputElement).files;
    if (files && files.length > 0) {
      currentFile = files[0];
      currentVoxFile = null;
      inputType = "image";
      previewImage(currentFile);
      setStatus(`Selected: ${currentFile.name}`, "info");
      downloadSection.style.display = "none";
      lastResult = null;
    }
  });

  // VOX file input
  if (voxInput) {
    voxInput.addEventListener("change", (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        handleVoxFile(files[0]);
      }
    });
  }

  // Format change listener
  formatSelect.addEventListener("change", toggleMcaddonOptions);

  convertBtn.addEventListener("click", convert);
  downloadBtn.addEventListener("click", download);

  // Drag and drop
  dropZone.addEventListener("dragover", handleDragOver);
  dropZone.addEventListener("dragleave", handleDragLeave);
  dropZone.addEventListener("drop", handleDrop);

  // Click on drop zone to trigger file input
  dropZone.addEventListener("click", () => imageInput.click());

  // Palette Editor event listeners
  editPaletteBtn.addEventListener("click", openPaletteEditor);
  closeModalBtn.addEventListener("click", closePaletteEditor);

  // Close modal on overlay click
  paletteEditorModal.addEventListener("click", (e) => {
    if (e.target === paletteEditorModal) {
      closePaletteEditor();
    }
  });

  // Close modal on Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && paletteEditorModal.classList.contains("active")) {
      closePaletteEditor();
    }
  });

  // Search filter
  paletteSearchInput.addEventListener("input", (e) => {
    const target = e.target as HTMLInputElement;
    renderPaletteBlocks(target.value);
  });

  // Import/Export buttons
  importPaletteBtn.addEventListener("click", () => importPaletteInput.click());
  importPaletteInput.addEventListener("change", (e) => {
    const files = (e.target as HTMLInputElement).files;
    if (files && files.length > 0) {
      importPalette(files[0]);
      importPaletteInput.value = "";
    }
  });
  exportPaletteBtn.addEventListener("click", exportPalette);

  // Add block button
  addBlockBtn.addEventListener("click", addNewBlock);

  // Reset and Save buttons
  resetPaletteBtn.addEventListener("click", resetPalette);
  savePaletteBtn.addEventListener("click", saveCustomPalette);

  setStatus("Ready - Select an image to convert", "info");
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
