import type { Axis, IBlock } from "../types.ts";
import { imagescript, parseArgs } from "../deps.ts";
import { createMcStructure, createPalette } from "../mod.ts";
import { parseDbInput } from "./_util.ts";
// Convert an image to an array of frames, with each frame masked according to the brightness of the depth map at the corresponding pixel.

export function convertImageToDepthFrames(
  imgSrc: imagescript.Image,
  depthMap: imagescript.Image,
): imagescript.GIF {
  // Count the brightness levels in the depth map to determine the GIF frame length
  const brightnessLevels = new Set<number>();

  for (const [_x, _y, c] of imgSrc.iterateWithColors()) {
    const [r, g, b] = imagescript.Image.colorToRGB(c);
    const level = ((r + g + b) / 3) * 1.5;
    brightnessLevels.add(Math.ceil(level));
  }

  const levels = Array.from(brightnessLevels);

  const frames: imagescript.Frame[] = [];

  const { width: imgWidth, height: imgHeight } = imgSrc;

  const alpha = imagescript.Image.rgbaToColor(0, 0, 0, 0);

  for (const brightness of levels) {
    const frame = new imagescript.Frame(
      imgWidth,
      imgHeight,
      0,
      0,
      0,
      imagescript.Frame.DISPOSAL_BACKGROUND,
    );

    for (const [x, y, c] of imgSrc.iterateWithColors()) {
      const [r, g, b] = imagescript.Image.colorToRGB(depthMap.getPixelAt(x, y));

      const depth = Math.ceil((r + g + b) / 3);

      frame.setPixelAt(
        x,
        y,
        (depth >= brightness) ? c : alpha,
      );
    }

    frames.push(frame);
  }

  const gif = new imagescript.GIF(frames);

  return gif;
}

export async function convertToMcStructure(
  imgSrc: imagescript.Image,
  depthMap: imagescript.Image,
  palette: IBlock[],
  axis: Axis = "x",
) {
  const frames = convertImageToDepthFrames(imgSrc, depthMap);

  await Deno.writeFile("depth.gif", await frames.encode());

  return await createMcStructure(frames, palette, axis);
}

if (import.meta.main) {
  const { img, depth, db, axis } = parseArgs(Deno.args);
  const imgSrc = await imagescript.Image.decode(
    await Deno.readFile(img),
  );

  const depthMap = await imagescript.Image.decode(
    await Deno.readFile(depth),
  );

  const palette = createPalette(await parseDbInput(db));

  const structure = await convertToMcStructure(
    imgSrc,
    depthMap,
    palette,
    axis as Axis,
  );

  await Deno.writeFile(`depth_${Date.now()}.mcstructure`, structure);
  console.log("Created depth.mcstructure");
  Deno.exit(0);
}
