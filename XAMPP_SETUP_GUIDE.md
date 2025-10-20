# 🚀 دليل التشغيل - XAMPP

## ⚡ خطوات سريعة

### 1️⃣ تشغيل XAMPP
```
1. افتح XAMPP Control Panel
2. اضغط Start على Apache
3. اضغط Start على MySQL
```

### 2️⃣ إنشاء قاعدة البيانات
```
1. افتح المتصفح واذهب إلى: http://localhost/phpmyadmin
2. اضغط "New" أو "جديد"
3. اسم قاعدة البيانات: finaldb
4. Collation: utf8mb4_unicode_ci
5. اضغط Create
```

### 3️⃣ تشغيل Migrations
```bash
cd D:\VVideos\Action-g\Action-g\Action-G-backend
php artisan migrate
```

**النتيجة المتوقعة:**
```
✅ 2025_01_20_000001_create_sales_visits_tables ... DONE
```

### 4️⃣ إضافة مستخدمين تجريبيين

**في phpMyAdmin:**
1. اختر قاعدة البيانات `finaldb`
2. اضغط على تبويب SQL
3. انسخ والصق الكود من ملف `XAMPP_TEST_USERS.sql`
4. اضغط Go

**أو من Terminal:**
```bash
cd D:\VVideos\Action-g\Action-g\Action-G-backend
php artisan tinker --execute="DB::table('users')->insert(['name' => 'Ahmed Sales', 'email' => 'sales@test.com', 'password' => bcrypt('password'), 'created_at' => now(), 'updated_at' => now()]);"
```

### 5️⃣ تشغيل Backend Server
```bash
cd D:\VVideos\Action-g\Action-g\Action-G-backend
php artisan serve
```

**Backend يعمل على:** http://localhost:8000

### 6️⃣ تشغيل Frontend
```bash
cd D:\VVideos\Action-g\Action-g
npm run dev
```

**Frontend يعمل على:** http://localhost:5173

---

## 🔐 بيانات تسجيل الدخول

### Sales Representative:
```
Email: sales@test.com
Password: password
```

### Admin:
```
Email: admin@test.com
Password: password
```

---

## 🐛 حل المشاكل الشائعة

### مشكلة: "Column not found: role"
**الحل:**
```sql
-- في phpMyAdmin، نفذ هذا:
ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'USER' AFTER password;
ALTER TABLE users ADD COLUMN is_active TINYINT(1) DEFAULT 1 AFTER role;
```

### مشكلة: "Table users doesn't exist"
**الحل:**
```bash
# تأكد أن قاعدة البيانات موجودة
php artisan migrate:fresh
```

### مشكلة: "Access denied for user"
**الحل:**
افحص ملف `.env`:
```
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=finaldb
DB_USERNAME=root
DB_PASSWORD=
```

### مشكلة: "Port 8000 already in use"
**الحل:**
```bash
# استخدم port مختلف
php artisan serve --port=8001
```

---

## ✅ التحقق من التثبيت

### 1. تحقق من الجداول:
```sql
-- في phpMyAdmin:
SHOW TABLES;
```

**يجب أن ترى:**
- users
- tbl_business_types
- tbl_product_categories
- tbl_clients
- tbl_visits
- tbl_visit_files
- tbl_visit_status_history

### 2. تحقق من البيانات الأولية:
```sql
-- في phpMyAdmin:
SELECT COUNT(*) FROM tbl_business_types;
-- النتيجة: 9

SELECT COUNT(*) FROM tbl_product_categories;
-- النتيجة: 9
```

### 3. تحقق من المستخدمين:
```sql
SELECT id, name, email, role FROM users;
```

### 4. اختبر API:
افتح المتصفح: http://localhost:8000/api/health
```json
{
  "success": true,
  "message": "API is working"
}
```

---

## 📋 الخطوة التالية

بعد التأكد من كل شيء:

1. افتح المتصفح: http://localhost:5173
2. سجل دخول بـ: sales@test.com / password
3. اذهب إلى "My Visits"
4. اضغط "New Visit"
5. جرب إنشاء زيارة جديدة
6. جرب Export to Excel

---

## 🎉 جاهز!

إذا نجحت جميع الخطوات، النظام الآن يعمل بالكامل على XAMPP!

---

## 📞 ملفات مهمة

- **XAMPP_TEST_USERS.sql** - إضافة مستخدمين تجريبيين
- **EXPORT_FEATURE_DOCUMENTATION.md** - شرح ميزة التصدير
- **MIGRATION_SUCCESS_REPORT.md** - تقرير الـ migrations
- **QUICK_START_EXPORT.md** - دليل سريع للتصدير

---

**التاريخ:** 21 أكتوبر 2025
**الحالة:** ✅ جاهز للتشغيل على XAMPP
