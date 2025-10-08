# Inventory Management System Documentation

## Overview

The inventory management system allows managers and admins to track tools, equipment, and materials. Users can select inventory items when creating project requests, and the system automatically reserves items when projects are approved.

## Features

### ✅ Inventory Management
- **Add/Edit/Delete Items**: Managers and admins can manage inventory items
- **Categories**: Organize items by category (Tools, Equipment, Materials, etc.)
- **Stock Tracking**: Real-time tracking of total, reserved, and available quantities
- **Maintenance Tracking**: Schedule and track maintenance dates
- **Condition Status**: Track item condition (good, fair, needs_maintenance)
- **Location Tracking**: Record storage locations

### ✅ Inventory Selection for Projects
- **Browse & Search**: Search and filter available inventory items
- **Quantity Management**: Request specific quantities with availability checks
- **Return Date Tracking**: Set expected return dates for borrowed items
- **Automatic Reservation**: Items are automatically reserved when project is approved

### ✅ Transaction History
- **Full Audit Trail**: Track all inventory movements (IN, OUT, RESERVE, RELEASE)
- **Request Linking**: See which requests used which items
- **User Tracking**: Know who performed each action

## Database Schema

### `inventory_items`
```sql
- id: Primary key
- name: Item name
- code: Unique code (INV-2025-0001)
- description: Item description
- category: Item category
- quantity: Total quantity in stock
- reserved_quantity: Quantity reserved for projects
- available_quantity: Computed (quantity - reserved_quantity)
- unit: Unit of measurement (piece, kg, meter, etc.)
- unit_cost: Cost per unit
- location: Storage location
- condition: Item condition (good, fair, needs_maintenance)
- last_maintenance_date: Last maintenance performed
- next_maintenance_date: Next maintenance due
- is_active: Active status
- notes: Additional notes
- added_by: User who added the item
- updated_by: User who last updated
- created_at, updated_at, deleted_at
```

### `inventory_transactions`
```sql
- id: Primary key
- inventory_item_id: FK to inventory_items
- type: Transaction type (IN, OUT, RESERVE, RELEASE, ADJUSTMENT, MAINTENANCE)
- quantity: Quantity change (positive or negative)
- quantity_before: Quantity before transaction
- quantity_after: Quantity after transaction
- related_request_id: FK to requests (optional)
- user_id: FK to users (who performed the action)
- notes: Transaction notes
- created_at, updated_at
```

### `request_inventory_items`
```sql
- id: Primary key
- request_id: FK to requests
- inventory_item_id: FK to inventory_items
- quantity_requested: Quantity requested
- quantity_allocated: Quantity actually allocated
- status: PENDING, RESERVED, ALLOCATED, RETURNED, LOST
- expected_return_date: When item should be returned
- actual_return_date: When item was actually returned
- return_notes: Notes about return
- created_at, updated_at
```

## API Endpoints

### Inventory Management

#### Get All Inventory Items
```http
GET /api/inventory
Query Params:
  - per_page: number (default: 15)
  - category: string
  - search: string
  - in_stock_only: boolean
  - active_only: boolean
```

#### Get Single Item
```http
GET /api/inventory/{id}
```

#### Create Inventory Item (Manager/Admin only)
```http
POST /api/inventory
Body: {
  name: string (required)
  description: string
  category: string (required)
  quantity: number (required)
  unit: string (required)
  unit_cost: number
  location: string
  condition: "good" | "fair" | "needs_maintenance"
  last_maintenance_date: date
  next_maintenance_date: date
  notes: string
}
```

#### Update Inventory Item (Manager/Admin only)
```http
PUT /api/inventory/{id}
Body: {
  name: string
  description: string
  category: string
  unit: string
  unit_cost: number
  location: string
  condition: "good" | "fair" | "needs_maintenance"
  last_maintenance_date: date
  next_maintenance_date: date
  is_active: boolean
  notes: string
}
```

#### Adjust Quantity (Manager/Admin only)
```http
POST /api/inventory/{id}/adjust
Body: {
  quantity: number (required)
  type: "add" | "remove" | "set" (required)
  notes: string
}
```

#### Get Transactions
```http
GET /api/inventory/{id}/transactions
Query Params:
  - per_page: number (default: 50)
```

#### Get Categories
```http
GET /api/inventory/categories
```

#### Delete Item (Admin only)
```http
DELETE /api/inventory/{id}
```

### Project Request Inventory

#### Get Request Inventory Items
```http
GET /api/requests/{id}/inventory
```

#### Attach Inventory Items (DRAFT projects only)
```http
POST /api/requests/{id}/inventory
Body: {
  inventory_items: [
    {
      inventory_item_id: number (required)
      quantity_requested: number (required)
      expected_return_date: date
    }
  ]
}
```

## Workflow

### 1. Adding Inventory Items
1. Manager/Admin logs in
2. Navigates to Inventory Management
3. Clicks "Add Item"
4. Fills in item details:
   - Name, category, quantity, unit
   - Optional: description, location, cost, condition
5. System generates unique code (e.g., INV-2025-0001)
6. Transaction is logged as "IN" type

### 2. Creating Project with Inventory
1. User creates new project request
2. Fills in project details (client, dates, costs)
3. Clicks "Select Inventory Items"
4. Searches/filters available items
5. Selects items and specifies quantities
6. System validates availability
7. Items are attached with status "PENDING"
8. User submits project

