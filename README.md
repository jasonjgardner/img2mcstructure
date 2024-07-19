# img2mcstructure

[![img2mcstructure on JSR](https://jsr.io/badges/@jjg/img2mcstructure)](https://jsr.io/@jjg/img2mcstructure "Add JSR package")

> ![RGB example](https://github.com/jasonjgardner/img2mcstructure/assets/1903667/3f98a433-9f41-4009-b840-d8341eb2c2f7)
> [Made with RGB add-on](https://cdn.discordapp.com/attachments/830521962383802368/1201692650122792990/RGB.mcaddon)

> ![Minecraft mural made with RAINBOW III!!!](https://github.com/jasonjgardner/img2mcstructure/assets/1903667/dcc165d9-4cab-4858-9106-330426a4a0e7)
> [_RAINBOW III!!!_ add-on](https://cdn.discordapp.com/attachments/830521962383802368/1200453046304518164/RAINBOW_III-beta.mcaddon).

Try it at https://mcstructure.deno.dev/

Images will be clamped to 64px. To create a larger structure, download Deno and
run:

```powershell
deno run --allow-net --allow-write --allow-env https://raw.githubusercontent.com/jasonjgardner/img2mcstructure/main/main.ts "http://placekitten.com/256/256" y
```

Set the axis parameter to `y` to create ceiling and floors. Omit the axis to
default to walls.

##### [See examples](https://github.com/jasonjgardner/img2mcstructure/blob/main/example/README.md) for advanced usage.
