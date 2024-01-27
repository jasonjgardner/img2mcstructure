# img2mcstructure

Requires
[_RAINBOW III!!!_ add-on](https://cdn.discordapp.com/attachments/830521962383802368/1200453046304518164/RAINBOW_III-beta.mcaddon).

Send a request with the image URL like so:

```powershell
$settings = @{
    img="https://th.bing.com/th/id/OIG1.E6oiABYYho.M3NJjMwgj?pid=ImgGn";
    axis="y"
}
iwr -Method POST -Uri https://mcstructure.deno.dev -Body ($settings | ConvertTo-Json) -OutFile "demo.mcstructure"
```

Images will be clamped to 32px. To create a larger structure, download Deno and
run:

```powershell
deno run --allow-net --allow-write --allow-env https://raw.githubusercontent.com/jasonjgardner/img2mcstructure/main/main.ts "http://placekitten.com/256/256" y
```

Set the axis parameter to `y` to create ceiling and floors. Omit the axis to
default to walls.

(Works best with 1:1 images. Try it with DALL·E / Bing Image Creator / Clipdrop
/ Stable Diffusion, etc.)
