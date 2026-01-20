#!/bin/bash

# Start Vite in background
cd /Users/praburajasekaran/Documents/local-htdocs/motionify-gai-1
npm run dev &
VITE_PID=$!

# Wait for Vite to start
sleep 3

# Start Next.js in background
cd landing-page-new
npm run dev &
NEXTJS_PID=$!

echo "✅ Servers started!"
echo "Vite (Admin): PID $VITE_PID (port 5173)"
echo "Next.js (Main): PID $NEXTJS_PID (port 5174)"
echo ""
echo "Access admin: http://localhost:5174/admin/inquiries"
echo "Access landing: http://localhost:5174/"
echo ""
echo "Press Ctrl+C to stop all servers"

# Wait for Ctrl+C
wait
