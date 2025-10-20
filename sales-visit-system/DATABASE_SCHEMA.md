# Sales Visit System - Database Schema

## Overview
This document defines the complete database structure for the Action Group Sales Rep Visit Registration System. This is a **standalone system** separate from the existing purchase request application.

---

## Database Tables

### 1. `tbl_users`
**Purpose:** Store all system users (Sales Reps and Admins)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| user_id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique user identifier |
| email | VARCHAR(255) | UNIQUE, NOT NULL | Login email |
| password_hash | VARCHAR(255) | NOT NULL | Hashed password (bcrypt) |
| full_name | VARCHAR(255) | NOT NULL | Full name (Arabic/English) |
| mobile | VARCHAR(20) | NULLABLE | Contact number |
| role | ENUM('admin', 'rep') | NOT NULL, DEFAULT 'rep' | User role |
| is_active | BOOLEAN | DEFAULT TRUE | Account status (never delete, only deactivate) |
| remember_token | VARCHAR(255) | NULLABLE | For "Remember Me" sessions |
| password_reset_token | VARCHAR(255) | NULLABLE | Forgot password token |
| password_reset_expires | DATETIME | NULLABLE | Token expiration |
| failed_login_attempts | INT | DEFAULT 0 | Brute-force protection counter |
| locked_until | DATETIME | NULLABLE | Account lock timestamp |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | |

**Indexes:**
- `idx_email` on `email`
- `idx_role_active` on (`role`, `is_active`)

---

### 2. `tbl_clients`
**Purpose:** Master client database (separate from visits to prevent duplication)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| client_id | INT | PRIMARY KEY, AUTO_INCREMENT | |
| store_name | VARCHAR(255) | NOT NULL | Business/Store name |
| contact_person | VARCHAR(255) | NOT NULL | Contact person name |
| mobile | VARCHAR(20) | NOT NULL | Primary mobile |
| mobile_2 | VARCHAR(20) | NULLABLE | Secondary mobile (optional) |
| address | TEXT | NOT NULL | Full address |
| business_type_id | INT | FOREIGN KEY → tbl_business_types | |
| created_by_rep_id | INT | FOREIGN KEY → tbl_users | Which rep first added this client |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | |

**Indexes:**
- `idx_store_name` on `store_name` (for search)
- `idx_business_type` on `business_type_id`

**Notes:**
- This table prevents duplicate clients across visits
- Reps search this table before creating a new visit
- If client doesn't exist, rep adds them inline

---

### 3. `tbl_business_types`
**Purpose:** Predefined, structured business categories (for reporting)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| business_type_id | INT | PRIMARY KEY, AUTO_INCREMENT | |
| name_en | VARCHAR(100) | NOT NULL | English name |
| name_ar | VARCHAR(100) | NOT NULL | Arabic name (e.g., "مجوهرات") |
| is_active | BOOLEAN | DEFAULT TRUE | Can be disabled by admin |
| sort_order | INT | DEFAULT 0 | Display order in dropdown |

**Default Data:**
```sql
INSERT INTO tbl_business_types (name_en, name_ar, sort_order) VALUES
('Jewelry', 'مجوهرات', 1),
('Clinic', 'عيادة', 2),
('Factory', 'مصنع', 3),
('E-commerce', 'تجارة إلكترونية', 4),
('Restaurant', 'مطعم', 5),
('Retail Store', 'محل بيع بالتجزئة', 6),
('Other', 'أخرى', 99);
```

---

