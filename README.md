# img2mcstructure

> For use with
> [_RAINBOW III!!!_ add-on](https://cdn.discordapp.com/attachments/830521962383802368/1200453046304518164/RAINBOW_III-beta.mcaddon).

![Minecraft mural made with RAINBOW III!!!](https://github.com/jasonjgardner/img2mcstructure/assets/1903667/dcc165d9-4cab-4858-9106-330426a4a0e7)

Send a request with the image URL like so:

```powershell
$settings = @{
    img="https://placekitten.com/64/64";
    axis="y"
}
iwr -Uri https://mcstructure.deno.dev/v1/structure -Method POST -ContentType "application/json" -Body ($settings | ConvertTo-Json) -OutFile "demo.mcstructure"
```

Images will be clamped to 64px. To create a larger structure, download Deno and
run:

```powershell
deno run --allow-net --allow-write --allow-env https://raw.githubusercontent.com/jasonjgardner/img2mcstructure/main/main.ts "http://placekitten.com/256/256" y
```

Set the axis parameter to `y` to create ceiling and floors. Omit the axis to
default to walls.

##### [See examples](./example/README.md) for advanced usage.
