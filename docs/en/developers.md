# Developer Guide

> [中文版](../zh/developers.md)


## Testing Methods

### Testing API with curl Commands

#### Authentication API

All API requests that require authentication must include an Access Token in the header:
```bash
-H "Authorization: Bearer <access_token>"
```

**Login to get Token**
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpassword"}' \
  -c cookies.txt \
  http://localhost:3001/api/auth/login
```

**Register a new user**
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"username":"yourname","email":"your@email.com","password":"yourpassword"}' \
  -c cookies.txt \
  http://localhost:3001/api/auth/register
```

**Get current user info**
```bash
curl -H "Authorization: Bearer <access_token>" \
  http://localhost:3001/api/auth/me
```

**Logout**
```bash
curl -X POST -c cookies.txt http://localhost:3001/api/auth/logout
```

#### 1. Test Prompt API

- **Get all prompts**
  ```bash
  curl http://localhost:3001/api/prompts
  ```

- **Get unused prompts**
  ```bash
  curl http://localhost:3001/api/prompts/unused
  ```

- **Create a new prompt**
  ```bash
  curl -X POST -H "Content-Type: application/json" -d '{"content": "test prompt"}' http://localhost:3001/api/prompts
  ```

- **Update prompt score**
  ```bash
  curl -X PUT -H "Content-Type: application/json" -d '{"score": 8}' http://localhost:3001/api/prompts/1/score
  ```

- **Delete a prompt**
  ```bash
  curl -X DELETE http://localhost:3001/api/prompts/1
  ```

#### 2. Test Image API

- **Get all images**
  ```bash
  curl http://localhost:3001/api/images
  ```

- **Upload an image**
  ```bash
  curl -X POST -F "image=@/path/to/image.png" -F "promptId=1" http://localhost:3001/api/images
  ```

- **Update image score**
  ```bash
  curl -X PUT -H "Content-Type: application/json" -d '{"score": 9}' http://localhost:3001/api/images/1/score
  ```

- **Delete an image**
  ```bash
  curl -X DELETE http://localhost:3001/api/images/1
  ```

#### 3. Test Theme API

- **Get all themes**
  ```bash
  curl http://localhost:3001/api/themes
  ```

- **Create a new theme**
  ```bash
  curl -X POST -H "Content-Type: application/json" -d '{"name": "test theme", "description": "test theme description"}' http://localhost:3001/api/themes
  ```

- **Get theme details**
  ```bash
  curl http://localhost:3001/api/themes/1
  ```

- **Add image to theme**
  ```bash
  curl -X POST -H "Content-Type: application/json" -d '{"imageId": 1}' http://localhost:3001/api/themes/1/images
  ```

## Database Queries

### Querying the Database with sqlite3

1. **Install sqlite3**
   ```bash
   sudo apt install sqlite3
   ```

2. **Connect to the database**
   ```bash
   sqlite3 /home/yuanjian/Development/aigc-assistant/backend/database.db
   ```

3. **Query commands**

   - **Query all prompts**
     ```sql
     SELECT * FROM Prompts;
     ```

   - **Query all images**
     ```sql
     SELECT * FROM Images;
     ```

   - **Query all themes**
     ```sql
     SELECT * FROM Themes;
     ```

   - **Query theme-image associations**
     ```sql
     SELECT * FROM ThemeImages;
     ```

   - **Query prompts with associated images**
     ```sql
     SELECT p.*, i.* FROM Prompts p LEFT JOIN Images i ON p.id = i.promptId;
     ```

   - **Query images with associated prompts**
     ```sql
     SELECT i.*, p.* FROM Images i LEFT JOIN Prompts p ON i.promptId = p.id;
     ```

4. **Exit sqlite3**
   ```bash
   .quit
   ```

## Development Workflow

1. **Start the backend server**
   ```bash
   cd /home/yuanjian/Development/aigc-assistant && npm run start:backend
   ```

2. **Start the frontend server**
   ```bash
   cd /home/yuanjian/Development/aigc-assistant/frontend && npm run dev
   ```

3. **Access the application**
   Frontend: http://localhost:5173/
   Backend API: http://localhost:3001/

## Project Structure

- **backend/**: Backend code
  - **routes/**: API routes
    - **auth.js**: Authentication routes (login, register, logout, token refresh)
  - **models/**: Database models
    - **User.js**: User model
  - **middleware/**: Middleware
    - **auth.js**: Authentication middleware (authenticate, optionalAuth)
  - **utils/**: Utility functions
    - **auth.js**: JWT token generation and verification
  - **uploads/**: Uploaded image files
  - **server.js**: Server entry file

- **frontend/**: Frontend code
  - **src/**: Source code
    - **contexts/AuthContext.jsx**: React Auth Context (shared authentication state)
    - **hooks/useAuth.js**: Authentication hook
  - **public/**: Static files
  - **vite.config.js**: Vite configuration file

- **database.db**: SQLite database file
