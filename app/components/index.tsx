import { useCallback, useEffect, useRef, useState } from "@hono/hono/jsx";
import { cx } from "classix";

export function DropImage({ onChange }: { onChange: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const onDragOver = (e: DragEvent) => {
      e.preventDefault();
      setDragging(true);
    };
    const onDragLeave = (e: DragEvent) => {
      e.preventDefault();
      setDragging(false);
    };
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (e.dataTransfer?.files) {
        onChange(e.dataTransfer.files[0]);
      }
    };
    document.addEventListener("dragover", onDragOver);
    document.addEventListener("dragleave", onDragLeave);
    document.addEventListener("drop", onDrop);
    return () => {
      document.removeEventListener("dragover", onDragOver);
      document.removeEventListener("dragleave", onDragLeave);
      document.removeEventListener("drop", onDrop);
    };
  }, []);

  const className = cx(
    "border-dashed border-2 border-gray-500 dark:border-gray-400 rounded-md flex flex-grow items-center justify-center cursor-pointer h-full min-h-40",
    dragging && "border-blue-500",
  );

  return (
    <div
      {...{ className }}
      onClick={() => {
        inputRef.current?.click();
      }}
    >
      Drag and drop your image here or{" "}
      <label
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-blue-500 underline cursor-pointer"
        htmlFor="image-upload"
      >
        browse
      </label>
      <input
        className="flex-grow h-full w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hidden"
        id="image-upload"
        type="file"
        accept="image/*"
        onChange={({ target }) => {
          const { files } = target as HTMLInputElement;
          if (files.length) {
            onChange(files[0]);
          }
        }}
        ref={inputRef}
      />
    </div>
  );
}

export function SelectPalette({
  onChange,
}: {
  onChange: (value: string[]) => void;
}) {
  // TODO: Make dynamic
  const options: Record<string, Array<{ name: string; value: string }>> = {
    Bedrock: [
      {
        name: "Vanilla Minecraft",
        value: "minecraft",
      },
      {
        name: "RAINBOW III!!!",
        value: "rainbow",
      },
      {
        name: "RGB",
        value: "rgb",
      },
    ],
    Java: [
      {
        name: "RGB (Java)",
        value: "rgb_java",
      },
      {
        name: "RAINBOW III!!! (Java)",
        value: "rainbow_block_java",
      },
      {
        name: "RAINBOW III!!! Lamps",
        value: "rainbow_lamp_java",
      },
      {
        name: "RAINBOW III!!! Metallic Plates",
        value: "rainbow_metal_java",
      },
      {
        name: "RAINBOW III!!! Glass Blocks",
        value: "rainbow_glass_java",
      },
      {
        name: "Vanilla Minecraft (Java)",
        value: "minecraft",
      },
    ],
  };
  return (
    <div className="flex flex-col space-y-1.5">
      <label
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        htmlFor="palette"
      >
        Palette
      </label>
      <select
        className="w-full rounded-md border border-input px-3 py-2 text-sm"
        multiple
        onChange={({ target }) => {
          onChange(
            Array.from((target as HTMLSelectElement).selectedOptions).map(
              (o) => o.value,
            ),
          );
        }}
      >
        {Object.keys(options).map((optGroup) => (
          <optgroup key={optGroup} label={optGroup}>
            {options[optGroup].map((option) => (
              <option key={option.value} value={option.value}>
                {option.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}

export function SelectSize({
  onChange,
  value,
}: {
  onChange: (value: number) => void;
  value: number;
}) {
  const options = [16, 32, 64, 128, 256, 512];
  return (
    <div className="flex flex-col space-y-1.5">
      <label
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        htmlFor="size"
      >
        Size
      </label>
      <select
        className="h-10 w-full rounded-md border border-input px-3 py-2 text-sm"
        onChange={({ target }) => {
          onChange(Number((target as HTMLSelectElement).value));
        }}
        value={value}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
