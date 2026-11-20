# Telegram presentation of @gameverse_play_bot

Assets in this folder were produced on 2026-11-20.

- `icon-v1.png`, `icon-v2.png`, `icon-v3.png` — generic GameVerse icons (1024×1024, generated with Codex); see `ICON_NOTES.md`.
- `screens/*.png` — 9:16 phone screenshots of the live app (1215×2160) for the bot's media previews.
- `description-picture.png` — 1280×720 collage for BotFather's description picture.
- `apply-bot-presentation.sh` — Bot API calls (name, about, description EN/RU, menu button, profile photo). Run as `TELEGRAM_TOKEN=… ./apply-bot-presentation.sh [icon]`; the token is read from the environment only.

## Done through the Bot API by the script
- `setMyName`, `setMyShortDescription` (EN + RU), `setMyDescription` (EN + RU)
- `setChatMenuButton` → "Play" web-app button next to the message field
- `setMyProfilePhoto` → the chosen icon

## Only in BotFather / the Telegram app (no API)
1. **Open App button on the profile (Main Mini App):** @BotFather → /mybots → GameVerse → Bot Settings → Configure Mini App → Enable Mini App → URL `https://gameverse-client-mu.vercel.app`.
2. **Screenshots on the profile (media previews):** open the bot's profile in Telegram as the owner → Edit → Preview Media (or "Manage Mini App previews") → upload `screens/01…10` in order; vertical 9:16 images are accepted. Previews can be uploaded per language.
3. **Description picture:** @BotFather → /setdescriptionpic (or Edit Bot → Edit Description Picture) → upload `description-picture.png`.
