/** @jsxImportSource https://esm.sh/react@18.2.0" */
/** @jsxRuntime automatic */
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "https://esm.sh/react@18.2.0";
import ReactDOM from "https://esm.sh/react-dom@18.2.0";
import type { PaletteSource } from "../../types.ts";

const SVC_URL = "/v1/structure";
const MAX_HEIGHT = 512;
const MAX_WIDTH = 512;

function DropImage({ onChange }: { onChange: (file: File) => void }) {
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

  const className =
    "border-dashed border-2 border-gray-500 dark:border-gray-400 rounded-md flex flex-1 items-center justify-center cursor-pointer" +
    (dragging ? " border-blue-500" : "");

  return (
    <div {...{ className }}>
      <p className="text-center text-gray-500 dark:text-gray-400">
        Drag and drop your image here or{" "}
        <label
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-blue-500 underline cursor-pointer"
          htmlFor="image-upload"
        >
          browse
        </label>
        <input
          className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hidden"
          id="image-upload"
          type="file"
          accept="image/*"
          onChange={(e) => {
            if (e.target.files) {
              onChange(e.target.files[0]);
            }
          }}
        />
      </p>
    </div>
  );
}

function SelectPalette({ onChange }: { onChange: (value: string[]) => void }) {
  const options = [{
    name: "Vanilla Minecraft",
    value: "minecraft",
  }, {
    name: "RAINBOW III!!!",
    value: "rainbow",
  }, {
    name: "RGB",
    value: "rgb",
  }];
  return (
    <div className="flex flex-col space-y-1.5">
      <label
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        htmlFor="palette"
      >
        Palette
      </label>
      <select
        className="h-10 w-full rounded-md border border-input px-3 py-2 text-sm"
        multiple
        onChange={(e) => {
          onChange(Array.from(e.target.selectedOptions).map((o) => o.value));
        }}
      >
        {options.map((option) => (
          <option value={option.value}>{option.name}</option>
        ))}
      </select>
    </div>
  );
}

function SelectSize(
  { onChange, value }: { onChange: (value: number) => void; value: number },
) {
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
        onChange={(e) => {
          onChange(Number(e.target.value));
        }}
        value={value}
      >
        {options.map((option) => <option value={option}>{option}</option>)}
      </select>
    </div>
  );
}

function App() {
  const [userSetSize, setUserSetSize] = useState<boolean>(false);
  const [size, setSize] = useState(64);
  const [axis, setAxis] = useState<"x" | "y">("y");
  const [image, setImage] = useState<File | null>(null);
  const [title, setTitle] = useState("");
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
              canvasRef.current.height,
            );
            ctx.drawImage(img, 0, 0, newWidth, newHeight);
          }
        }
      };
    }
  }, [image, size, userSetSize]);

  const handleSubmit = useCallback(async () => {
    const res = await fetch(SVC_URL, {
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
    a.download = `${title.toLowerCase().replace(/\s+/g, "_")}.mcstructure`;
    document.body.appendChild(a);
    a.click();
  }, [title, axis, db]);

  const handlePaletteChange = async (palettes: string[]) => {
    setDb([]);
    const selected = (await Promise.all(
      palettes.map(async (id) => {
        const res = await fetch(`/db/${id}`);
        return res.json() as Promise<PaletteSource>;
      }),
    )).flat();

    setDb(selected);
  };

  return (
    <main className="container mx-auto">
      <h1 className="font-sans text-2xl">img2mcstructure</h1>
      <div className="flex flex-col">
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
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <fieldset className="flex flex-col space-y-1.5">
            <label
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              htmlFor="axis-y"
            >
              Y Axis
              <input
                type="radio"
                name="axis"
                id="axis-y"
                value="y"
                checked={axis === "y"}
                onChange={(e) => setAxis(e.target.value === "y" ? "y" : "x")}
              />
            </label>
            <label
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              htmlFor="axis-x"
            >
              X Axis
              <input
                type="radio"
                name="axis"
                id="axis-x"
                value="x"
                checked={axis === "x"}
                onChange={(e) => setAxis(e.target.value === "x" ? "x" : "y")}
              />
            </label>
          </fieldset>
        </div>
        <div className="grid gap-4">
          <SelectPalette onChange={(value) => handlePaletteChange(value)} />
        </div>
        <button
          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full"
          onClick={handleSubmit}
          disabled={image === null || title === ""}
        >
          Submit
        </button>
      </div>
    </main>
  );
}

function main() {
  ReactDOM.render(React.createElement(App), document.querySelector("#app"));
}

addEventListener("DOMContentLoaded", () => {
  main();
});
