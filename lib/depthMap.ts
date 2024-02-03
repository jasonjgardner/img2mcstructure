import type { Axis, IBlock } from "../types.ts";
import { imagescript, parseArgs } from "../deps.ts";
import { createMcStructure, createPalette } from "../mod.ts";
import { parseDbInput } from "./_util.ts";

export function convertImageToDepthFrames(
  imgSrc: imagescript.Image,
  depthMap: imagescript.Image,
  hollow = false,
): imagescript.GIF {
  const { width: imgWidth, height: imgHeight } = imgSrc;

  if (imgWidth !== depthMap.width || imgHeight !== depthMap.height) {
    // Resize depth map to match the source image
    depthMap.resize(imgWidth, imgHeight);
  }

  // Count the brightness levels in the depth map to determine the GIF frame length
  const brightnessLevels = new Set<number>();

  for (const [_x, _y, c] of imgSrc.iterateWithColors()) {
    const [r, g, b] = imagescript.Image.colorToRGB(c);
    const level = Math.min(r, g, b);
    brightnessLevels.add(level);
  }
  const levels = Array.from(brightnessLevels).sort((a, b) => a - b);

  const frames: imagescript.Frame[] = [];

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

    let frameEmpty = true;

    for (const [x, y, c] of imgSrc.iterateWithColors()) {
      const [r, g, b] = imagescript.Image.colorToRGB(depthMap.getPixelAt(x, y));

      let color = alpha;
      if (
        (hollow && Math.min(r, g, b) === brightness) ||
        (!hollow && ((r + g + b) / 3 >= brightness))
      ) {
        color = c;
        frameEmpty = false;
      }

      frame.setPixelAt(
        x,
        y,
        color,
      );
    }

    if (!frameEmpty) {
      frames.push(frame);
    }
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
  const frames = convertImageToDepthFrames(imgSrc, depthMap, true);

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
