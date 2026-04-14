# Multi-User Authentication System - Implementation Summary

> [中文版](../zh/MULTI_USER_AUTHENTICATION.md)


## Overview

This document describes the multi-user authentication system implemented for AIGC Assistant.

## Context

Previously, AIGC Assistant was a single-user application with all data shared globally. Users needed multi-user access for private NAS or cloud deployment with:
- Each user seeing only their own data
- Support for both LAN (NAS, no HTTPS) and cloud (public, HTTPS) deployments
- Unauthenticated users seeing content marked as "public"

## Architecture

### Authentication: JWT + Refresh Tokens

- **Access Token**: 15-minute validity, stored in memory via Authorization: Bearer header
- **Refresh Token**: 7-day validity, stored in httpOnly cookie
- **Password Storage**: bcrypt with salt rounds = 10

### Token Storage by Deployment

| Deployment | Cookie | SameSite | HTTPS |
|------------|--------|----------|-------|
| NAS/LAN | httpOnly + localStorage fallback | `lax` | No |
| Cloud | httpOnly | `strict` | Yes |

### Guest Mode: Selective Public Access

- Users can mark content as `is_public = true`
- Unauthenticated users only see `is_public = true` content
- Admin can manage all users but cannot view other users' private content

### Data Isolation: Shared Schema + userId

- All data models have `userId` foreign key
- Queries automatically filter by `userId`
- File storage uses user directory isolation: `uploads/users/{userId}/images/`

## Files Created (8)

### Backend

| File | Purpose |
|------|---------|
| `backend/models/User.js` | User model with bcrypt password hashing |
| `backend/middleware/auth.js` | `authenticate()` and `optionalAuth()` middleware |
| `backend/routes/auth.js` | Auth routes: register, login, logout, refresh, me |
| `backend/routes/files.js` | Protected file serving with user directory isolation |
| `backend/utils/auth.js` | JWT token generation, verification, cookie helpers |
| `backend/migrations/addUsers.js` | Database migration script |

### Frontend

| File | Purpose |
|------|---------|
| `frontend/src/hooks/useAuth.js` | Auth state management hook |
| `frontend/src/pages/AuthPage.jsx` | Login/Register page component |

## Files Modified (17+)

### Backend

| File | Changes |
|------|---------|
| `package.json` | Added bcryptjs, jsonwebtoken, cookie-parser |
| `backend/server.js` | Added cookieParser, registered auth/files routes, removed static uploads |
| `backend/models/index.js` | Added User model, associations, userId relations |
| `backend/models/Prompt.js` | Added userId, is_public fields |
| `backend/models/Image.js` | Added userId, is_public fields |
| `backend/models/Theme.js` | Added userId, is_public fields |
| `backend/models/Asset.js` | Added userId field |
| `backend/models/AssetRelationship.js` | Added userId field |
| `backend/routes/prompts.js` | Added auth middleware, user filtering |
| `backend/routes/images.js` | Added auth, user filtering, user directory storage |
| `backend/routes/themes.js` | Added auth middleware, user filtering |
| `backend/routes/assets.js` | Added auth middleware, user filtering, user directory storage |
| `backend/routes/graph.js` | Added optionalAuth for all endpoints |
| `backend/routes/relationships.js` | Added authenticate middleware |

### Frontend

| File | Changes |
|------|---------|
| `frontend/src/App.jsx` | Added useAuth, AuthPage integration, auth state handling |
| `frontend/src/hooks/useImages.js` | Added isAuthenticated param, credentials: 'include' |
| `frontend/src/hooks/usePrompts.js` | Added isAuthenticated param, credentials: 'include' |
| `frontend/src/hooks/useThemes.js` | Added isAuthenticated param, credentials: 'include' |
| `frontend/src/hooks/useGraph.js` | Changed to relative API path, credentials: 'include' |
| `frontend/src/hooks/useAssets.js` | Changed to relative API path, credentials: 'include' |
| `frontend/src/components/ImageCard.jsx` | Updated image URLs to use protected API |
| `frontend/src/components/ImagePreviewModal.jsx` | Updated image URLs and download to use protected API |
| `frontend/src/components/AssetInspector.jsx` | Changed to relative API path, credentials: 'include' |

### Config

| File | Changes |
|------|---------|
| `.env.example` | Added JWT_SECRET, JWT_EXPIRES_IN, REFRESH_TOKEN_EXPIRES_IN, AUTH_COOKIE_SECURE |
| `docker-compose.yml` | Added JWT environment variables to backend service |

## Environment Variables

```env
# Authentication (required)
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
AUTH_COOKIE_SECURE=false  # true for HTTPS (cloud), false for HTTP (NAS)
```

## Database Changes

### New Table: Users

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| username | VARCHAR(30) | Unique username |
| email | VARCHAR | Unique email |
| password_hash | VARCHAR | bcrypt hashed password |
| is_default | BOOLEAN | Legacy user flag |
| created_at | DATE | Creation timestamp |
| updated_at | DATE | Update timestamp |

### Added to Existing Tables

| Table | Added Columns |
|-------|---------------|
| Prompts | user_id, is_public |
| Images | user_id, is_public |
| Themes | user_id, is_public |
| Assets | user_id |
| AssetRelationships | user_id |

## API Endpoints

### Auth Routes (`/api/auth`)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/auth/register` | POST | No | Register new user |
| `/api/auth/login` | POST | No | Login |
| `/api/auth/logout` | POST | No | Logout (clears cookie) |
| `/api/auth/refresh` | POST | No | Refresh access token |
| `/api/auth/me` | GET | Yes | Get current user info |

### Protected File Routes (`/api/files`)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/files/:userId/:filename` | GET | Optional | Serve user file |

## Migration

### Running the Migration

```bash
node backend/migrations/addUsers.js
```

### What the Migration Does

1. Creates legacy user (id=1) with email `legacy@local`
2. Sets userId=1 for all existing data (Prompts, Images, Themes, Assets, AssetRelationships)
3. Migrates uploaded files to user directory structure: `uploads/users/1/images/`

## Verification Steps

1. **Run Migration**
   ```bash
   node backend/migrations/addUsers.js
   ```

2. **Register User**
   ```bash
   curl -X POST http://localhost:3001/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"username":"test","email":"test@example.com","password":"test123"}'
   ```

3. **Login**
   ```bash
   curl -X POST http://localhost:3001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"test123"}'
   ```

4. **Test Protected Route**
   ```bash
   curl http://localhost:3001/api/prompts \
     -H "Authorization: Bearer <token>"
   ```

5. **Test File Upload**
   ```bash
   curl -X POST http://localhost:3001/api/images \
     -H "Authorization: Bearer <token>" \
     -F "image=@/path/to/image.jpg"
   ```

6. **Test Public Access (unauthenticated)**
   ```bash
   curl http://localhost:3001/api/prompts
   # Should only return is_public=true data
   ```

## Security Considerations

1. **JWT Secret**: Must be changed from default in production
2. **Password Hashing**: Uses bcrypt with 10 salt rounds
3. **Token Storage**: Refresh tokens in httpOnly cookies to prevent XSS
4. **File Access**: Protected by userId check in both API and filesystem
5. **CORS**: Credentials only sent to same-origin API

## Deployment Notes

### NAS/Local Network (HTTP)

```env
AUTH_COOKIE_SECURE=false
```

### Cloud/HTTPS Deployment

```env
AUTH_COOKIE_SECURE=true
```
