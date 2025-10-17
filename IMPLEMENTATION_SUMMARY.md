# Action-G: Pages-Based Architecture Implementation

## Summary of Changes

Your project has been transformed from a monolithic single-page SPA to a proper pages-based routing architecture while maintaining the Mail-like UI for request details.

## What Was Created

### 1. **RequestDetailsMailPage.tsx** (`src/pages/`)
The main request details page with Mail-like layout:
- **Left Column (2/3 width):**
  - Request information (status, dates, cost)
  - Items table (for purchase requests)
  - Quotes management
  - Action buttons (Approve, Reject, Add Quote, Select Quote)
- **Right Column (1/3 width):**
  - Comments section
  - Add comment form
  - Sticky positioning for easy scrolling

**Features:**
- ✅ Unified page for both Purchase and Project requests
- ✅ Role-based permissions (DM, FM, Accountant)
- ✅ Comment system for collaboration
- ✅ Quote management workflow
- ✅ Approval/Rejection workflow
- ✅ RTL/LTR support
- ✅ Full Arabic/English i18n
- ✅ Mobile responsive design

### 2. **Router Configuration** (`src/lib/router.tsx`)
Centralized routing setup with nested layouts:
```
/
├── Dashboard (/)
├── PRs (/prs)
│   ├── List (/prs)
│   ├── Create (/prs/create)
│   └── Details (/prs/:id)
├── Requests (API alias /requests/:id)
├── Projects (API alias /projects/:id)
├── Inventory (/inventory)
├── Approvals (/approvals)
├── Reports (/reports)
├── Admin (/admin/*)
└── Login (/login)
```

### 3. **Documentation Files**
- `PAGES_ROUTING_GUIDE.md` - Complete implementation guide
- `src/main.tsx.new` - Updated main entry point example

## Implementation Steps

### Step 1: Update main.tsx
Replace your current `src/main.tsx` with the contents of `src/main.tsx.new`:

```tsx
import React from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './lib/router'
import './index.css'

// ... language setup code ...

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
```

**Before:**
```tsx
import App from './App.tsx'
createRoot(document.getElementById('root')!).render(<App />);
```

**After:**
```tsx
import { RouterProvider } from 'react-router-dom'
import { router } from './lib/router'
createRoot(document.getElementById('root')!).render(
  <RouterProvider router={router} />
);
```

### Step 2: Ensure AppLayout.tsx has Outlet
Update `src/components/layout/AppLayout.tsx` to include `<Outlet />`:

```tsx
import { Outlet } from 'react-router-dom'
import Navbar from './header'
import Sidebar from './sidebar'

export default function AppLayout() {
  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar />
        <main className="flex-1 overflow-auto">
          <Outlet /> {/* This renders nested routes */}
        </main>
      </div>
    </div>
  )
}
```

### Step 3: Verify Existing Components
The following pages already exist and are integrated:
- ✅ `src/pages/Dashboard.tsx`
- ✅ `src/pages/Login.tsx`
- ✅ `src/pages/PRList.tsx` (with View button already linking to `/prs/:id`)
- ✅ `src/pages/PRCreate.tsx`
- ✅ `src/pages/InventoryManagement.tsx`
- ✅ `src/pages/Approvals.tsx`
- ✅ `src/pages/Reports.tsx`
- ✅ `src/pages/AdminSettings.tsx`
- ✅ `src/pages/AdminUsers.tsx`
- ✅ `src/pages/NotFound.tsx`

## Navigation Flow

### User Journey: Viewing a Request

1. **User at PRList page** (`/prs`)
   - Sees list of all requests as cards
   - Each card has an Eye icon button
   
2. **Click "View" button**
   - Navigates to `/prs/{requestId}`
   - RequestDetailsMailPage loads

3. **Request Details Displayed**
   - Left: Full request information, quotes, actions
   - Right: Comments section
   - Back button returns to previous page

4. **User Actions** (based on role):
   - **Direct Manager:** Approve/Reject purchase requests
   - **Final Manager:** Select quotes or approve projects
   - **Accountant:** Add quotes to approved purchase requests
   - **Any User:** Post and view comments

## Route Mapping

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | Dashboard | Home/overview |
| `/prs` | PRList | View all purchase requests |
| `/prs/create` | PRCreate | Create new PR |
| `/prs/:id` | RequestDetailsMailPage | View PR with Mail UI |
| `/requests/:id` | RequestDetailsMailPage | Alternative PR details URL |
| `/projects/:id` | RequestDetailsMailPage | View project with Mail UI |
| `/inventory` | InventoryManagement | Manage inventory |
| `/approvals` | Approvals | View pending approvals |
| `/reports` | Reports | View reports |
| `/admin/settings` | AdminSettings | Admin settings |
| `/admin/users` | AdminUsers | Manage users |
| `/login` | Login | Login page |
| `*` | NotFound | 404 page |

## Key Features

### 1. Request Details Page (`RequestDetailsMailPage.tsx`)

#### Information Section
- Status badge with color coding
- Requester name
- Submission date
- Total cost
- Needed by date
- Full description

#### Items Section (Purchase Requests)
- Table with item name, quantity, unit price
- Automatic total calculation

#### Quotes Section
- View all quotes with vendor, total, file link
- Select quote button (Final Manager only)
- Add new quote form (Accountant only)

#### Actions Section
- **DM Actions:** Approve button, Reject with reason
- **FM Actions:** Approve button (for projects), Select quote button (for purchases)
- **Accountant Actions:** Add quote form
- Dynamic action visibility based on request state

#### Comments Section
- Chronological display of all comments
- Comment author and timestamp
- Add comment form at bottom
- Sticky positioning for easy access

### 2. Role-Based Permissions

