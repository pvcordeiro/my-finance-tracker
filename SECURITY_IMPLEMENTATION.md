# Security Implementation: Session-Based Authentication

## Overview

This document outlines the security improvements implemented to replace the insecure localStorage-based user authentication with a secure session-based system using HTTP-only cookies.

## Changes Made

### 1. Session Management System (`lib/session.js`)
- **Session token generation**: Uses crypto.randomBytes(32) for secure session tokens
- **Session storage**: Sessions are stored in the database with expiration times
- **Session validation**: Validates tokens and returns user data for authenticated requests
- **Session cleanup**: Automatically removes expired sessions
- **HTTP-only cookies**: Session tokens are stored in secure, HTTP-only cookies

### 2. Database Schema Updates (`lib/database.js`)
- Added `sessions` table with the following columns:
  - `id`: Primary key
  - `token`: Unique session token
  - `user_id`: Foreign key to users table
  - `expires_at`: Session expiration timestamp
  - `created_at`: Session creation timestamp
  - `last_accessed`: Last access timestamp for session management
- Added proper indexes for performance
- Automatic cleanup of expired sessions every hour

### 3. Authentication Middleware (`lib/auth-middleware.js`)
- `withAuth()`: Higher-order function to protect API routes
- Validates session tokens from cookies
- Injects authenticated user data into request context
- Returns appropriate error responses for unauthorized requests

### 4. Updated API Routes

#### Authentication Routes:
- **`/api/auth/login`**: Now creates sessions and sets HTTP-only cookies
- **`/api/auth/register`**: Creates sessions for new users
- **`/api/auth/logout`**: Destroys sessions and clears cookies
- **`/api/auth/session`**: Validates current session from cookies

#### Protected Routes:
- **`/api/entries`**: Now uses session authentication instead of userId params
- **`/api/bank-amount`**: Protected with session authentication
- All user data routes now automatically use the authenticated user's ID

### 5. Frontend Updates (`hooks/use-auth.tsx`)
- Removed localStorage usage completely
- Session validation on app startup via `/api/auth/session`
- Proper cookie handling with `credentials: 'include'`
- Secure logout that calls the server logout endpoint

### 6. Data Management (`hooks/use-finance-data.tsx`)
- Removed userId parameters from API calls
- Added `credentials: 'include'` to all authenticated requests
- Server now automatically determines user from session

## Security Benefits

### Before (Insecure):
- ❌ User data stored in localStorage (accessible via JavaScript)
- ❌ Anyone could read/modify user data client-side
- ❌ No proper session management
- ❌ UserId passed as URL parameters (easily manipulated)

### After (Secure):
- ✅ HTTP-only cookies (not accessible via JavaScript)
- ✅ Secure session tokens generated server-side
- ✅ Session expiration and cleanup
- ✅ Server-side authentication for all protected routes
- ✅ No user data stored client-side
- ✅ Protection against XSS attacks accessing session data

## Session Configuration

- **Session Duration**: 24 hours
- **Cookie Settings**:
  - `httpOnly: true` - Not accessible via JavaScript
  - `secure: true` in production - HTTPS only
  - `sameSite: 'lax'` - CSRF protection
  - `path: '/'` - Available for entire app

## Deployment Notes

1. **Environment Variables**: Set `NODE_ENV=production` for secure cookies in production
2. **HTTPS**: Ensure HTTPS is used in production for secure cookies
3. **Database Migration**: The sessions table is created automatically on startup

## Testing

To test the implementation:

1. Start the development server: `npm run dev`
2. Try logging in - should set session cookie
3. Refresh the page - should maintain login state via session validation
4. Try accessing protected API routes directly - should require authentication
5. Logout - should clear session and require re-authentication

## Security Considerations

- Session tokens are cryptographically secure (32 bytes)
- Sessions expire automatically after 24 hours
- Old sessions are cleaned up to prevent database bloat
- All user data API calls now require valid sessions
- No sensitive data is stored client-side
