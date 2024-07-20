import { useCallback, useEffect, useRef, useState } from "@hono/hono/jsx/dom";
import { nanoid } from "nanoid";
import { DropImage, SelectPalette, SelectSize } from "../components/index.tsx";
import type { PaletteSource } from "../../src/types.ts";

const SVC_URL = "/v1/structure";
const SVC_URL_FUNCTION = "/v1/fill";
const MAX_HEIGHT = 512;
const MAX_WIDTH = 512;

export default function App() {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [userSetSize, setUserSetSize] = useState<boolean>(false);
  const [size, setSize] = useState(64);
  const [axis, setAxis] = useState<"x" | "y">("y");
  const [isStructure, setIsStructure] = useState<boolean>(true);
  const [image, setImage] = useState<File | null>(null);
  const [title, setTitle] = useState<string>(nanoid(8));
  const [db, setDb] = useState<PaletteSource[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (image) {
      const img = new Image();
      img.src = URL.createObjectURL(image);
      img.onload = () => {
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext("2d");

          const w = userSetSize ? size : MAX_WIDTH;
          const h = userSetSize ? size : MAX_HEIGHT;
          let newWidth = img.width;
          let newHeight = img.height;

          if (newWidth > w) {
            newHeight *= w / newWidth;
            newWidth = w;
          }

          if (newHeight > h) {
            newWidth *= h / newHeight;
            newHeight = h;
          }

          if (!userSetSize) {
            setSize(Math.max(newWidth, newHeight));
          }

          canvasRef.current.width = newWidth;
          canvasRef.current.height = newHeight;

          if (ctx) {
            ctx.clearRect(
              0,
              0,
              canvasRef.current.width,
              canvasRef.current.height
            );
            ctx.drawImage(img, 0, 0, newWidth, newHeight);
          }
        }
      };
    }
  }, [image, size, userSetSize]);

  const handleSubmit = useCallback(async () => {
    setIsProcessing(true);
    const res = await fetch(isStructure ? SVC_URL : SVC_URL_FUNCTION, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        img: canvasRef.current?.toDataURL("image/png"),
        axis,
        db,
      }),
    });

    // Return attachment
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, "_")}.${isStructure ? "mcstructure" : "mcfunction"}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    setIsProcessing(false);
  }, [title, axis, db]);

  // TODO: Cache responses
  const handlePaletteChange = async (palettes: string[]) => {
    setDb([]);
    const selected = (
      await Promise.all(
        palettes.map(async (id) => {
          const res = await fetch(`/db/${id}`);
          return res.json() as Promise<PaletteSource>;
        })
      )
    ).flat();

    setDb(selected);
  };

  return (
    <main className="container mx-auto">
      <h1 className="font-sans text-2xl font-semibold">img2mcstructure</h1>
      <form className="flex flex-col h-full space-y-2 mt-4">
        <DropImage
          onChange={(file) => {
            setImage(file);
          }}
        />
        <div className="border border-gray-300 dark:border-gray-700 rounded-md bg-gray-50 flex-shrink">
          {image === null && (
            <p className="text-center text-gray-500 dark:text-gray-400 py-44">
              Image will appear here for editing
            </p>
          )}
          <canvas ref={canvasRef} width={size} height={size} />
        </div>
        <SelectSize
          onChange={(value) => {
            setSize(value);
            setUserSetSize(true);
          }}
          value={size}
        />
        <div className="grid gap-4">
          <div className="flex flex-col space-y-1.5">
            <label
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              htmlFor="title"
            >
              Title
            </label>
            <input
              className="flex h-10 w-full rounded-md border border-input px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              id="title"
              placeholder="Enter image title"
              value={title}
              onChange={(e) => setTitle((e.target as HTMLInputElement).value)}
            />
          </div>

          <fieldset className="flex flex-row py-1 space-x-1.5">
            <legend className="text-lg font-sans font-medium">Output</legend>
            <label
              className="font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 space-x-2 flex justify-start"
              htmlFor="axis-y"
            >
              <input
                type="radio"
                name="axis"
                id="axis-y"
                value="y"
                checked={axis === "y"}
                onChange={(e) =>
                  setAxis(
                    (e.target as HTMLInputElement).value === "y" ? "y" : "x"
                  )
                }
              />{" "}
              Ceiling / Floor
            </label>
            <label
              className="font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 space-x-2 flex justify-start"
              htmlFor="axis-x"
            >
              <input
                type="radio"
                name="axis"
                id="axis-x"
                value="x"
                checked={axis === "x"}
                onChange={({ target }) =>
                  setAxis(
                    (target as HTMLInputElement).value === "x" ? "x" : "y"
                  )
                }
              />
              Wall
            </label>
          </fieldset>

          <fieldset className="flex flex-row py-1 space-x-1.5">
            <legend className="text-lg font-sans font-medium">Structure</legend>
                <label
              className="font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 space-x-2 flex justify-start"
              htmlFor="mcstructure"
            >
              <input
                type="radio"
                name="structure"
                id="mcstructure"
                value="mcstructure"
                checked={isStructure}
                onChange={(e) =>
                  setIsStructure(
                   e.target.checked
                  )
                }
              />{" "}
              .mcstructure
            </label>

            <label
              className="font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 space-x-2 flex justify-start"
              htmlFor="mcfunction"
            >
              <input
                type="radio"
                name="structure"
                id="mcfunction"
                value="mcfunction"
                checked={!isStructure}
                onChange={(e) =>
                  setIsStructure(
                    !e.target.checked
                  )
                }
              />
              .mcfunction
            </label>
          </fieldset>
        </div>
        <div className="grid gap-4">
          <SelectPalette onChange={(value) => handlePaletteChange(value)} />
        </div>
        <button
          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full"
          onClick={handleSubmit}
          disabled={isProcessing || image === null || title === ""}
          type="button"
        >
          Submit
        </button>
      </form>
    </main>
  );
}
