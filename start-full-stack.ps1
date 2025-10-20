#!/usr/bin/env pwsh
# SpendSwift Full Stack Startup Script
# This script starts both the Laravel backend and React frontend with proper configuration

Write-Host "====================================" -ForegroundColor Cyan
Write-Host "  SpendSwift Full Stack Startup" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$BACKEND_PORT = 8001
$FRONTEND_PORT = 5173
$BACKEND_DIR = "Action-G-backend"

# Step 1: Check if backend .env exists
Write-Host "[1/6] Checking backend environment..." -ForegroundColor Yellow
if (-not (Test-Path "$BACKEND_DIR\.env")) {
    Write-Host "  Creating backend .env from example..." -ForegroundColor Green
    Copy-Item "$BACKEND_DIR\.env.example" "$BACKEND_DIR\.env"
}

# Step 2: Check if frontend .env exists
Write-Host "[2/6] Checking frontend environment..." -ForegroundColor Yellow
if (-not (Test-Path ".env")) {
    Write-Host "  Creating frontend .env..." -ForegroundColor Green
    @"
# API Configuration - LOCAL DEVELOPMENT
VITE_API_URL=http://127.0.0.1:$BACKEND_PORT/api

# Environment
VITE_APP_ENV=development

# Demo Mode
VITE_DEMO_MODE=false
"@ | Out-File -FilePath ".env" -Encoding utf8
} else {
    # Update existing .env to use correct port
    $envContent = Get-Content ".env" -Raw
    if ($envContent -notmatch "VITE_API_URL=http://127.0.0.1:$BACKEND_PORT/api") {
        Write-Host "  Updating frontend .env with correct API URL..." -ForegroundColor Green
        $envContent = $envContent -replace 'VITE_API_URL=.*', "VITE_API_URL=http://127.0.0.1:$BACKEND_PORT/api"
        $envContent | Out-File -FilePath ".env" -Encoding utf8 -NoNewline
    }
}

# Step 3: Check database connection
Write-Host "[3/6] Checking database connection..." -ForegroundColor Yellow
Push-Location $BACKEND_DIR
try {
    $dbCheck = php artisan migrate:status 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ⚠ Database connection issue. Please ensure MySQL is running on port 3310" -ForegroundColor Red
        Write-Host "    and database 'finaldb' exists." -ForegroundColor Red
        Write-Host ""
        Write-Host "  Do you want to continue anyway? (Y/N)" -ForegroundColor Yellow
        $response = Read-Host
        if ($response -ne 'Y' -and $response -ne 'y') {
            Pop-Location
            exit 1
        }
    } else {
        Write-Host "  ✓ Database connection OK" -ForegroundColor Green
    }
} catch {
    Write-Host "  ⚠ Could not check database status" -ForegroundColor Yellow
}
Pop-Location

# Step 4: Clear Laravel cache
Write-Host "[4/6] Clearing Laravel cache..." -ForegroundColor Yellow
Push-Location $BACKEND_DIR
php artisan config:clear | Out-Null
php artisan cache:clear | Out-Null
php artisan route:clear | Out-Null
Write-Host "  ✓ Cache cleared" -ForegroundColor Green
Pop-Location

# Step 5: Kill any existing processes on the ports
Write-Host "[5/6] Checking for processes on ports $BACKEND_PORT and $FRONTEND_PORT..." -ForegroundColor Yellow

# Kill backend port
$backendProcess = Get-NetTCPConnection -LocalPort $BACKEND_PORT -ErrorAction SilentlyContinue
if ($backendProcess) {
    $pid = $backendProcess.OwningProcess | Select-Object -First 1
    Write-Host "  Stopping process on port $BACKEND_PORT (PID: $pid)..." -ForegroundColor Yellow
    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}

# Kill frontend port
$frontendProcess = Get-NetTCPConnection -LocalPort $FRONTEND_PORT -ErrorAction SilentlyContinue
if ($frontendProcess) {
    $pid = $frontendProcess.OwningProcess | Select-Object -First 1
    Write-Host "  Stopping process on port $FRONTEND_PORT (PID: $pid)..." -ForegroundColor Yellow
    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}

# Step 6: Start servers
Write-Host "[6/6] Starting servers..." -ForegroundColor Yellow
Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "  Backend:  http://127.0.0.1:$BACKEND_PORT" -ForegroundColor Green
Write-Host "  Frontend: http://localhost:$FRONTEND_PORT" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop all servers" -ForegroundColor Yellow
Write-Host ""

# Start backend in a new window
$backendCmd = "cd '$BACKEND_DIR'; php artisan serve --host=127.0.0.1 --port=$BACKEND_PORT"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCmd -WindowStyle Normal

# Wait a bit for backend to start
Write-Host "Waiting for backend to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Start frontend in current window
Write-Host "Starting frontend..." -ForegroundColor Yellow
npm run dev

# Cleanup on exit
Write-Host ""
Write-Host "Shutting down..." -ForegroundColor Yellow
