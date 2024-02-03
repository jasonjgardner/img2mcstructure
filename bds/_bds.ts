import { Application } from "https://deno.land/x/oak/mod.ts";

const app = new Application();
const lines: string[] = [];
for (let itr = 0; itr < 22; itr++) {
  const fileContents = await Deno.readTextFile(
    `${itr}.mcfunction`,
  );
  lines.push(...fileContents.split("\n"));
}

// Split lines into even groups of 10
const commands: string[][] = [];
const groupSize = 32;

for (let itr = 0; itr < lines.length; itr += groupSize) {
  commands.push(lines.slice(itr, itr + groupSize));
}
let frame = 0;

app.use((ctx) => {
  if (ctx.request.method !== "GET") {
    console.log(ctx.request);
  }

  if (frame >= commands.length) {
    frame = 0;
  }

  ctx.response.headers.set("Content-Type", "text/plain");

  ctx.response.body = JSON.stringify({
    command: commands[frame].join(";"),
    target: "player",
  });

  frame++;
});

await app.listen({ port: 8000 });
