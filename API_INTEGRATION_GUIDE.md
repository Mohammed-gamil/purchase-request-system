# SpendSwift API Integration Guide

## Overview

This guide documents the successful integration between the SpendSwift React frontend and Laravel backend API. The system now uses real API calls instead of mock data and implements proper role-based access control.

## Architecture

### Frontend (React + TypeScript)
- **Framework**: React 18 with TypeScript
- **State Management**: Zustand with persistence
- **HTTP Client**: Axios with interceptors
- **UI Components**: Custom components with shadcn/ui
- **Authentication**: JWT-based with automatic token management

### Backend (Laravel 11)
- **Framework**: Laravel 11 with PHP 8.2+
- **Authentication**: JWT tokens using tymon/jwt-auth
- **Database**: SQLite (configurable)
- **API**: RESTful API with consistent response format

## API Endpoints

### Authentication Endpoints
```
POST /api/auth/login          - User login
POST /api/auth/logout         - User logout
POST /api/auth/refresh        - Refresh JWT token
GET  /api/auth/me            - Get current user info
GET  /api/auth/profile       - Get user profile
PUT  /api/auth/profile       - Update user profile
POST /api/auth/change-password - Change password
```

### Request Management
```
GET    /api/requests                    - Get all requests (filtered by role)
POST   /api/requests                    - Create new request
GET    /api/requests/{id}              - Get single request
PUT    /api/requests/{id}              - Update request
DELETE /api/requests/{id}              - Delete request
POST   /api/requests/{id}/submit       - Submit request for approval
GET    /api/requests/pending-approvals - Get pending approvals
GET    /api/requests/user/{userId}     - Get user's requests
```

### Dashboard
```
GET /api/dashboard/stats           - Get dashboard statistics
GET /api/dashboard/recent-activity - Get recent activity
```

### Approvals
```
POST /api/approvals/{requestId}/approve      - Approve request
POST /api/approvals/{requestId}/reject       - Reject request
POST /api/approvals/{requestId}/transfer-funds - Transfer funds
GET  /api/approvals/{requestId}/history      - Get approval history
```

### Admin Endpoints
```
GET    /api/admin/users                 - Get all users
POST   /api/admin/users                 - Create user
GET    /api/admin/users/{id}           - Get user details
PUT    /api/admin/users/{id}           - Update user
DELETE /api/admin/users/{id}           - Delete user
POST   /api/admin/users/{id}/toggle-status - Toggle user status
```

## User Roles & Permissions

### USER
- Can create, view, and edit their own requests
- Can submit requests for approval
- Cannot approve requests
- Dashboard shows personal statistics

### DIRECT_MANAGER
- Can approve/reject requests in SUBMITTED state
- Can view requests they need to approve
- Dashboard shows approval statistics

### ACCOUNTANT
- Can approve/reject requests in DM_APPROVED state
- Can view requests they need to approve
- Dashboard shows financial statistics

### FINAL_MANAGER
- Can approve/reject requests in ACCT_APPROVED state
- Can view all requests
- Dashboard shows system-wide statistics

### ADMIN
- Full system access
- Can manage users
- Can view all requests and statistics
- Dashboard shows administrative overview

## Frontend Components

### API Service Layer
- `src/lib/api.ts` - Core API client with axios
- `src/lib/requestsApi.ts` - Request-specific API calls
- `src/lib/auth.ts` - Authentication service

### State Management
- `src/stores/authStore.ts` - Authentication state
- `src/stores/prStore.ts` - Request management state

### Role-Based Components
- `src/components/dashboard/AdminDashboard.tsx` - Admin dashboard
- `src/components/dashboard/UserDashboard.tsx` - User dashboard
- `src/components/auth/RoleGuard.tsx` - Role-based access control

## Authentication Flow

1. User enters credentials on login page
2. Frontend sends POST to `/api/auth/login`
3. Backend validates credentials and returns JWT token
4. Frontend stores token in localStorage and axios headers
5. All subsequent requests include Bearer token
6. Token automatically refreshes when needed
7. 401 responses redirect to login page

## Request Lifecycle

