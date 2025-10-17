# Quick Reference: Pages-Based Architecture

## Files Created/Modified

| File | Status | Purpose |
|------|--------|---------|
| `src/pages/RequestDetailsMailPage.tsx` | ✨ NEW | Mail-like request details page |
| `src/lib/router.tsx` | ✨ NEW | Router configuration |
| `src/main.tsx.new` | 📝 EXAMPLE | Updated entry point |
| `IMPLEMENTATION_SUMMARY.md` | ✨ NEW | Complete guide |
| `PAGES_ROUTING_GUIDE.md` | ✨ NEW | Detailed setup guide |

## Three Steps to Implement

### 1️⃣ Update main.tsx
```tsx
import { RouterProvider } from 'react-router-dom'
import { router } from './lib/router'

createRoot(document.getElementById('root')!).render(
  <RouterProvider router={router} />
);
```

### 2️⃣ Ensure AppLayout has Outlet
```tsx
import { Outlet } from 'react-router-dom'

export default function AppLayout() {
  return (
    <div>
      <Header />
      <main><Outlet /></main>
    </div>
  )
}
```

### 3️⃣ Done! Test it:
- Go to `/prs` (PR List)
- Click View button
- See RequestDetailsMailPage with Mail UI

## Route Examples

```tsx
// Navigate to request details
import { useNavigate } from 'react-router-dom'
const navigate = useNavigate()
navigate(`/prs/${id}`)

// Or use Link
<Link to={`/prs/${id}`}>View Details</Link>

// For projects
<Link to={`/projects/${id}`}>View Project</Link>
```

## Page Layout Structure

### RequestDetailsMailPage Layout
```
Header (Title + Status)
│
├─ Left (2/3)          Right (1/3)
│ ┌─────────────┐     ┌──────────────┐
│ │ Information │     │  Comments    │
│ ├─────────────┤     ├──────────────┤
│ │   Items     │     │ Comment list │
│ ├─────────────┤     │              │
│ │   Quotes    │     │ Add comment  │
│ ├─────────────┤     │ form         │
│ │  Actions    │     └──────────────┘
│ └─────────────┘
```

## Permissions Matrix

| Role | Purchase SUBMITTED | Purchase DM_APPROVED | Project SUBMITTED |
|------|-------------------|----------------------|-------------------|
| DM | ✅ Approve/Reject | ❌ | ❌ |
| FM | ❌ | ✅ Select Quote/Approve | ✅ Approve/Reject |
| Accountant | ❌ | ✅ Add Quotes | ❌ |
| User | View Only | View Only | View Only |

## API Methods Used

```typescript
// GET request
requestsApi.getRequest(id)

// GET comments
requestsApi.getComments(id)

// POST comment
requestsApi.addComment(id, { content })

// POST approve
approvalsApi.approveRequest(id, {})

// POST reject
approvalsApi.rejectRequest(id, { comment })

// POST select quote
approvalsApi.selectQuote(id, { quote_id })

// POST add quote
requestsApi.uploadQuoteUrl(id, { vendor_name, quote_total, file_url, notes })
```

## Key Components

### RequestDetailsMailPage
- **Props:** None (uses `useParams` for ID)
- **State:** Request data, comments, form inputs
- **Actions:** Approve, Reject, Add Quote, Select Quote, Post Comment
- **Responsive:** Desktop (3-col), Tablet (2-col), Mobile (1-col)

### Router
- **Location:** `src/lib/router.tsx`
- **Type:** React Router v6 configuration
- **Uses:** `createBrowserRouter`, nested routes, `Outlet`

## Navigation Flows

### View PR Details
```
PRList (/prs)
  ↓ [Eye Icon]
RequestDetailsMailPage (/prs/:id)
  ↓ [Back Button]
PRList (/prs)
```

### Role-Based Actions

**Direct Manager:**
```
View Submitted PR
  ↓
Review details
  ↓
[Approve] or [Reject with reason]
  ↓
Request state updates
  ↓
Other approvers notified
```

**Accountant:**
```
View DM_APPROVED PR
  ↓
Review details
  ↓
[Add Quote] - vendor, amount, file
  ↓
Request has quotes now
  ↓
FM can select quote
```

