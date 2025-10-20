#!/usr/bin/env pwsh
# Start Laravel Backend on Port 8001

Write-Host "Starting Laravel Backend on http://127.0.0.1:8001" -ForegroundColor Cyan
Write-Host ""

# Navigate to backend directory
Set-Location -Path "Action-G-backend"

# Clear cache
Write-Host "Clearing Laravel cache..." -ForegroundColor Yellow
php artisan config:clear | Out-Null
php artisan cache:clear | Out-Null
php artisan route:clear | Out-Null

# Start server
Write-Host "Server starting..." -ForegroundColor Green
Write-Host "API URL: http://127.0.0.1:8001/api" -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

php artisan serve --host=127.0.0.1 --port=8001
