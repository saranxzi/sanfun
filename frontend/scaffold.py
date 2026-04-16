import os
import shutil

dirs = [
    "src/engine",
    "src/games",
    "src/ui"
]

for d in dirs:
    os.makedirs(d, exist_ok=True)

main_ts = """import './style.css'
import { ArcadeEngine } from './engine/ArcadeEngine'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div class="arcade-container">
    <canvas id="game-canvas"></canvas>
  </div>
`

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement
const engine = new ArcadeEngine(canvas)
engine.start()
"""
with open("src/main.ts", "w") as f:
    f.write(main_ts)

with open("index.html", "w") as f:
    f.write("""<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Sanfun Arcade</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
""")

with open("src/style.css", "w") as f:
    f.write("""body {
    margin: 0;
    overflow: hidden;
    background-color: #111;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
}
canvas {
    border: 2px solid #333;
    display: block;
}
""")

print("Frontend scaffolding generated.")