### 4. `tbl_visits`
**Purpose:** Core table - each sales rep visit record

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| visit_id | INT | PRIMARY KEY, AUTO_INCREMENT | |
| client_id | INT | FOREIGN KEY → tbl_clients, NOT NULL | |
| rep_id | INT | FOREIGN KEY → tbl_users, NOT NULL | Which rep submitted this visit |
| visit_date | DATE | NOT NULL | Actual date of visit |
| status | ENUM | NOT NULL, DEFAULT 'draft' | See status workflow below |
| **Client Needs (Structured)** | | | |
| has_previous_agency | BOOLEAN | NOT NULL | Currently working with another agency? |
| previous_agency_name | VARCHAR(255) | NULLABLE | Appears if has_previous_agency = TRUE |
| needs_voiceover | BOOLEAN | NOT NULL | Needs voice-over? |
| voiceover_language | VARCHAR(50) | NULLABLE | Appears if needs_voiceover = TRUE |
| shooting_goals | JSON | NOT NULL | Array: ['social_media', 'in_store', 'content_update', 'other'] |
| shooting_goals_other_text | TEXT | NULLABLE | If 'other' selected |
| service_types | JSON | NOT NULL | Array: ['product_photo', 'model_photo', 'video', 'other'] |
| service_types_other_text | TEXT | NULLABLE | |
| preferred_location | ENUM | NOT NULL | 'client_location', 'action_studio', 'external' |
| **Product Details** | | | |
| product_category_id | INT | FOREIGN KEY → tbl_product_categories | |
| product_description | TEXT | NULLABLE | Detailed product description |
| estimated_product_count | INT | NULLABLE | Number of products/SKUs |
| **Timing & Budget** | | | |
| preferred_shoot_date | DATE | NULLABLE | Client's preferred date |
| budget_range | VARCHAR(50) | NULLABLE | e.g., "<5000", "5000-10000", ">10000" |
| **Notes & Status Tracking** | | | |
| rep_notes | TEXT | NULLABLE | Rep's internal notes (editable by rep) |
| admin_notes | TEXT | NULLABLE | Admin/Manager notes (visible to rep) |
| action_required_message | TEXT | NULLABLE | When admin sends visit back to rep |
| **Metadata** | | | |
| submitted_at | TIMESTAMP | NULLABLE | When status changed from draft → submitted |
| approved_at | TIMESTAMP | NULLABLE | When approved by admin |
| approved_by_admin_id | INT | FOREIGN KEY → tbl_users, NULLABLE | |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | |

**Status Enum Values:**
```sql
ENUM('draft', 'submitted', 'pending_review', 'action_required', 'approved', 'quotation_sent', 'closed_won', 'closed_lost')
```

**Indexes:**
- `idx_rep_status` on (`rep_id`, `status`)
- `idx_status_date` on (`status`, `visit_date`)
- `idx_client_visits` on `client_id`

---

### 5. `tbl_product_categories`
**Purpose:** Structured product categories (like business types)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| category_id | INT | PRIMARY KEY, AUTO_INCREMENT | |
| name_en | VARCHAR(100) | NOT NULL | |
| name_ar | VARCHAR(100) | NOT NULL | |
| is_active | BOOLEAN | DEFAULT TRUE | |
| sort_order | INT | DEFAULT 0 | |

**Default Data:**
```sql
INSERT INTO tbl_product_categories (name_en, name_ar, sort_order) VALUES
('Jewelry', 'مجوهرات', 1),
('Cosmetics', 'مستحضرات تجميل', 2),
('Food & Beverages', 'أطعمة ومشروبات', 3),
('Electronics', 'إلكترونيات', 4),
('Machinery', 'معدات وآلات', 5),
('Fashion & Apparel', 'أزياء وملابس', 6),
('Other', 'أخرى', 99);
```

---

### 6. `tbl_visit_files`
**Purpose:** File attachments (photos/videos) for each visit

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| file_id | INT | PRIMARY KEY, AUTO_INCREMENT | |
| visit_id | INT | FOREIGN KEY → tbl_visits, ON DELETE CASCADE | |
| file_type | ENUM('photo', 'video') | NOT NULL | |
| original_filename | VARCHAR(255) | NOT NULL | |
| stored_filename | VARCHAR(255) | NOT NULL | Unique filename on server/S3 |
| file_size_bytes | BIGINT | NOT NULL | |
| mime_type | VARCHAR(100) | NOT NULL | e.g., 'image/jpeg', 'video/mp4' |
| storage_url | TEXT | NOT NULL | Full URL to file (S3 bucket or local path) |
| upload_status | ENUM('uploading', 'completed', 'failed') | DEFAULT 'uploading' | |
| uploaded_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | |

**Constraints:**
- Max file size: 100MB
- Allowed types: `.jpg`, `.jpeg`, `.png`, `.mp4`, `.mov`

**Indexes:**
- `idx_visit_files` on `visit_id`

---

### 7. `tbl_visit_status_history`
**Purpose:** Audit trail - track every status change

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| history_id | INT | PRIMARY KEY, AUTO_INCREMENT | |
| visit_id | INT | FOREIGN KEY → tbl_visits | |
| from_status | VARCHAR(50) | NULLABLE | Previous status (NULL if first status) |
| to_status | VARCHAR(50) | NOT NULL | New status |
| changed_by_user_id | INT | FOREIGN KEY → tbl_users | |
| notes | TEXT | NULLABLE | Why the change was made |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | |

**Indexes:**
- `idx_visit_history` on `visit_id`

---

## Critical Relationships & Constraints

