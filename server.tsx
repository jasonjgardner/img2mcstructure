import type { PaletteSource } from "./src/types.ts";
import { Hono } from "@hono/hono";
import { readFile } from "node:fs/promises";
import img2mcstructure, { createPalette } from "./src/mcstructure/mod.ts";
import createFunction from "./src/mcfunction/mod.ts";

export default function main(defaultDb: PaletteSource) {
	const app = new Hono();

	app.post("/v1/structure", async (ctx) => {
		const { img, axis, db } = await ctx.req.json();

		try {
			const data = await img2mcstructure(
				img,
				createPalette(db ?? defaultDb),
				axis,
			);

			return new Response(data, {
				headers: {
					"Content-Disposition": 'attachment; filename="img.mcstructure"',
					"Content-Type": "application/octet-stream",
					"Access-Control-Allow-Origin": "*",
				},
			});
		} catch (err) {
			return new Response(err.message, { status: 500 });
		}
	});

	app.post("/v1/fill", async (ctx) => {
		const { img, axis, db } = await ctx.req.json();

		try {
			const data = await createFunction(db ?? defaultDb, img, axis);

			return new Response(data, {
				headers: {
					"Content-Disposition": 'attachment; filename="img.mcfunction"',
					"Content-Type": "text/plain",
					"Access-Control-Allow-Origin": "*",
				},
			});
		} catch (err) {
			return new Response(err.message, { status: 500 });
		}
	});

	app.get("/db/:dbName", async (ctx) => {
		const { dbName } = ctx.req.param();
		let db: string;
		try {
			db = await readFile(`db/${dbName}.json`, "utf-8");
		} catch (err) {
			return new Response(err.message, { status: 404 });
		}

		try {
			const palette = createPalette(JSON.parse(db));

			return new Response(JSON.stringify(palette), {
				headers: {
					"Content-Type": "application/json",
				},
			});
		} catch (err) {
			return new Response(err.message, { status: 500 });
		}
	});

	app.get("/style.css", async (ctx) => {
		const style = await readFile("dist/style.css", "utf-8");

		return new Response(style, {
			headers: {
				"Content-Type": "text/css",
			},
		});
	});

	app.get("/bundle.js", async (ctx) => {
		const bundle = await readFile("dist/bundle.js", "utf-8");

		return new Response(bundle, {
			headers: {
				"Content-Type": "application/javascript",
			},
		});
	});

	app.get("/", (c) =>
		c.html(
			`<!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Image to Minecraft</title>
          <link rel="stylesheet" href="/style.css" />
        </head>
        <body>
          <div id="app"></div>
          <script src="/bundle.js"></script>
        </body>
      </html>`,
		),
	);

	return app;
}
