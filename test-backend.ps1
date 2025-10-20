#!/usr/bin/env pwsh
# Test Backend API and Database

Write-Host "================================" -ForegroundColor Cyan
Write-Host "  Backend API & DB Test" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Navigate to backend
Set-Location -Path "Action-G-backend"

# Test 1: Check if Laravel is working
Write-Host "[1/5] Testing Laravel..." -ForegroundColor Yellow
try {
    $laravelVersion = php artisan --version
    Write-Host "  ✓ $laravelVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Laravel not working" -ForegroundColor Red
    exit 1
}

# Test 2: Check database connection
Write-Host "[2/5] Testing database connection..." -ForegroundColor Yellow
try {
    $dbStatus = php artisan migrate:status 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ Database connected" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Database connection failed" -ForegroundColor Red
        Write-Host "    Make sure MySQL is running on port 3310" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ✗ Could not check database" -ForegroundColor Red
}

# Test 3: Check if visits table exists
Write-Host "[3/5] Checking visits table..." -ForegroundColor Yellow
$visitsCheck = php artisan tinker --execute="echo \App\Models\Visit::count();" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ Visits table exists (Count: $visitsCheck)" -ForegroundColor Green
} else {
    Write-Host "  ✗ Visits table not found" -ForegroundColor Red
    Write-Host "    Run: php artisan migrate" -ForegroundColor Yellow
}

# Test 4: Check business types
Write-Host "[4/5] Checking business types..." -ForegroundColor Yellow
$btCheck = php artisan tinker --execute="echo \App\Models\BusinessType::count();" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ Business types found (Count: $btCheck)" -ForegroundColor Green
    if ($btCheck -eq "0") {
        Write-Host "    ⚠ No business types seeded!" -ForegroundColor Yellow
        Write-Host "    Run: php artisan db:seed --class=BusinessTypeSeeder" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ✗ Business types table not found" -ForegroundColor Red
}

# Test 5: Check product categories
Write-Host "[5/5] Checking product categories..." -ForegroundColor Yellow
$pcCheck = php artisan tinker --execute="echo \App\Models\ProductCategory::count();" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ Product categories found (Count: $pcCheck)" -ForegroundColor Green
    if ($pcCheck -eq "0") {
        Write-Host "    ⚠ No product categories seeded!" -ForegroundColor Yellow
        Write-Host "    Run: php artisan db:seed --class=ProductCategorySeeder" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ✗ Product categories table not found" -ForegroundColor Red
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "  Test Complete!" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. If database tables are missing, run: php artisan migrate" -ForegroundColor White
Write-Host "2. If seed data is missing, run: php artisan db:seed" -ForegroundColor White
Write-Host "3. Start backend: .\start-backend-only.ps1" -ForegroundColor White
Write-Host ""

Set-Location ..
