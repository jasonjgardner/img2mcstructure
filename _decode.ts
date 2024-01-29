import { imagescript } from "./deps.ts";
import { MAX_HEIGHT, MAX_WIDTH } from "./_constants.ts";

type DecodedFrames = imagescript.GIF | imagescript.Image[];

async function decodeUrl(
  { href }: URL,
): Promise<DecodedFrames> {
  const res = await fetch(href);
  const data = new Uint8Array(await res.arrayBuffer());

  return !href.endsWith(".gif")
    ? [await imagescript.Image.decode(data)]
    : [...(await imagescript.GIF.decode(data, false))] as imagescript.GIF;
}

async function decodeImageFile(
  path: string,
): Promise<DecodedFrames> {
  const data = await Deno.readFile(path);

  return !path.endsWith(".gif")
    ? [await imagescript.Image.decode(data)]
    : [...(await imagescript.GIF.decode(data, false))] as imagescript.GIF;
}

async function decodeBase64(
  base64: string,
): Promise<DecodedFrames> {
  const data = new Uint8Array(
    atob(base64.replace(
      /^data:image\/(png|jpeg|gif);base64,/,
      "",
    )).split("").map((x) => x.charCodeAt(0)),
  );

  return !base64.startsWith("data:image/gif")
    ? [await imagescript.Image.decode(data)]
    : [...(await imagescript.GIF.decode(data, false))] as imagescript.GIF;
}

export default async function decode(
  path: string,
): Promise<DecodedFrames> {
  let img = null;

  if (path.startsWith("http")) {
    img = await decodeUrl(new URL(path));
  }

  if (path.startsWith("data:image")) {
    img = await decodeBase64(path);
  }

  // Resize every frame above the max width/height
  return (img ?? await decodeImageFile(path)).map((i) =>
    i.height > MAX_HEIGHT
      ? i.resize(imagescript.Image.RESIZE_AUTO, MAX_HEIGHT)
      : i.width > MAX_WIDTH
      ? i.resize(MAX_WIDTH, imagescript.Image.RESIZE_AUTO)
      : i
  ) as DecodedFrames;
}
