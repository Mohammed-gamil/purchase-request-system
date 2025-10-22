# Sales Visit System Simplification

## Overview
The sales visit system has been simplified to focus on visit logging, client management, and notes tracking. Complex project confirmation features have been removed.

## Changes Made

### Frontend Changes

#### 1. Visit Statuses Simplified
**Old Statuses:**
- draft
- submitted
- pending_review
- action_required
- approved
- quotation_sent
- closed_won
- closed_lost

**New Statuses:**
- draft
- submitted
- completed

#### 2. Visit Form Fields Simplified
**Removed Fields:**
- has_previous_agency / previous_agency_name
- needs_voiceover / voiceover_language
- shooting_goals / shooting_goals_other_text
- service_types / service_types_other_text
- preferred_location
- product_category_id
- product_description
- estimated_product_count
- preferred_shoot_date
- budget_range

**New Fields:**
- visit_type (new_client, follow_up, service_delivery)
- visit_result (interested, not_interested, needs_follow_up, deal_closed)
- visit_reason (product_presentation, price_discussion, contract_signing, service_inquiry, complaint_resolution, other)
- follow_up_date
- location_lat / location_lng (GPS coordinates)

**Enhanced Fields:**
- Client form now includes email field

### Backend Changes

#### 1. Visit Model (`app/Models/Visit.php`)
- Updated `$fillable` array with simplified fields
- Updated `$casts` for new field types
- Removed complex field casts (arrays, booleans for removed fields)

#### 2. Visit Controller (`app/Http/Controllers/Api/VisitController.php`)
- Simplified validation rules in `store()` method
- Simplified validation rules in `update()` method
- Simplified status validation to only accept: draft, submitted, completed
- Removed approval logic and complex status transitions
- Updated stats method to return only: total, draft, submitted, completed
- Simplified PDF/Excel export status mapping

#### 3. Client Model (`app/Models/Client.php`)
- Added `email` field to `$fillable` array

#### 4. Database Migration
New migration file: `2025_10_22_000001_simplify_visits_system.php`

**Changes:**
- Adds `email` column to `tbl_clients` table
- Adds new simplified fields to `tbl_visits` table:
  - visit_type
  - visit_result
  - visit_reason
  - follow_up_date
  - location_lat
  - location_lng
- Removes complex fields from `tbl_visits` table
- Updates status enum to simplified values

## How to Apply Changes

### Step 1: Backend Migration

```bash
cd Action-G-backend

# Run the migration
php artisan migrate

# If you need to rollback:
# php artisan migrate:rollback
```

### Step 2: Update Existing Data (Optional)

If you have existing visits in the database, you may want to migrate their statuses:

```sql
-- Map old statuses to new ones
UPDATE tbl_visits 
SET status = CASE 
    WHEN status IN ('approved', 'quotation_sent', 'closed_won') THEN 'completed'
    WHEN status IN ('pending_review', 'action_required') THEN 'submitted'
    ELSE 'draft'
END
WHERE status NOT IN ('draft', 'submitted', 'completed');
```

### Step 3: Frontend Build

```bash
# From the main project directory
npm run build
```

### Step 4: Clear Cache (if needed)

```bash
cd Action-G-backend

# Clear application cache
php artisan cache:clear

# Clear config cache
php artisan config:clear

# Clear route cache
php artisan route:clear
```

## New Visit Workflow

### Sales Rep Workflow:
1. **Create Visit** (status: draft)
   - Select or create client
   - Set visit date
   - Get GPS location (optional)
   - Choose visit type
   
2. **Record Visit Details**
   - Select visit result
   - Select visit reason
   - Add notes
   - Set follow-up date (if needed)
   - Upload photos from location

3. **Submit Visit** (status: submitted)
   - Visit is logged and visible to admin

4. **Complete Visit** (status: completed)
   - Admin or sales rep marks visit as completed

### Admin Capabilities:
- View all visits from all sales reps
- Update visit status
- Add admin notes
- Export visits to Excel/PDF
- View visit statistics

## API Endpoints (No Changes)

All existing API endpoints remain the same:
- `GET /api/visits` - List visits
- `GET /api/visits/{id}` - Get visit details
- `POST /api/visits` - Create visit
- `PUT /api/visits/{id}` - Update visit
- `POST /api/visits/{id}/status` - Update status
- `POST /api/visits/{id}/notes` - Add notes
- `GET /api/visits/stats` - Get statistics
- `POST /api/visits/{id}/files` - Upload file
- `GET /api/visits/clients` - Get clients
- `POST /api/visits/clients` - Create client
- `GET /api/visits/business-types` - Get business types
- `GET /api/visits/export/excel` - Export to Excel
- `GET /api/visits/export/pdf` - Export to PDF

## Testing Checklist

- [ ] Sales rep can create a new visit
- [ ] Sales rep can add/select client with email
- [ ] GPS location can be captured
- [ ] Visit types, results, and reasons display correctly
- [ ] Status can be changed (draft → submitted → completed)
- [ ] Notes can be added
- [ ] Files can be uploaded
- [ ] Admin can view all visits
- [ ] Statistics show correct counts
- [ ] Excel/PDF export works
- [ ] Both English and Arabic translations work

## Rollback Plan

If you need to rollback these changes:

1. Run migration rollback:
   ```bash
   php artisan migrate:rollback
   ```

2. Restore previous code from git:
   ```bash
   git checkout HEAD~1 -- src/components/VisitForm.tsx
   git checkout HEAD~1 -- src/components/VisitDetailView.tsx
   git checkout HEAD~1 -- src/pages/SalesVisitManagement.tsx
   git checkout HEAD~1 -- src/types/visits.ts
   git checkout HEAD~1 -- Action-G-backend/app/Models/Visit.php
   git checkout HEAD~1 -- Action-G-backend/app/Models/Client.php
   git checkout HEAD~1 -- Action-G-backend/app/Http/Controllers/Api/VisitController.php
   ```

3. Rebuild frontend:
   ```bash
   npm run build
   ```

## Support

For questions or issues, please contact the development team.
