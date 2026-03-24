#!/bin/bash
# Launch Teaching Grid app — start dev server (if needed) and open browser

# Resolve APP_DIR relative to where this script lives
APP_DIR="$(cd "$(dirname "$0")" && pwd)"
PORT=3000
BROWSER="${BROWSER:-xdg-open}"
URL="http://localhost:${PORT}"

# Load nvm and switch to Node 20
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"
nvm use 20 > /dev/null 2>&1

# Check if server is already running on the port
if lsof -i :"$PORT" -sTCP:LISTEN -t > /dev/null 2>&1; then
    # Server already running — just open browser
    "$BROWSER" "$URL" &
    exit 0
fi

# Start dev server in a terminal window
gnome-terminal --title="Teaching Grid Dev Server" --working-directory="$APP_DIR" \
    -- bash -c "
        export NVM_DIR=\"\$HOME/.nvm\"
        [ -s \"\$NVM_DIR/nvm.sh\" ] && source \"\$NVM_DIR/nvm.sh\"
        nvm use 20
        echo '--- Starting Teaching Grid dev server ---'
        npm run dev
        echo '--- Server stopped. Press Enter to close. ---'
        read
    " &

# Wait for server to become ready (up to 30 seconds)
echo "Waiting for server on port ${PORT}..."
for i in $(seq 1 60); do
    if curl -s -o /dev/null -w '' "$URL" 2>/dev/null; then
        "$BROWSER" "$URL" &
        exit 0
    fi
    sleep 0.5
done

echo "Timed out waiting for server to start."
"$BROWSER" "$URL" &
exit 1