### Purchase Requests
1. User creates request with items
2. Request submitted to direct manager
3. Manager approves/rejects
4. If approved, goes to accountant
5. Accountant approves/rejects
6. If approved, goes to final manager
7. Final manager approves/rejects
8. If approved, admin can transfer funds

### Project Requests
- Similar flow but includes project-specific fields
- Client name, project description, costs, and benefits
- May include optional items list

## Dashboard Statistics

### Admin Dashboard
- Total users and active users
- System-wide request statistics
- Approval rates and trends
- System health metrics

### User Dashboard
- Personal request statistics
- Request status breakdown
- Success rates and spending
- Quick action buttons

### Manager Dashboard (Default)
- Pending approvals count
- Team statistics
- Budget utilization
- Recent activity

## Error Handling

### Frontend
- Axios interceptors handle HTTP errors
- User-friendly error messages via toast notifications
- Automatic token refresh on 401 errors
- Loading states during API calls

### Backend
- Consistent JSON error responses
- Validation error details
- HTTP status codes following REST conventions
- JWT token validation middleware

## Demo Credentials

For testing the integration, use these credentials:

**Admin User:**
- Email: `admin@spendswift.com`
- Password: `password123`
- Role: ADMIN

**Regular User:**
- Email: `mohamed.ali@spendswift.com`  
- Password: `password123`
- Role: USER

## Development Setup

### Backend Setup
```bash
cd spend-swift-backend
composer install
php artisan migrate --seed
php artisan jwt:secret
php artisan serve --host=127.0.0.1 --port=8000
```

### Frontend Setup
```bash
cd spend-swift
npm install
npm run dev
```

### Environment Variables

**Backend (.env):**
```
DB_CONNECTION=sqlite
DB_DATABASE=database/database.sqlite
JWT_SECRET=your_jwt_secret_here
```

**Frontend:**
- API_BASE_URL is configured in `src/lib/api.ts` as `http://127.0.0.1:8000/api`

## API Response Format

All API responses follow this consistent format:

### Success Response
```json
{
  "success": true,
  "data": { /* response data */ },
  "meta": { /* optional metadata like pagination */ }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": 400,
    "message": "Error description",
    "details": ["Detailed error messages"]
  }
}
```

## Security Features

- JWT token-based authentication
- Role-based access control (RBAC)
- CORS protection
- Input validation and sanitization
- SQL injection prevention through Eloquent ORM
- XSS protection via Laravel's built-in features

## Performance Optimizations

- Lazy loading of dashboard components
- Efficient API calls with proper caching
- Optimized bundle size with tree shaking
- Database query optimization with Eloquent relationships
- Pagination for large data sets

## Testing

### Manual Testing Checklist
- [ ] Admin can login and see admin dashboard
- [ ] User can login and see user dashboard
- [ ] User can create purchase requests
- [ ] User can create project requests
- [ ] Manager can approve/reject requests
- [ ] API errors are handled gracefully
- [ ] Token refresh works automatically
- [ ] Role-based access is enforced

### API Testing
Use the provided Postman collections:
- `SpendSwift-API-Collection.json` - Core API endpoints
- `SpendSwift-Complete-API-Collection.json` - Complete collection with response examples

Both collections are configured to use `http://127.0.0.1:8000/api` as the base URL.

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure Laravel backend has proper CORS configuration
   - Check that frontend URL is allowed in backend CORS settings

2. **Authentication Issues**
   - Verify JWT_SECRET is set in backend .env
   - Check token expiration settings
   - Ensure axios interceptors are properly configured

3. **Database Issues**
   - Run `php artisan migrate:fresh --seed` to reset database
   - Check database permissions and file locations

4. **API Connection Issues**
   - Verify backend is running on correct port (8000)
   - Check frontend API_BASE_URL configuration
   - Test API endpoints directly with Postman

## Future Enhancements

- Real-time notifications with WebSockets
- File upload for request attachments
- Advanced reporting and analytics
- Email notifications for approval workflow
- Mobile app support
- Advanced user management features

## Conclusion

The SpendSwift application now has a fully integrated React frontend with Laravel backend, implementing proper authentication, role-based access control, and a complete request management workflow. The system is ready for production deployment with proper environment configuration.
