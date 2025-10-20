# 🚀 Quick Start - Sales Visit System

## One-Command Setup

### PowerShell (Windows)
```powershell
cd Action-G-backend; .\setup-sales-system.ps1
```

### Bash (Linux/Mac)
```bash
cd Action-G-backend && bash setup-sales-system.sh
```

---

## Manual Setup (Step by Step)

### 1. Fresh Database
```bash
cd Action-G-backend
php artisan migrate:fresh
```

### 2. Seed Business Types & Product Categories
```bash
php artisan db:seed --class=SalesVisitSeeder
```
**Result:** 15 Business Types + 14 Product Categories

### 3. Seed Users
```bash
php artisan db:seed --class=UserSeeder
```
**Result:** 3 users (1 Admin + 2 Sales Reps)

---

## Test Accounts

| Email | Password | Role | Access |
|-------|----------|------|--------|
| `admin@test.com` | `password` | ADMIN | Everything |
| `sales@test.com` | `password` | SALES_REP | Sales Visits Only |
| `sales2@test.com` | `password` | SALES_REP | Sales Visits Only |

---

## Start Servers

### Backend (Laravel)
```bash
cd Action-G-backend
php artisan serve --port=8001
```
**URL:** http://localhost:8001

### Frontend (React)
```bash
npm run dev
```
**URL:** http://localhost:8082

---

## Verify Setup

```bash
cd Action-G-backend
php artisan tinker --execute="
echo 'Business Types: ' . App\Models\BusinessType::count() . PHP_EOL;
echo 'Product Categories: ' . App\Models\ProductCategory::count() . PHP_EOL;
echo 'Sales Users: ' . App\Models\User::where('role', 'SALES_REP')->count() . PHP_EOL;
"
```

**Expected Output:**
```
Business Types: 15
Product Categories: 14
Sales Users: 2
```

---

## Re-seed Data Only

### Re-seed Business Types & Categories
```bash
php artisan db:seed --class=SalesVisitSeeder
```

### Re-seed Users
```bash
php artisan db:seed --class=UserSeeder
```

### Re-seed Everything
```bash
php artisan migrate:fresh --seed
```

---

## Common Issues

### Issue: "Class not found"
**Solution:**
```bash
composer dump-autoload
php artisan db:seed --class=SalesVisitSeeder
```

### Issue: "Business Types dropdown empty"
**Solution:**
```bash
php artisan db:seed --class=SalesVisitSeeder
```

### Issue: "Can't login"
**Solution:**
```bash
php artisan db:seed --class=UserSeeder
```

---

## Complete Reset (Nuclear Option)

```bash
cd Action-G-backend
php artisan migrate:fresh
php artisan db:seed --class=SalesVisitSeeder
php artisan db:seed --class=UserSeeder
```

---

## Business Types Added (15)

1. Restaurants (مطاعم)
2. Cafes (مقاهي)
3. Retail Stores (متاجر تجزئة)
4. Fashion & Clothing (أزياء وملابس)
5. Electronics (إلكترونيات)
6. Beauty & Cosmetics (تجميل ومستحضرات)
7. Food Products (منتجات غذائية)
8. Real Estate (عقارات)
9. Healthcare (رعاية صحية)
10. Automotive (سيارات)
11. Jewelry (مجوهرات)
12. Furniture (أثاث)
13. Sports & Fitness (رياضة ولياقة)
14. Education (تعليم)
15. Other (أخرى)

---

## Product Categories Added (14)

1. Food & Beverages (طعام ومشروبات)
2. Fashion (أزياء)
3. Electronics (إلكترونيات)
4. Cosmetics (مستحضرات تجميل)
5. Home & Garden (منزل وحديقة)
6. Sports Equipment (معدات رياضية)
7. Toys & Games (ألعاب)
8. Books & Stationery (كتب وقرطاسية)
9. Automotive Parts (قطع سيارات)
10. Jewelry & Accessories (مجوهرات وإكسسوارات)
11. Medical Supplies (مستلزمات طبية)
12. Building Materials (مواد بناء)
13. Services (خدمات)
14. Other (أخرى)

---

**Ready to use!** 🎉
