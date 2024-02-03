/// @deno-types="npm:@types/mojang-gametest"
/// @deno-types="npm:@minecraft/server"
/// @deno-types="npm:@minecraft/server-net"
import { GameMode, system, world } from "npm:@minecraft/server";
import { http, type HttpResponse } from "npm:@minecraft/server-net";

const SERVER_URL = "http://127.0.0.1:8000/bds/";
const tickSpeed = 10;

function processCommandResponse({ body }: HttpResponse) {
  const overworld = world.getDimension("overworld");
  const players = overworld.getPlayers({
    excludeGameModes: [GameMode.spectator],
  });
  const { command, target } = JSON.parse(body);
  const commands = command.split(";");
  for (const player of players) {
    if (player.name !== target) {
      continue;
    }

    for (const command of commands) {
      player.runCommand(command);
    }
  }
}

function getHttpCommand() {
  http.get(SERVER_URL).then(processCommandResponse).catch((err) => {
    console.warn(err);
  });
}

system.runInterval(function intervalTick() {
  getHttpCommand();
}, tickSpeed);
