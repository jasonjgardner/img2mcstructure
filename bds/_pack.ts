import * as esbuild from "https://deno.land/x/esbuild@v0.15.16/wasm.js";
import { basename, extname, join, JSZip } from "../deps.ts";

export async function compile(
  src: string,
) {
  const code = await Deno.readTextFile(src);

  const name = basename(src, extname(src));
  const transformed = await esbuild.transform(code, {
    loader: "ts",
    sourcemap: true,
    sourcefile: src,
    sourcesContent: true,
    tsconfigRaw: `{ 
    "compilerOptions":{ 
       "target":"es6",
       "moduleResolution":"node",
       "module":"es2020",
       "declaration":false,
       "noLib":false,
       "emitDecoratorMetadata":true,
       "experimentalDecorators":true,
       "sourceMap":true,
       "pretty":true,
       "forceConsistentCasingInFileNames": true,
       "strict": true,
       "allowUnreachableCode":true,
       "allowUnusedLabels":true,
       "noImplicitAny":true,
       "noImplicitReturns":false,
       "noImplicitUseStrict":false,
       "outDir":"build/",
       "rootDir": ".",
       "baseUrl":"development_behavior_packs/",
       "listFiles":false,
       "noEmitHelpers":true
    },
    "exclude":[ 
       "node_modules"
    ],
    "compileOnSave":false
 }`,
  });

  const out = join(Deno.cwd(), `${name}.js`);

  await Deno.writeTextFile(
    out,
    transformed.code.replace(/npm:@/g, "@"),
  );
  await Deno.writeTextFile(
    join(Deno.cwd(), `${name}.js.map`),
    transformed.map,
  );

  esbuild.stop();

  return await Deno.readTextFile(out);
}

function writeManifests() {
  const TARGET_VERSION = [1, 20, 50];
  const SERVER_VERSION = "1.8.0-beta";
  const manifest = {
    format_version: 2,
    header: {
      name: "Sever Connection",
      description: "Scripts to call HTTP server",
      uuid: crypto.randomUUID(),
      version: [1, 0, 0],
      min_engine_version: TARGET_VERSION,
    },
    modules: [
      {
        entry: "server.js",
        type: "script",
        language: "javascript",
        uuid: crypto.randomUUID(),
        version: [1, 0, 0],
      },
    ],
    dependencies: [
      {
        module_name: "@minecraft/server",
        version: SERVER_VERSION,
      },
      {
        module_name: "@minecraft/server-net",
        version: "1.0.0-beta",
      },
    ],
  };

  return JSON.stringify(manifest, null, 2);
}

export async function createPack() {
  const mcaddon = new JSZip();

  mcaddon.folder("scripts")!.file(
    "server.js",
    await compile(
      join(Deno.cwd(), "bds", "_script.ts"),
    ),
  );

  mcaddon.file("manifest.json", writeManifests());

  await Deno.writeFile(
    join(Deno.cwd(), "server.mcpack"),
    await mcaddon.generateAsync({ type: "uint8array" }),
  );
}

if (import.meta.main) {
  await createPack();
  Deno.exit(0);
}
