/** @jsxImportSource https://esm.sh/react@18.2.0" */
/** @jsxRuntime automatic */
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "https://esm.sh/react@18.2.0";
import ReactDOM from "https://esm.sh/react-dom@18.2.0";

const SVC_URL = "/v1/structure";

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
    "border-dashed border-2 border-gray-500 dark:border-gray-400 rounded-md h-60 flex items-center justify-center cursor-pointer" +
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

function App() {
  const [size, setSize] = useState(256);
  const [axis, setAxis] = useState<"x" | "y">("y");
  const [image, setImage] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (image) {
      const img = new Image();
      img.src = URL.createObjectURL(image);
      img.onload = () => {
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, size, size);
          }
        }
      };
    }
  }, [image]);

  const handleSubmit = useCallback(async () => {
    const res = await fetch(SVC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        img: canvasRef.current?.toDataURL("image/png"),
        axis,
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
  }, [title]);

  return (
    <main className="container mx-auto">
      <h1 className="font-sans text-lg">img2mcstructure</h1>
      <div className="grid gap-6">
        <DropImage
          onChange={(file) => {
            setImage(file);
          }}
        />
        <div className="border border-gray-300 dark:border-gray-700 rounded-md h-96">
          {image === null && (
            <p className="text-center text-gray-500 dark:text-gray-400 py-44">
              Image will appear here for editing
            </p>
          )}
          <canvas ref={canvasRef} width={size} height={size} />
        </div>
        <div className="grid gap-4">
          <div className="flex flex-col space-y-1.5">
            <label
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              htmlFor="title"
            >
              Title
            </label>
            <input
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              id="title"
              placeholder="Enter image title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
        </div>
        <div className="grid gap-4">
            <fieldset className="flex flex-col space-y-1.5">
            <label
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              htmlFor="axis-y"
            >
              Y Axis
              <input type="radio" name="axis" id="axis-y" value="y" 
              checked={axis === "y"}
              onChange={(e) => setAxis(e.target.value as "x" | "y")}
               />
            </label>
            <label
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              htmlFor="axis-x"
            >
              X Axis
              <input type="radio" name="axis" id="axis-x" value="x"
              checked={axis === "x"}
              onChange={(e) => setAxis(e.target.value as "x" | "y")}
              />
            </label>
          </fieldset>
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
