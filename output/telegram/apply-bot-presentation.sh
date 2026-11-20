#!/bin/zsh
# Applies the GameVerse bot presentation through the Bot API.
# Usage: TELEGRAM_TOKEN=<bot token> ./apply.sh [icon-file]
# The token is read from the environment only and never printed.
set -e
[ -n "$TELEGRAM_TOKEN" ] || { echo "TELEGRAM_TOKEN is not set"; exit 1; }
API="https://api.telegram.org/bot$TELEGRAM_TOKEN"
ICON="${1:-/Users/greg/Documents/gameverse-client/output/telegram/icon-v1.png}"
APP_URL="https://gameverse-client-mu.vercel.app"
call() { curl -s -m 60 "$API/$1" "${@:2}" | python3 -c 'import sys,json; r=json.load(sys.stdin); print(("ok" if r.get("ok") else "FAILED"), sys.argv[1], "" if r.get("ok") else r.get("description"))' "$1"; }

call getMe -o /dev/null || true
call setMyName --data-urlencode "name=GameVerse"
call setMyShortDescription --data-urlencode "short_description=Jelly World, Tennis Island, Monstrocity and more. One hub, one profile, your progress everywhere. 🎮"
call setMyShortDescription --data-urlencode "language_code=ru" --data-urlencode "short_description=Jelly World, Tennis Island, Monstrocity и другие игры. Один хаб, один профиль, прогресс везде. 🎮"
call setMyDescription --data-urlencode "description=GameVerse is a universe of small games in one mini app.
🍬 Jelly World — Snake Garden, Tetris Factory, 2048 Temple and Power Gym
🎾 Tennis Island — real-time matches with friends and weekly championships
🧟 Monstrocity — survive the city day by day, find shelters and fight monsters
🃏 Collections — every game earns points that open new cards
One profile, one progress on every device. Tap Start or Open App to play."
call setMyDescription --data-urlencode "language_code=ru" --data-urlencode "description=GameVerse — вселенная маленьких игр в одном мини-приложении.
🍬 Jelly World — Snake Garden, Tetris Factory, 2048 Temple и Power Gym
🎾 Tennis Island — матчи с друзьями в реальном времени и недельные чемпионаты
🧟 Monstrocity — выживай в городе день за днём, ищи убежища и сражайся с монстрами
🃏 Коллекции — очки из любой игры открывают новые карточки
Один профиль и общий прогресс на всех устройствах. Нажми Start или Open App."
# The menu button next to the message field opens the mini app.
call setChatMenuButton -H 'Content-Type: application/json' -d "{\"menu_button\":{\"type\":\"web_app\",\"text\":\"Play\",\"web_app\":{\"url\":\"$APP_URL\"}}}"
# Profile photo: a static image upload.
curl -s -m 120 "$API/setMyProfilePhoto" -F 'photo={"type":"static","photo":"attach://pic"}' -F "pic=@$ICON" | python3 -c 'import sys,json; r=json.load(sys.stdin); print(("ok" if r.get("ok") else "FAILED"), "setMyProfilePhoto", "" if r.get("ok") else r.get("description"))'
echo "done"
