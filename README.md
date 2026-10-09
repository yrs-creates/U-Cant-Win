🎮 U CANT WIN — Three Nightmares. One Run.
⚡ A brutal, fast & fair-hard browser arcade runner. Flip gravity. Outrun the storm. Thread the skyline. No downloads. No mercy.

HTML5CSS3JavaScript60 FPS

🕹️ Play It
Just open index.html in any modern browser — that's it! No build step, no dependencies, no downloads.

📁 project/
├── 🌐 index.html    → Landing page + confidence-checkpoint entry quiz
├── 🎯 play.html     → Game page (canvas + HUD + pause menu)
├── 🧠 game.js       → Full game engine (canvas, physics, audio)
├── 🎨 styles.css    → Dark/light themes + GD-style UI
└── ⚙️ script.js     → Landing page theme toggle
✨ Features
Feature	Description
🔄 3 Shifting Modes	▲ Ship (gravity flip) → ● Balloon (skyfall survival) → ✈ Plane (skyline flight) — modes change mid-run through glowing portals, with zero warning
⏸️ GD-Style Pause Menu	Resume ▶, Restart ↻, Quit ☰, level progress %, attempt counter, Music 🎵 & SFX 🔊 sliders
🗺️ Named Levels	STEREO PULSE (Normal) • SKYFALL MADNESS (Hard) • SKYLINE DASH (Harder)
🔁 Attempt Counter	Every death = new attempt, shown on HUD, canvas & pause screen
📊 Progress Bar	Live portal-progress % bar, just like the classics
🎵 3 Procedural Soundtracks	Unique WebAudio chiptune per mode — no audio files needed! Volumes saved to localStorage
😤 Confidence Checkpoint	A funny entry quiz before the nightmare begins: "DO YOU BELIEVE IN YOURSELF?"
🌗 Dark / Light Themes	Landing page respects your vibe
🏆 Best Score Saved	Your best distance persists via localStorage
📱 Keyboard + Touch	Space / Click / Tap to fly — fullscreen support included
🎮 Controls
Key	Action
Space / ↑ / W / Click / Tap	Fly / Flap (hold = climb, release = dive)
← → ↑ ↓ / WASD	Steer the balloon
Esc / P	⏸️ Pause / Resume
R	🔄 Restart run
M	🔇 Mute / Unmute
🧩 How It Works
🖥️ Pure Canvas rendering — dynamic hue-shifting skies, parallax clouds, stars, weather (rain/embers), particles & screen shake
🧲 One-input physics — each mode has exactly one input; ship uses gravity-flip, plane uses flap-impulse, balloon uses pointer steering
🌀 Secret portal timer — 16–26s per mode, never shown; the run transforms without warning
🔊 WebAudio sequencer — per-mode BPM, waveforms & basslines synthesized live in the browser
🚀 Deploy
Host it anywhere static — GitHub Pages, Netlify, Vercel, itch.io:

# Example: GitHub Pages
git add . && git commit -m "🔥 U CANT WIN" && git push
# → Settings → Pages → Deploy from branch ✅
📸 Screenshots
Add your gameplay screenshots here!

📁 assets/
├── screenshot-menu.png
└── screenshot-gameplay.png
🤝 Contributing
Got a wild mode idea? A harder chunk? A funnier quiz line? PRs welcome! 💪

🍴 Fork it
🌿 Create a branch (git checkout -b feature/my-nightmare)
💾 Commit (git commit -m "✨ add lava mode")
📬 Open a Pull Request
📜 License
MIT — do whatever you want, just don't say you can win. 😈

<p align="center">© 2026 <b>U CANT WIN</b> • Challenge the impossible 🔥</p> <p align="center">⭐ Star this repo if the spikes made you cry ⭐</p>
