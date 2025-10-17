# Pages-Based Routing Implementation Guide

## Overview
This guide explains how to convert your Action-G application from the current monolithic SPA (App.tsx) to a proper pages-based routing architecture with Mail-like detail views.

## Changes Made

### 1. New Files Created

#### `src/pages/RequestDetailsMailPage.tsx`
- Unified request details page that handles both Purchase and Project requests
- Displays request information in a Mail-like layout with:
  - Left panel: Request details, items, quotes, and actions
  - Right panel: Comments section
- Features:
  - Approval/Rejection workflow for managers
  - Quote management for accountants
  - Comments for collaboration
  - Role-based permissions for all actions

#### `src/lib/router.tsx`
- Central router configuration using React Router v6
- Defines all routes with nested layouts
- Key routes:
  - `/` - Dashboard
  - `/prs` - PR List
  - `/prs/create` - Create new PR
  - `/prs/:id` - PR Details (Mail UI)
  - `/requests/:id` - Request Details (alias)
  - `/projects/:id` - Project Details (alias)
  - `/inventory` - Inventory Management
  - `/approvals` - Approvals Page
  - `/reports` - Reports
  - `/admin/*` - Admin pages
  - `/login` - Login page

## How to Use

### Update main.tsx
Replace the App rendering with RouterProvider:

```tsx
import { RouterProvider } from "react-router-dom";
import { router } from "@/lib/router";
import './index.css'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
```

### Update AppLayout Component
Make sure `AppLayout.tsx` includes:
- Navigation sidebar/header
- Language switcher
- User profile section
- `<Outlet />` for nested routes

Example structure:
```tsx
import { Outlet } from "react-router-dom";
import Navbar from "./header";
import Sidebar from "./sidebar";

export default function AppLayout() {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```

## Navigation Examples

### From PR List to Details
In `src/pages/PRList.tsx`, add an "Open" or "View Details" button:

```tsx
import { Link } from "react-router-dom";
import { Eye } from "lucide-react";

// In your PR list item component:
<Link to={`/prs/${pr.id}`} className="inline-flex items-center gap-2 text-blue-600 hover:underline">
  <Eye size={16} />
  View Details
</Link>

// Or use navigate:
import { useNavigate } from "react-router-dom";
const navigate = useNavigate();
navigate(`/prs/${pr.id}`);
```

### From Projects to Details
```tsx
// For project requests:
<Link to={`/projects/${project.id}`} className="...">
  View Project
</Link>
```

## Request Details Page Features

The `RequestDetailsMailPage.tsx` includes:

### Information Display
- Request title and status
- Requester information
- Submission date
- Total cost
- Description

### Items Management (Purchase Requests Only)
- Table of items with quantity and unit price
- Automatic total calculation

### Quotes Management
- Display all quotes with vendor, total, and file link
- Quote selection for Final Managers
- Add new quotes interface for Accountants

### Actions Based on Role

**Direct Manager (Manager viewing Purchase Requests):**
- Approve button
- Reject with reason input

**Final Manager:**
- Approve/Reject for projects
- Select quote for purchase requests after DM approval
- Approve after quote selection

**Accountant:**
- Add quotes to approved purchase requests

**Requester/User:**
- View their own requests
- See comments

### Comments Section
- View all comments in chronological order
- Add new comments
- Real-time comment updates

## Migration Steps

1. **Update main.tsx:**
   - Import `RouterProvider` from react-router-dom
   - Import the `router` from `@/lib/router`
   - Replace App component rendering with RouterProvider

2. **Create/Update AppLayout.tsx:**
   - Ensure it has all navigation elements
   - Include `<Outlet />` for nested routes

3. **Update PRList.tsx:**
   - Add "View Details" buttons that link to `/prs/:id`
   - OR change to use routing for project list

4. **Remove monolithic App.tsx:**
   - Once all pages are working, the old SPA App.tsx can be retired
   - Keep utility functions and move them to appropriate lib files

## Key Features Preserved

✅ Role-based access control
✅ Language switching (Arabic/English)
✅ RTL/LTR support
✅ All approval workflows
✅ Quote management
✅ Comments and collaboration
✅ Inventory management
✅ Admin features

## API Integration

The page uses these API methods (already implemented):
- `requestsApi.getRequest(id)` - Get request details
- `requestsApi.getComments(id)` - Get comments
- `requestsApi.addComment(id, data)` - Add comment
- `approvalsApi.approveRequest(id, data)` - Approve
- `approvalsApi.rejectRequest(id, data)` - Reject
- `approvalsApi.selectQuote(id, data)` - Select quote
- `requestsApi.uploadQuoteUrl(id, data)` - Add quote

## Styling

The page uses your existing:
- Tailwind CSS with custom colors
- shadcn/ui components (Card, Button, Badge)
- Warning/foreground color scheme
- Responsive design

## Mobile Support

The layout is fully responsive:
- Desktop: 3-column layout (details + sidebar)
- Tablet: 2-column layout
- Mobile: Stacked layout with collapsible sections

## Future Enhancements

Consider adding:
- Edit request functionality
- Bulk actions for managers
- Email notifications
- Request templates
- Audit logs
- Print functionality
- Export to PDF
