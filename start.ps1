Write-Host "Starting the application..."

# Start the server
Start-Process "cmd" "/c npm run start"

# Wait for the server to start (adjust the delay if needed)
Start-Sleep -Seconds 5

# Open the browser with the server URL
Start-Process "http://localhost:3000"

Write-Host "Server is running. Press Ctrl+C to stop the server."
# Keep the script running indefinitely
while ($true) {
    Start-Sleep -Seconds 1
}
