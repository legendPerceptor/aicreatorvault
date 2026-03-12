#!/bin/bash

PORTS=(3001 8001 5173)

echo "Stopping services..."

for port in "${PORTS[@]}"; do
    pid=$(lsof -ti:$port 2>/dev/null)
    if [ -n "$pid" ]; then
        echo "Killing process on port $port (PID: $pid)"
        kill -9 $pid 2>/dev/null
    else
        echo "No process found on port $port"
    fi
done

echo "Done!"