**Final Manager:**
```
View PR with Quotes
  ↓
[Select Quote]
  ↓
[Approve]
  ↓
Request approved
  ↓
Funds can transfer
```

## Testing Commands

```bash
# Dev server
npm run dev

# Build
npm run build

# Lint
npm run lint

# Format
npm run lint:fix
```

## Common Issues

| Issue | Fix |
|-------|-----|
| Page shows "Request not found" | Check request ID in URL, verify API permissions |
| No comments showing | Verify `getComments` API endpoint working |
| Buttons not visible | Check `user.role` matches exact strings |
| Mobile layout broken | Check Tailwind config includes all src paths |
| Comments not posting | Check network tab for API errors |
| Can't navigate back | Ensure back button uses `navigate(-1)` |

## Color Scheme

```scss
$warning: #FF9500;           // Action buttons, primary CTAs
$foreground: #000000;        // Main text
$subtext: #666666;           // Secondary text, labels
$border: #E0E0E0;            // Input borders, dividers
$secondary: #F5F5F5;         // Hover states, backgrounds
$success: #10B981;           // Success states
$error: #EF4444;             // Error/reject buttons
```

## Translation Keys

If missing, add these to your `i18n`:
- `loading` - "Loading..."
- `requester` - "Requester"
- `status` - "Status"
- `submitted` - "Submitted"
- `information` - "Information"
- `items` - "Items"
- `quotes` - "Quotes"
- `actions` - "Actions"
- `comments` - "Comments / Discussion & Comments"
- `writeComment` - "Write a comment..."
- `postComment` - "Post Comment"
- `approve` - "Approve"
- `reject` - "Reject"
- `rejectionReason` - "Rejection Reason"

## Quick Deploy Checklist

- [ ] Update `src/main.tsx` with RouterProvider
- [ ] Add `<Outlet />` to AppLayout.tsx
- [ ] Test `/prs` page loads
- [ ] Click View button on a PR
- [ ] RequestDetailsMailPage loads at `/prs/:id`
- [ ] Test approve (DM role)
- [ ] Test add quote (Accountant role)
- [ ] Test select quote (FM role)
- [ ] Test post comment (any user)
- [ ] Test back button
- [ ] Test mobile responsive
- [ ] Test Arabic language
- [ ] Build: `npm run build`
- [ ] Test production build

## File Locations

```
src/
├── lib/
│   ├── router.tsx ........................... Router config
│   ├── api.ts ............................... API methods
│   ├── requestsApi.ts ....................... Request service
│   └── approvalsApi.ts ...................... Approval service
├── pages/
│   ├── RequestDetailsMailPage.tsx ........... Mail UI (NEW)
│   ├── Dashboard.tsx ........................ Home page
│   ├── PRList.tsx ........................... PR list (View button exists!)
│   ├── PRCreate.tsx ......................... Create PR
│   ├── InventoryManagement.tsx ............. Inventory
│   ├── Approvals.tsx ........................ Approvals
│   ├── Reports.tsx .......................... Reports
│   ├── AdminSettings.tsx .................... Admin
│   ├── AdminUsers.tsx ....................... Admin users
│   ├── Login.tsx ............................ Login
│   └── NotFound.tsx ......................... 404
├── components/
│   └── layout/
│       ├── AppLayout.tsx .................... Main layout (needs <Outlet />)
│       ├── header.tsx ....................... Navbar
│       └── sidebar.tsx ...................... Navigation
├── main.tsx ................................ Entry point (CHANGE THIS)
└── index.css ............................... Styles
```

## Next: Going Deeper

For more details, see:
- 📖 `IMPLEMENTATION_SUMMARY.md` - Full implementation guide
- 📖 `PAGES_ROUTING_GUIDE.md` - Complete setup instructions
- 📝 `src/pages/RequestDetailsMailPage.tsx` - Component comments
- 📝 `src/lib/router.tsx` - Router comments

---

**Ready?** Copy `src/main.tsx.new` to `src/main.tsx` and you're good to go! 🚀