### Foreign Key Rules:
```sql
-- Users table
ALTER TABLE tbl_clients 
  ADD CONSTRAINT fk_client_rep 
  FOREIGN KEY (created_by_rep_id) REFERENCES tbl_users(user_id) 
  ON DELETE SET NULL;

-- Visits table
ALTER TABLE tbl_visits
  ADD CONSTRAINT fk_visit_client 
  FOREIGN KEY (client_id) REFERENCES tbl_clients(client_id) 
  ON DELETE RESTRICT;  -- Can't delete client if visits exist

ALTER TABLE tbl_visits
  ADD CONSTRAINT fk_visit_rep 
  FOREIGN KEY (rep_id) REFERENCES tbl_users(user_id) 
  ON DELETE RESTRICT;  -- Can't delete rep if visits exist

-- Files table
ALTER TABLE tbl_visit_files
  ADD CONSTRAINT fk_file_visit 
  FOREIGN KEY (visit_id) REFERENCES tbl_visits(visit_id) 
  ON DELETE CASCADE;  -- Delete files when visit deleted (admin only)
```

---

## Data Integrity Rules

1. **User Deletion:** NEVER allow actual deletion. Use `is_active = FALSE` to deactivate.
2. **Client Duplication:** Frontend MUST search `tbl_clients` before allowing "Add New Client."
3. **Visit Editability:**
   - Status = `draft`: Rep can edit ALL fields
   - Status = `submitted` or later: Rep can ONLY edit `rep_notes`
   - Admin can change status and edit `admin_notes` at any time
4. **File Cleanup:** Implement a cron job to delete orphaned files (status = 'failed' for >24 hours)

---

## Status Workflow State Machine

```
[Draft] ──(Rep Submits)──> [Submitted]
                               │
                               ▼
                        [Pending Review] ◄──────┐
                               │                 │
                   ┌───────────┴────────────┐    │
                   ▼                        ▼    │
            [Action Required]          [Approved]│
                   │                             │
                   └─────(Rep Fixes)─────────────┘
                                                  │
                                                  ▼
                                         [Quotation Sent]
                                                  │
                                     ┌────────────┴────────────┐
                                     ▼                         ▼
                               [Closed - Won]          [Closed - Lost]
```

**Allowed Transitions:**
- Rep can move: `draft` → `submitted`
- Admin can move: Any status to any status (with notes)
- Rep can edit after `action_required` status (specific fields unlocked)

---

## Performance Considerations

### Indexes for Common Queries:
1. **Admin Dashboard:**
   ```sql
   SELECT * FROM tbl_visits 
   WHERE status = 'pending_review' 
   ORDER BY visit_date DESC;
   ```
   → Index on (`status`, `visit_date`)

2. **Rep's Visit List:**
   ```sql
   SELECT * FROM tbl_visits 
   WHERE rep_id = ? 
   ORDER BY created_at DESC;
   ```
   → Index on (`rep_id`, `created_at`)

3. **Client Search (Autocomplete):**
   ```sql
   SELECT * FROM tbl_clients 
   WHERE store_name LIKE '%keyword%' 
   OR mobile LIKE '%keyword%';
   ```
   → Full-text index on `store_name` for large datasets

---

## Migration Scripts

### Initial Schema (MySQL Example):
```sql
-- Create database
CREATE DATABASE action_group_sales_visits 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE action_group_sales_visits;

-- Run CREATE TABLE statements from above...
-- Run INSERT default data statements...
-- Run ALTER TABLE for foreign keys...

-- Create admin user
INSERT INTO tbl_users (email, password_hash, full_name, role) 
VALUES ('admin@actiongroup.com', '$2y$10$...', 'Admin User', 'admin');
```

---

## Backup & Security Notes

1. **Daily Backups:** Automate database backups (exclude `tbl_visit_files` blob data if stored on S3)
2. **Sensitive Data:** Store only file *URLs* in database, not file content
3. **GDPR Compliance:** If needed, add `deleted_at` timestamps for soft deletes (instead of hard deletes)
4. **API Rate Limiting:** Implement rate limits on file upload endpoints (max 10 files per minute per user)

---

## Next Steps for Developers

1. Use this schema to create migration files for your framework (Laravel, Node.js, etc.)
2. Set up seeders for `tbl_business_types` and `tbl_product_categories`
3. Create ER diagram tool visualization from this schema
4. Define API endpoints based on this data model (see `API_SPECIFICATION.md` next)

---

**Document Version:** 1.0  
**Last Updated:** October 20, 2025  
**Author:** Development Team
