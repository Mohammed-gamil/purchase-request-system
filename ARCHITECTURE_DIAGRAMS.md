# Architecture Diagrams

## Application Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                         main.tsx (Entry Point)                   │
│                      with RouterProvider                         │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │ router.tsx     │
                    │ (Routes Config)│
                    └────────┬───────┘
                             │
                ┌────────────┼────────────┐
                ▼            ▼            ▼
          ┌─────────────┐ ┌────────┐ ┌─────────┐
          │ AppLayout   │ │ Login  │ │ NotFound│
          │ (Main)      │ │ Page   │ │ Page    │
          └──────┬──────┘ └────────┘ └─────────┘
                 │
         ┌───────┴───────────────────────────┐
         │      <Outlet /> renders child    │
         │                                  │
         ▼                                  ▼
    ┌──────────────┐               ┌─────────────┐
    │ Dashboard    │               │ PRList      │
    │ Page         │               │ Page        │
    └──────────────┘               └──────┬──────┘
                                          │
                                    [View Button]
                                          │
                                          ▼
                          ┌──────────────────────────────┐
                          │ RequestDetailsMailPage       │
                          │ (Mail UI Layout)             │
                          │                              │
                          │ Left (2/3):                  │
                          │ • Information                │
                          │ • Items                      │
                          │ • Quotes                     │
                          │ • Actions                    │
                          │                              │
                          │ Right (1/3):                 │
                          │ • Comments                   │
                          └──────────────────────────────┘
```

## Route Tree

```
/
├── /                              → Dashboard
├── /prs                           → PRList
│   ├── /prs/create                → PRCreate
│   └── /prs/:id                   → RequestDetailsMailPage
├── /requests/:id                  → RequestDetailsMailPage (alias)
├── /projects/:id                  → RequestDetailsMailPage (alias)
├── /inventory                     → InventoryManagement
├── /approvals                     → Approvals
├── /reports                       → Reports
├── /admin
│   ├── /admin/settings            → AdminSettings
│   └── /admin/users               → AdminUsers
├── /login                         → Login
└── *                              → NotFound
```

## Request Details Page Layout

### Desktop (1024px+)
```
┌───────────────────────────────────────────────────────────────────┐
│ Navigation Bar                                                    │
├───────────────────────────────────────────────────────────────────┤
│ ◄ Back | Title ................................. Status Badge    │
├─────────────────────────────────────┬─────────────────────────────┤
│                                     │                             │
│  Left Column (2/3)                  │ Right Column (1/3)          │
│  ┌─────────────────────────────┐    │ ┌───────────────────────┐   │
│  │ Information Card            │    │ │ Comments Section      │   │
│  │ • Status                    │    │ │ ┌─────────────────┐   │   │
│  │ • Submitted date            │    │ │ │ Comment 1       │   │   │
│  │ • Cost                      │    │ │ ├─────────────────┤   │   │
│  │ • Needed by                 │    │ │ │ Comment 2       │   │   │
│  │ • Description               │    │ │ ├─────────────────┤   │   │
│  └─────────────────────────────┘    │ │ │ Comment 3       │   │   │
│  ┌─────────────────────────────┐    │ │ └─────────────────┘   │   │
│  │ Items Card (if Purchase)    │    │ │ ┌─────────────────┐   │   │
│  │ • Item name | Qty | Price   │    │ │ │ Add comment:    │   │   │
│  │ • Item name | Qty | Price   │    │ │ │ ┌────────────┐  │   │   │
│  └─────────────────────────────┘    │ │ │ │ [textarea] │  │   │   │
│  ┌─────────────────────────────┐    │ │ │ └────────────┘  │   │   │
│  │ Quotes Card (if Purchase)   │    │ │ │ [Post Comment]  │   │   │
│  │ • Vendor | Total | Action   │    │ │ └─────────────────┘   │   │
│  │ • Vendor | Total | Action   │    │ │                       │   │
│  └─────────────────────────────┘    │ └───────────────────────┘   │
│  ┌─────────────────────────────┐    │                             │
│  │ Actions Card                │    │                             │
│  │ [Approve] [Reject]          │    │                             │
│  │ or [Add Quote] or [Select]  │    │                             │
│  └─────────────────────────────┘    │                             │
│                                     │                             │
└─────────────────────────────────────┴─────────────────────────────┘
```

### Mobile (< 768px)
```
┌─────────────────────────────────┐
│ Navigation Bar                  │
├─────────────────────────────────┤
│ ◄ Back | Title | Status Badge   │
├─────────────────────────────────┤
│                                 │
│ Information Card                │
│ • Status                        │
│ • Date                          │
│ • Cost                          │
│                                 │
├─────────────────────────────────┤
│ Items Card                      │
│                                 │
├─────────────────────────────────┤
│ Quotes Card                     │
│                                 │
├─────────────────────────────────┤
│ Actions Card                    │
│ [Approve] [Reject]              │
│                                 │
├─────────────────────────────────┤
│ Comments Section                │
│ Comment 1                       │
│ Comment 2                       │
│ ┌──────────────────────┐        │
│ │ Add comment:         │        │
│ │ [textarea]           │        │
│ │ [Post Comment]       │        │
│ └──────────────────────┘        │
│                                 │
└─────────────────────────────────┘
```

## Data Flow

```
┌─────────────────────────────────────┐
│  User navigates to /prs/:id         │
└────────────────┬────────────────────┘
                 │
                 ▼
    ┌────────────────────────────┐
    │ RequestDetailsMailPage     │
    │ loads component            │
    └────────────┬───────────────┘
                 │
        ┌────────┴────────┐
        ▼                 ▼
   ┌────────────┐  ┌──────────────┐
   │ useEffect  │  │ useEffect    │
   │ loads      │  │ loads        │
   │ request    │  │ comments     │
   └────┬───────┘  └──────┬───────┘
        │                 │
        ▼                 ▼
   ┌────────────┐  ┌──────────────┐
   │requestsApi │  │ requestsApi  │
   │.getRequest │  │.getComments  │
   └────┬───────┘  └──────┬───────┘
        │                 │
        ▼                 ▼
   [State Updated]   [State Updated]
        │                 │
        └────────┬────────┘
                 │
                 ▼
         ┌──────────────────┐
         │ Component Re-    │
         │ renders with     │
         │ new data         │
         └──────────────────┘