### 3. Project Approval & Reservation
1. Final Manager approves project
2. Project state changes to "PROCESSING"
3. System automatically:
   - Reserves requested quantities
   - Updates `reserved_quantity` in inventory_items
   - Changes status to "RESERVED" in request_inventory_items
   - Creates "RESERVE" transaction records
4. Items are now unavailable for other projects

### 4. Project Completion & Return
1. Requester marks project as "DONE"
2. Items can be marked as returned (future feature)
3. Accountant confirms client payment
4. System can release reservations (future feature)

## Business Logic

### Inventory Availability
- **Available Quantity** = Total Quantity - Reserved Quantity
- Items can only be reserved if sufficient available quantity exists
- Reservations are automatic when project is approved (moves to PROCESSING)

### Permissions
- **View**: All authenticated users
- **Add/Edit Items**: Managers and Admins only
- **Adjust Quantities**: Managers and Admins only
- **Delete Items**: Admins only
- **Select for Projects**: All users (when creating projects)

### Validation Rules
1. **Quantity Checks**:
   - Cannot request more than available quantity
   - Cannot reduce total quantity below reserved amount
   - Cannot delete items with active reservations

2. **Status Transitions**:
   - PENDING → RESERVED (when project approved)
   - RESERVED → ALLOCATED (when items physically handed out)
   - ALLOCATED → RETURNED (when items returned)

3. **Date Validation**:
   - Expected return date must be after project start time
   - Next maintenance date must be after last maintenance date

## Frontend Components

### `InventorySelection.tsx`
- Component for selecting inventory items in project creation
- Features:
  - Search and filter available items
  - View item details (name, code, category, availability)
  - Add/remove items from selection
  - Set quantity and expected return date
  - Real-time availability validation

Usage:
```tsx
<InventorySelection
  selectedItems={inventoryItems}
  onSelectionChange={setInventoryItems}
  projectStartTime={startTime}
  projectEndTime={endTime}
  readOnly={false}
/>
```

### `InventoryManagement.tsx`
- Full inventory management page for managers/admins
- Features:
  - Grid view of all inventory items
  - Search and category filters
  - Item cards showing stock levels and status
  - Add/edit/delete functionality
  - Condition and maintenance warnings

## Integration Points

### With Project Requests
- Inventory items can be attached during project creation
- Items are validated for availability
- Automatic reservation on project approval

### With Approval Flow
- When Final Manager approves project → items reserved
- When project marked DONE → items can be returned
- Transaction history maintains audit trail

### With User Roles
- User model has `canManageInventory()` method
- Checks for DIRECT_MANAGER, FINAL_MANAGER, or ADMIN roles
- API endpoints enforce permissions via middleware

## Migration & Setup

### Run Migrations
```bash
cd Action-G-backend
php artisan migrate
```

This will create:
- `inventory_items` table
- `inventory_transactions` table
- `request_inventory_items` table

### Seed Sample Data (Optional)
Create a seeder to add sample inventory items for testing.

## Future Enhancements

### Planned Features
1. **Return Management**: Track when items are returned from projects
2. **Damage Reporting**: Record damaged or lost items
3. **Low Stock Alerts**: Notify managers when stock is low
4. **Bulk Import**: Import items from CSV/Excel
5. **QR Code Labels**: Generate QR codes for physical items
6. **Maintenance Reminders**: Automated email reminders for maintenance
7. **Cost Tracking**: Track total value of inventory
8. **Vendor Management**: Link items to preferred vendors
9. **Photo Attachments**: Add photos of inventory items
10. **Inventory Reports**: Analytics and usage reports

## Troubleshooting

### Common Issues

**Issue**: "Insufficient inventory" error when creating project
- **Solution**: Check available quantity. Another project may have reserved the items.

**Issue**: Cannot delete inventory item
- **Solution**: Ensure no active reservations exist. Release all reservations first.

**Issue**: Items not showing in selection list
- **Solution**: Check that items are marked as `is_active = true` and have available quantity > 0.

**Issue**: Permission denied when adding items
- **Solution**: Only managers and admins can add inventory items. Check user role.

## API Error Codes

- **403**: Permission denied (not a manager/admin)
- **404**: Inventory item not found
- **422**: Validation failed (insufficient quantity, invalid data)
- **500**: Server error (check logs)

## Testing

### Manual Testing Checklist
- [ ] Create inventory item as manager
- [ ] View inventory list
- [ ] Search and filter items
- [ ] Create project with inventory items
- [ ] Approve project (items should be reserved)
- [ ] Check transaction history
- [ ] Adjust inventory quantity
- [ ] Try to reserve more than available (should fail)
- [ ] Mark project done
- [ ] View availability changes

### API Testing with cURL
```bash
# Get all inventory items
curl -H "Authorization: Bearer {token}" \
  http://localhost:8000/api/inventory

# Create inventory item
curl -X POST -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Electric Drill",
    "category": "Tools",
    "quantity": 5,
    "unit": "piece"
  }' \
  http://localhost:8000/api/inventory
```

## Support

For issues or questions:
1. Check API error messages
2. Review Laravel logs: `Action-G-backend/storage/logs/laravel.log`
3. Check browser console for frontend errors
4. Verify user permissions and role

---

**Version**: 1.0.0  
**Last Updated**: October 8, 2025  
**Author**: Action-G Development Team