**Direct Manager (on Purchase Requests in SUBMITTED state):**
- View all request details
- Approve request
- Reject with reason
- View and post comments

**Final Manager (on Purchase Requests in DM_APPROVED state):**
- View all details including quotes
- Select quote
- Approve (after quote selection)
- View and post comments

**Final Manager (on Projects in SUBMITTED state):**
- View all project details
- Approve project
- Reject with reason
- View and post comments

**Accountant (on Purchase Requests in DM_APPROVED state):**
- View all details
- Add quotes (vendor name, total, file URL, notes)
- View and post comments

**Any Authenticated User:**
- View their own requests
- Post and view comments
- Access all read-only information

### 3. Mobile Responsive Design

**Desktop (1024px+):**
```
┌─────────────────────────────────┐
│        Navbar                   │
├────────────────┬────────────────┤
│                │                │
│   Details      │   Comments     │
│   (2/3 width)  │   (1/3 width)  │
│                │                │
│                │                │
└────────────────┴────────────────┘
```

**Tablet (768px - 1023px):**
- 2-column layout maintained
- Smaller fonts and padding
- Compact comment display

**Mobile (< 768px):**
- Single column stacked layout
- Details section first
- Comments section below
- Full width inputs

## API Integration

The page uses these existing API methods:

```typescript
// Get request details
const res = await requestsApi.getRequest(id)

// Get comments
const resp = await requestsApi.getComments(id)

// Add comment
await requestsApi.addComment(id, { content })

// Approve request
const resp = await approvalsApi.approveRequest(id, {})

// Reject request
const resp = await approvalsApi.rejectRequest(id, { comment })

// Select quote
const resp = await approvalsApi.selectQuote(id, { quote_id })

// Upload quote
const resp = await requestsApi.uploadQuoteUrl(id, {
  vendor_name,
  quote_total,
  file_url,
  notes
})
```

## Translation Keys

All text uses existing translation keys. Add these if missing:
- `loading` - Loading indicator text
- `requester` - Requester label
- `status` - Status label
- `submitted` - Submitted date label
- `information` - Information section title
- `items` - Items section title
- `discussion comments` - Comments section title
- `write comment` - Comment input placeholder

## Styling

The page uses:
- **Colors:**
  - `warning` color for main actions (orange/amber)
  - `foreground`/`subtext` for text hierarchy
  - `border`/`secondary` for UI elements
  
- **Components:**
  - shadcn/ui Card, Button, Badge components
  - Custom Tailwind classes from your existing design

- **Layout:**
  - CSS Grid for responsive columns
  - Sticky positioning for comments
  - Overflow handling for long content

## Testing Checklist

- [ ] Click View button from PR List → navigates to /prs/:id
- [ ] Details page loads request information
- [ ] Comments load and display correctly
- [ ] Approve button works (DM role)
- [ ] Reject button works with reason (DM role)
- [ ] Add quote form works (Accountant role)
- [ ] Select quote button works (FM role)
- [ ] Post comment works for all users
- [ ] Back button returns to previous page
- [ ] Mobile layout is responsive
- [ ] Arabic/English switching works
- [ ] RTL/LTR layout switches correctly
- [ ] All buttons disable when no permission

## Troubleshooting

### Issue: RequestDetailsMailPage shows "Request not found"
**Solution:** Check that the request ID in the URL matches your database. The API might be filtering results by user role.

### Issue: Comments not loading
**Solution:** Verify `requestsApi.getComments(id)` endpoint is working. Check console for API errors.

### Issue: Buttons not appearing
**Solution:** Check that `user.role` matches expected values ('DIRECT_MANAGER', 'FINAL_MANAGER', 'ACCOUNTANT').

### Issue: Mobile layout broken
**Solution:** Ensure Tailwind responsive classes are compiled. Check `tailwind.config.js` includes `./src/**/*.{jsx,ts,tsx}`.

## Next Steps

1. **Implement the changes:**
   - Update `src/main.tsx`
   - Ensure `AppLayout.tsx` has `<Outlet />`
   
2. **Test the navigation:**
   - Go to PRList page
   - Click View button on a request
   - Verify RequestDetailsMailPage loads
   
3. **Test role-based actions:**
   - Log in as DM, try approving
   - Log in as FM, try selecting quotes
   - Log in as Accountant, try adding quotes
   
4. **Deploy:**
   - Build: `npm run build`
   - Test in production
   - Monitor console for errors

## Architecture Comparison

### Before (Monolithic SPA)
```
App.tsx (3234 lines)
├── All state management
├── All routing logic
├── All components (mixed concerns)
└── Single entry point
```

### After (Pages-Based)
```
router.tsx (configuration)
├── Centralized routing
├── Nested layouts
└── Clean separation of concerns

Pages/
├── Dashboard.tsx (isolated)
├── PRList.tsx (isolated)
├── RequestDetailsMailPage.tsx (Mail UI)
└── Other pages...

Components/
├── layout/ (reusable layouts)
├── ui/ (reusable components)
└── Specialized components
```

## Support

For issues or questions:
1. Check the `PAGES_ROUTING_GUIDE.md` for detailed setup
2. Review the `RequestDetailsMailPage.tsx` comments
3. Check existing pages for patterns
4. Verify all routes are exported in `router.tsx`

---

**Files Created:**
- ✅ `src/pages/RequestDetailsMailPage.tsx` (460+ lines)
- ✅ `src/lib/router.tsx` (75+ lines)
- ✅ `PAGES_ROUTING_GUIDE.md` (comprehensive guide)
- ✅ `src/main.tsx.new` (updated entry point example)

**Ready to implement!** Follow the implementation steps above to integrate the pages-based routing.