```

## User Actions Flow

```
                    REQUEST DETAILS PAGE
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
    Approve         Add Comment        Select Quote
       │                  │                  │
       ├─ Check DM ──┐    ├─ Any user ──┐   ├─ Check FM ──┐
       │ permission  │    │ permission  │   │ permission  │
       │             │    │             │   │             │
       ▼             ▼    ▼             ▼   ▼             ▼
    approvalsApi  requestsApi      approvalsApi
    .approve()    .addComment()     .selectQuote()
       │                  │              │
       ▼                  ▼              ▼
    Request state   Comments list  Request state
    → DM_APPROVED   updated        → Quote selected
       │                │              │
       └────────┬───────┴──────────────┘
                │
                ▼
         UI Re-renders
         New state shown
         Success toast
```

## Role-Based Access Matrix

```
┌─────────────┬──────────┬──────────┬──────────┬──────────┐
│ Action      │ DM       │ FM       │ Acct     │ User     │
├─────────────┼──────────┼──────────┼──────────┼──────────┤
│ View PR     │ ✓        │ ✓        │ ✓        │ own only │
│ Approve     │ * ✓      │ * ✓      │ ✗        │ ✗        │
│ Reject      │ * ✓      │ * ✓      │ ✗        │ ✗        │
│ Add Quote   │ ✗        │ ✗        │ ** ✓     │ ✗        │
│ Select Q.   │ ✗        │ *** ✓    │ ✗        │ ✗        │
│ Post Comment│ ✓        │ ✓        │ ✓        │ ✓        │
│ Edit PR     │ ✗        │ ✗        │ ✗        │ draft✓   │
└─────────────┴──────────┴──────────┴──────────┴──────────┘

Legend:
* = Purchase only, state SUBMITTED
** = state DM_APPROVED
*** = state DM_APPROVED with quotes
✓ = Allowed
✗ = Not allowed
```

## API Call Sequence

```
Browser Request:
  GET /prs/123
       │
       ▼
Router: RequestDetailsMailPage(:id)
       │
       ├─────────────────────────────────────┐
       │                                     │
       ▼                                     ▼
  componentMount              componentMount
  useEffect() [1]             useEffect() [2]
       │                           │
       ▼                           ▼
  requestsApi               requestsApi
  .getRequest(123)          .getComments(123)
       │                           │
       ▼                           ▼
  GET /api/requests/123      GET /api/requests/123/comments
       │                           │
       └────────┬───────────────────┘
                │
       Response received
                │
       ┌────────┴────────┐
       │                 │
       ▼                 ▼
  setRequest()    setComments()
       │                 │
       └────────┬────────┘
                │
       Component Re-renders
       UI displays data
```

## State Management

```
RequestDetailsMailPage
│
├─ request: Request | null
│  └─ API response from getRequest()
│
├─ comments: Comment[]
│  └─ API response from getComments()
│
├─ newComment: string
│  └─ Form input for posting comment
│
├─ rejectionReason: string
│  └─ Form input for rejection
│
├─ newQuoteVendor: string
│  newQuoteUrl: string
│  newQuoteTotal: string
│  newQuoteNotes: string
│  └─ Form inputs for adding quote
│
├─ loading: boolean
│  └─ Request data loading state
│
├─ error: string | null
│  └─ Error message if any
│
└─ actionInProgress: string | null
   └─ Which action is being performed
```

## Database Relationships (Conceptual)

```
User (Requester)
  │
  ▼
Request
  │
  ├─ Requester (User)
  ├─ DirectManager (User)
  ├─ CurrentApprover (User)
  │
  ├─ Items (array)
  │  └─ name, quantity, unit_price
  │
  ├─ Quotes (array)
  │  ├─ vendor_name
  │  ├─ quote_total
  │  └─ file_url
  │
  ├─ SelectedQuote (Quote)
  │
  ├─ Approvals (array)
  │  ├─ stage (DM/ACCT/FINAL)
  │  ├─ decision (APPROVED/REJECTED)
  │  ├─ comment
  │  └─ approver (User)
  │
  └─ Comments (array)
     ├─ author (User)
     ├─ content
     └─ created_at
```

## Deployment Sequence

```
Development:
src/main.tsx.new  ←── Copy to
        │
        ▼
   src/main.tsx ←── Add RouterProvider
        │
        ▼
  AppLayout.tsx ←── Add <Outlet />
        │
        ▼
   npm run dev ←── Test locally
        │
        ▼
   Browser http://localhost:5173
        │
        ▼
  /prs ─ [View] ──→ /prs/:id
        │
        └──── ✓ Works!

Production:
   npm run build
        │
        ▼
   dist/ folder
        │
        ▼
   Deploy to server
        │
        ▼
   Verify routes work
        │
        └──── ✓ Done!
```

---

**These diagrams help visualize:**
- App structure and routing
- Component hierarchy
- Page layout at different screen sizes
- Data flow and state management
- User permissions and access control
- API call sequences
- Deployment process

Use these as reference while implementing the pages-based architecture!
