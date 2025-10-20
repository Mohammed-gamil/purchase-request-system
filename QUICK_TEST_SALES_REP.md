# 🧪 Quick Test Guide - Sales Rep Access

## ✅ Changes Summary
Fixed 6 issues preventing SALES_REP from accessing Sales Visits section.

---

## 🚀 Test Steps

### 1. **Start Servers**

```powershell
# Terminal 1 - Backend
cd Action-G-backend
php artisan serve

# Terminal 2 - Frontend  
cd ..
npm run dev
```

### 2. **Login as Sales Rep**

Open: http://localhost:5173

```
Email: sales@test.com
Password: password
```

### 3. **✅ Expected Results**

#### Sidebar Should Show:
- ✅ لوحة القيادة (Dashboard)
- ✅ الإشعارات (Notifications)
- ❌ ~~إنشاء طلب جديد~~ (HIDDEN) ✅
- ❌ ~~إرسال مشروع~~ (HIDDEN) ✅
- ✅ الطلبات (Requests) - Read only
- ✅ **طلبات الزيارات (Sales Visits)** - **NOW VISIBLE!** 🎉

#### Header Should Display:
```
Ahmed Sales Rep • مندوب مبيعات
```

#### Clicking "Sales Visits" Should:
- ✅ Open Sales Visit Management page
- ✅ Show "My Visits" header
- ✅ Show "+ إنشاء زيارة جديدة" button
- ✅ Show filter options
- ✅ Show export buttons (Excel, PDF)
- ✅ Display only visits created by this rep

---

## 🔍 What Changed?

### File: `src/App.tsx`

1. **Added "sales" role type**
   ```typescript
   role: "user" | "manager" | "accountant" | "sales"  // ✅ Added
   ```

2. **Fixed role mapping**
   ```typescript
   case "SALES_REP": return "sales";  // ✅ Added
   ```

3. **Allowed SALES_REP to access Sales Visits**
   ```typescript
   {(currentUser.apiRole === "SALES_REP" || ...) && (  // ✅ Added
     <button>Sales Visits</button>
   )}
   ```

4. **Hidden purchase request buttons**
   ```typescript
   {currentUser.apiRole !== "SALES_REP" && (  // ✅ Added
     <button>Create New Request</button>
   )}
   ```

5. **Added translations**
   ```typescript
   sales: "Sales Representative"  // EN
   sales: "مندوب مبيعات"           // AR
   ```

### File: `src/pages/SalesVisitManagement.tsx`

6. **Fixed role detection**
   ```typescript
   const isSalesRep = currentUser.apiRole === 'SALES_REP';  // ✅ Fixed
   ```

---

## ❌ Common Issues

### Issue 1: "Sales Visits" not showing
**Solution:** Clear browser cache and reload (Ctrl+Shift+R)

### Issue 2: Login fails
**Solution:** Check if backend is running on port 8000

### Issue 3: "Unauthorized" error
**Solution:** Re-seed users with `php artisan db:seed --class=UserSeeder`

---

## 📊 Test Matrix

| User | Email | Can Access Sales Visits? | Can Create Requests? |
|------|-------|-------------------------|---------------------|
| Sales Rep 1 | sales@test.com | ✅ YES | ❌ NO |
| Sales Rep 2 | sales2@test.com | ✅ YES | ❌ NO |
| Admin | admin@test.com | ✅ YES | ✅ YES |
| Regular User | user@test.com | ❌ NO | ✅ YES |

---

## ✅ Success Criteria

- [ ] Sales Rep can login successfully
- [ ] "Sales Visits" menu item is visible
- [ ] "Create New Request" button is hidden
- [ ] "Submit Project" button is hidden
- [ ] Sales Visits page loads without errors
- [ ] Can create new visit
- [ ] Can view only own visits
- [ ] Export buttons work

---

## 🎉 Expected Outcome

**Sales Rep now has:**
- ✅ Full access to Sales Visits section
- ✅ Ability to create/edit/view own visits
- ✅ Export functionality
- ❌ No access to Purchase Requests creation
- ❌ No access to Inventory/Admin sections

**Perfect separation of concerns!** 🚀

---

**Test Date:** October 21, 2025  
**Status:** Ready for Testing
