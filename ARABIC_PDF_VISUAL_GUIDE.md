# 📊 Arabic PDF Visual Guide

## Overview
Visual reference for the three PDF types with Arabic/English bilingual support.

---

## 1️⃣ Inventory Request PDF (Equipment Exit Permit)

### Header Section
```
╔════════════════════════════════════════════════════════════════════════╗
║                   نموذج إذن خروج معدات تصوير                          ║
║                  Equipment Exit Permit Form                            ║
║          Action Group - قسم الإنتاج والتصوير                          ║
║                                                                        ║
║            رقم الطلب / Request ID: REQ-2024-001                       ║
║                    [ SUBMITTED ] Status Badge                          ║
╚════════════════════════════════════════════════════════════════════════╝
```

**Color**: Purple border (#7c3aed)
**Direction**: RTL (Right-to-Left)
**Font**: DejaVu Sans

### Information Sections

#### Employee Information
```
╔═══════════════════════════════════════════════════════════════════╗
║ معلومات الموظف المسؤول / Employee Information                    ║
╟───────────────────────────────────────────────────────────────────╢
║ اسم الموظف / Employee Name:          أحمد محمد                   ║
║ الوظيفة / Position:                  مصور رئيسي                  ║
║ رقم الجوال / Mobile:                 +966501234567               ║
╚═══════════════════════════════════════════════════════════════════╝
```

#### Exit Details
```
╔═══════════════════════════════════════════════════════════════════╗
║ تفاصيل الخروج / Exit Details                                     ║
╟───────────────────────────────────────────────────────────────────╢
║ العنوان / Title:                     تصوير حفل الافتتاح         ║
║ الوصف / Description:                 تغطية حفل افتتاح...        ║
║ اسم العميل/الجهة / Client:            وزارة الثقافة            ║
║ موقع التصوير / Shooting Location:    الرياض - حي السفارات       ║
║ تاريخ الخروج / Exit Date:            2024-01-15                 ║
║ تاريخ العودة المتوقع / Expected:      2024-01-17                 ║
╚═══════════════════════════════════════════════════════════════════╝
```

#### Equipment Items Table
```
╔═══╦════════════════════╦════════╦══════════╦══════════╦═══════════╦════════╗
║ # ║ اسم المعدة         ║ الكود  ║ المطلوبة ║ المعتمدة ║ التسلسلي  ║ الحالة ║
║   ║ Item Name          ║ Code   ║ Req      ║ Approved ║ Serial    ║ Cond   ║
╠═══╬════════════════════╬════════╬══════════╬══════════╬═══════════╬════════╣
║ 1 ║ كاميرا سوني A7S3   ║ CAM-01 ║    2     ║    2     ║ SN-12345  ║ جيد    ║
║   ║ Sony A7S3 Camera   ║        ║          ║          ║           ║ Good   ║
╠═══╬════════════════════╬════════╬══════════╬══════════╬═══════════╬════════╣
║ 2 ║ عدسة 24-70mm      ║ LEN-05 ║    1     ║    1     ║ SN-67890  ║ جيد    ║
║   ║ 24-70mm Lens      ║        ║          ║          ║           ║ Good   ║
╠═══╬════════════════════╬════════╬══════════╬══════════╬═══════════╬════════╣
║ 3 ║ حامل ثلاثي         ║ TRI-02 ║    2     ║    2     ║ SN-11223  ║ جيد    ║
║   ║ Tripod            ║        ║          ║          ║           ║ Good   ║
╚═══╩════════════════════╩════════╩══════════╩══════════╩═══════════╩════════╝
```

### Footer Section
```
╔════════════════════════════════════════════════════════════════════════╗
║                                                                        ║
║    ┌──────────────────────┐         ┌──────────────────────┐         ║
║    │                      │         │                      │         ║
║    │                      │         │                      │         ║
║    │  توقيع الموظف المستلم │         │ توقيع مسؤول المستودع │         ║
║    │ Employee Signature   │         │ Warehouse Supervisor │         ║
║    └──────────────────────┘         └──────────────────────┘         ║
║                                                                        ║
║        تاريخ الطباعة: 2024-01-15 10:30:00 | Printed: 2024-01-15      ║
║             Action Group - Production & Photography Department         ║
╚════════════════════════════════════════════════════════════════════════╝
```

---

## 2️⃣ Inventory Return Receipt PDF

### Header Section
```
╔════════════════════════════════════════════════════════════════════════╗
║                      سند استلام إرجاع المعدات                         ║
║                    Equipment Return Receipt                            ║
║          Action Group - قسم الإنتاج والتصوير                          ║
║                                                                        ║
║            رقم الطلب / Request ID: REQ-2024-001                       ║
║                   [ RETURNED / تم الإرجاع ]                           ║
╚════════════════════════════════════════════════════════════════════════╝
```

**Color**: Green border (#10b981)
**Badge**: Green background with dark green text
**Purpose**: Confirm equipment return

### Return Information
```
╔═══════════════════════════════════════════════════════════════════╗
║ معلومات الإرجاع / Return Information                             ║
╟───────────────────────────────────────────────────────────────────╢
║ تاريخ الخروج / Exit Date:            2024-01-15                 ║
║ تاريخ الإرجاع الفعلي / Actual Return: 2024-01-17                 ║
║ تاريخ العودة المتوقع / Expected:      2024-01-17                 ║
╚═══════════════════════════════════════════════════════════════════╝
```

### Returned Items Table (with Condition Tracking)
```
╔═══╦═══════════════╦════════╦════════╦═════════╦═══════╦══════════╗
║ # ║ اسم المعدة    ║ المطلوبة║ المرجعة║ الحالة  ║ قبل    ║ بعد     ║
║   ║ Item Name     ║ Req    ║ Return ║ Serial  ║ Before║ After   ║
╠═══╬═══════════════╬════════╬════════╬═════════╬═══════╬══════════╣
║ 1 ║ كاميرا سوني   ║   2    ║   2    ║ SN-123  ║ جيد   ║ ✓ جيد    ║
║   ║ Sony Camera   ║        ║        ║         ║ Good  ║ ✓ Good   ║
╠═══╬═══════════════╬════════╬════════╬═════════╬═══════╬══════════╣
║ 2 ║ عدسة          ║   1    ║   1    ║ SN-678  ║ جيد   ║ ✓ جيد    ║
║   ║ Lens          ║        ║        ║         ║ Good  ║ ✓ Good   ║
╠═══╬═══════════════╬════════╬════════╬═════════╬═══════╬══════════╣
║ 3 ║ حامل ثلاثي    ║   2    ║   2    ║ SN-112  ║ جيد   ║ ✗ تالف   ║
║   ║ Tripod        ║        ║        ║         ║ Good  ║ ✗ Damaged║
╚═══╩═══════════════╩════════╩════════╩═════════╩═══════╩══════════╝
```

**Note**: 
- ✓ Good conditions shown in **green**
- ✗ Damaged conditions shown in **red**

### Footer Confirmation
```
╔════════════════════════════════════════════════════════════════════════╗
║                                                                        ║
║              هذا السند يؤكد استلام جميع المعدات المذكورة أعلاه        ║
║        This receipt confirms the return of all equipment listed        ║
║                              above                                      ║
╚════════════════════════════════════════════════════════════════════════╝
```

---

## 3️⃣ Studio Booking Confirmation PDF

### Header Section
```
╔════════════════════════════════════════════════════════════════════════╗
║                        تأكيد حجز الاستوديو                             ║
║                   Studio Booking Confirmation                          ║
║          Action Group - قسم الإنتاج والتصوير                          ║
║                                                                        ║
║          رقم الحجز / Booking Number: BOOK-2024-045                     ║
║                      [ APPROVED ] Status                               ║
╚════════════════════════════════════════════════════════════════════════╝
```

**Color**: Orange border (#f59e0b)
**Purpose**: Confirm studio booking

### Booking Details
```
╔═══════════════════════════════════════════════════════════════════╗
║ تفاصيل الحجز / Booking Details                                   ║
╟───────────────────────────────────────────────────────────────────╢
║ العنوان / Title:                     تصوير منتجات تجارية         ║
║ الوصف / Description:                 تصوير احترافي للمنتجات      ║
║ نوع الحجز / Type:                    Commercial                   ║
║ اسم العميل / Client:                 شركة النجوم                 ║
║ اسم المشروع / Project:               حملة الربيع 2024           ║
╚═══════════════════════════════════════════════════════════════════╝
```

### Schedule Information
```
╔═══════════════════════════════════════════════════════════════════╗
║ معلومات الجدولة / Schedule Information                           ║
╟───────────────────────────────────────────────────────────────────╢
║ التاريخ / Date:                      2024-01-20                   ║
║ وقت البدء / Start Time:              10:00 AM                     ║
║ وقت الانتهاء / End Time:             04:00 PM                     ║
║ المدة / Duration:                    6 ساعة 0 دقيقة               ║
║                                      6 hours 0 minutes             ║
╚═══════════════════════════════════════════════════════════════════╝
```

### Important Notes Section
```
╔═══════════════════════════════════════════════════════════════════╗
║ ⚠️ ملاحظات هامة / Important Notes:                               ║
╟───────────────────────────────────────────────────────────────────╢
║ • يرجى الوصول قبل 15 دقيقة من موعد الحجز                         ║
║   Please arrive 15 minutes before your booking time               ║
║                                                                   ║
║ • التأكد من تنظيف الاستوديو بعد الانتهاء                         ║
║   Please clean the studio after use                              ║
║                                                                   ║
║ • أي تلف في المعدات سيتم تحميله للمسؤول                         ║
║   Any equipment damage will be charged                           ║
║                                                                   ║
║ • في حالة الإلغاء، يرجى الإشعار قبل 24 ساعة                     ║
║   For cancellations, notify 24 hours in advance                  ║
╚═══════════════════════════════════════════════════════════════════╝
```

### Footer Contact
```
╔════════════════════════════════════════════════════════════════════════╗
║        تاريخ الطباعة: 2024-01-15 10:30:00 | Printed: 2024-01-15      ║
║             Action Group - Production & Photography Department         ║
║                                                                        ║
║         للاستفسارات: production@actiongroup.com                        ║
║         For inquiries: production@actiongroup.com                      ║
╚════════════════════════════════════════════════════════════════════════╝
```

---

## 🎨 Color Coding System

### Status Badges
```
┌─────────────────────────────────────────────────────────┐
│ SUBMITTED     →  Blue background, dark blue text        │
│ DM_APPROVED   →  Light green background, dark green text│
│ FINAL_APPROVED→  Green background, dark green text      │
│ RETURNED      →  Purple background, dark purple text    │
│ REJECTED      →  Red background, dark red text          │
│ PENDING       →  Yellow background, brown text          │
│ APPROVED      →  Green background, dark green text      │
│ CANCELLED     →  Gray background, dark gray text        │
│ COMPLETED     →  Blue background, dark blue text        │
└─────────────────────────────────────────────────────────┘
```

### Section Headers
```
Inventory Request PDF    →  Purple (#7c3aed)
Return Receipt PDF       →  Green (#10b981)
Studio Booking PDF       →  Orange (#f59e0b)
```

### Condition Indicators
```
✓ Good/جيد               →  Green text (#059669)
✗ Damaged/تالف           →  Red text (#dc2626)
```

---

## 📐 Layout Specifications

### Page Setup
- **Paper Size**: A4 (210 × 297 mm)
- **Orientation**: Portrait
- **Margins**: 20px all sides
- **Font Size**: 12px (body), 24px (main title)
- **Line Height**: 1.6

### Text Direction
- **Primary Direction**: RTL (Right-to-Left)
- **Text Alignment**: Right
- **Arabic Labels**: First (top/right)
- **English Labels**: Second (bottom/left)

### Section Spacing
- **Header Margin**: 30px bottom
- **Section Margin**: 20px bottom
- **Table Cell Padding**: 8-10px
- **Signature Top Margin**: 40px

---

## 📱 Responsive Features

### Table Columns (Auto-width)
```
# Column        → 5% width
Item Name      → 30% width
Code           → 13-15% width
Quantities     → 12-13% width
Serial/Status  → 13% width
```

### Font Stack
```css
Primary:   'DejaVu Sans' (Unicode Arabic support)
Fallback:  sans-serif
Optional:  'Amiri' (for better Arabic typography)
```

---

## 🔍 Quality Checklist

When viewing generated PDFs, verify:

### ✅ Layout
- [ ] All sections display in correct order
- [ ] No content overflow or cut-off
- [ ] Tables fit within page width
- [ ] Signature sections at bottom

### ✅ Typography
- [ ] Arabic text reads right-to-left
- [ ] No disconnected Arabic characters
- [ ] English text reads left-to-right
- [ ] Font sizes are consistent

### ✅ Data
- [ ] All database fields populate
- [ ] Dates format correctly (YYYY-MM-DD)
- [ ] Times display in 12-hour format with AM/PM
- [ ] Numbers align properly in tables

### ✅ Branding
- [ ] Company name appears in header and footer
- [ ] Department name shows correctly
- [ ] Print timestamp is accurate
- [ ] Status badges show correct colors

### ✅ Bilingual
- [ ] Every label has Arabic and English
- [ ] Arabic text appears first (above/right)
- [ ] English text appears second (below/left)
- [ ] Proper spacing between languages

---

## 🖼️ Sample Data Examples

### Arabic Text Examples
```
• موقع التصوير → Shooting Location
• تاريخ الخروج → Exit Date
• الكمية المطلوبة → Quantity Requested
• حالة المعدة → Equipment Condition
• توقيع الموظف → Employee Signature
```

### Status in Arabic
```
مقدم → Submitted
معتمد → Approved  
مرجع → Returned
مرفوض → Rejected
ملغي → Cancelled
```

### Common Equipment Names
```
كاميرا → Camera
عدسة → Lens
حامل ثلاثي → Tripod
إضاءة → Lighting
ميكروفون → Microphone
```

---

**Document Purpose**: Visual reference for PDF layouts
**Audience**: Developers, Testers, Stakeholders
**Last Updated**: December 2024
**Status**: ✅ Complete Reference Guide
