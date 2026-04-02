# Kinward — Project Memory

## Development Philosophy
- **"Write once, cry once"** — minimize tech debt for the sake of iteration
- We are building a dream home, not a prototype
- Make it strong at every phase: foundation through furnishings
- No shortcuts that create future pain — always harden as we go
- Quality and durability over speed of iteration

## Architecture
- Local-first family AI platform (Express + React + SQLite + Ollama)
- Electron desktop app with system tray (zero terminal commands for end users)
- PWA for LAN access from phones/tablets
- Target audience: non-technical families — UX simplicity is paramount

## Key Branches
- `private` — main development branch
- Feature branches merge to `private` after debugging
