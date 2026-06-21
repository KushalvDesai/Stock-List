# Inventory App API Documentation

This document outlines the available REST API endpoints in the Inventory App backend.

## Base URL
All endpoints are relative to `http://localhost:3000` (or whatever the `PORT` environment variable is set to).

---

## 1. Health Check

### `GET /api/health`
Checks if the server is running.
- **Auth Required:** No
- **Response:** `200 OK`
  ```json
  { "status": "ok" }
  ```

---

## 2. Authentication

Base Route: `/api/auth`

### `POST /register`
Registers a new user in the system.
- **Auth Required:** No
- **Request Body:**
  ```json
  {
    "username": "john_doe",
    "password": "securepassword123",
    "role": "staff" // optional, defaults to 'staff'. Can be 'staff', 'owner', or 'admin'.
  }
  ```
- **Response:** `201 Created`

### `POST /login`
Authenticates a user and returns a JSON Web Token (JWT).
- **Auth Required:** No
- **Request Body:**
  ```json
  {
    "username": "john_doe",
    "password": "securepassword123"
  }
  ```
- **Response:** `200 OK`
  ```json
  {
    "message": "Login successful",
    "token": "eyJhbGciOi...",
    "user": {
      "id": "uuid-string",
      "username": "john_doe",
      "role": "staff"
    }
  }
  ```

---

## 3. Company Management

Base Route: `/api/company`
**Note:** All routes here require a valid JWT token sent in the `Authorization` header as a Bearer token.

### `GET /my-factory`
Get the current staff member's assigned factories and their marks.
- **Auth Required:** Yes (`staff`)
- **Response:** `200 OK` Array of factories.

### `GET /`
Get companies (isolated to owner).
- **Auth Required:** Yes (`owner`, `admin`)
- **Response:** `200 OK` Array of companies with their factories and marks.

### `POST /`
Create a new company.
- **Auth Required:** Yes (`owner`, `admin`)
- **Response:** `201 Created`

### `POST /factory`
Create a new factory within a company.
- **Auth Required:** Yes (`owner`, `admin`)
- **Response:** `201 Created`

### `POST /mark`
Create a new mark within a factory.
- **Auth Required:** Yes (`owner`, `admin`)
- **Response:** `201 Created`

### `GET /staff`
Get staff list (isolated to owner's company).
- **Auth Required:** Yes (`owner`, `admin`)
- **Response:** `200 OK` Array of staff users.

### `POST /staff`
Owner creates new staff members.
- **Auth Required:** Yes (`owner`, `admin`)
- **Response:** `201 Created`

### `PUT /staff/:id/factories`
Update a staff member's factory assignment.
- **Auth Required:** Yes (`owner`, `admin`)
- **Request Body:** `{ "factoryIds": ["uuid-1", "uuid-2"] }`
- **Response:** `200 OK`

### `PUT /staff/:id/password`
Update a staff member's password.
- **Auth Required:** Yes (`owner`, `admin`)
- **Response:** `200 OK`

### `DELETE /staff/:id`
Delete a staff member.
- **Auth Required:** Yes (`owner`, `admin`)
- **Response:** `200 OK`

---

## 4. Stock Management

Base Route: `/api/stock`
**Note:** All routes here require a valid JWT token sent in the `Authorization` header as a Bearer token.

### `GET /check-duplicate`
Endpoint to check for duplicate stock entry before submission.
- **Auth Required:** Yes (`staff`, `owner`, `admin`)
- **Query Params:** `inv`, `invNo`, `grade`, `markId`
- **Response:** `200 OK` `{ "exists": true|false, "stock": { ... } }`

### `GET /`
Fetch all active stock data.
- **Auth Required:** Yes (`staff`, `owner`, `admin`)
- **Response:** `200 OK` Array of stock items.

### `POST /upload`
Uploads a new stock entry. Creates a record in both the `Stock` and `StockMaster` tables.
- **Auth Required:** Yes (`staff`, `owner`, `admin`)
- **Response:** `201 Created`

### `POST /:id/edit-request`
Staff request an edit to a stock entry.
- **Auth Required:** Yes (`staff`, `owner`, `admin`)
- **Request Body:** Contains the updated fields.
- **Response:** `201 Created`

### `GET /edit-requests/pending`
Fetch pending edit requests.
- **Auth Required:** Yes (`owner`, `admin`)
- **Response:** `200 OK` Array of edit requests.

### `POST /edit-requests/:id/approve`
Approve an edit request.
- **Auth Required:** Yes (`owner`, `admin`)
- **Response:** `200 OK`

### `POST /edit-requests/:id/reject`
Reject an edit request.
- **Auth Required:** Yes (`owner`, `admin`)
- **Response:** `200 OK`

### `PUT /:id`
Update stock entry. Requires a valid OTP for staff, bypassed for owner/admin.
- **Auth Required:** Yes (`staff`, `owner`)
- **Response:** `200 OK`

### `DELETE /:id`
Soft delete a specific stock entry (move to recycle bin).
- **Auth Required:** Yes (`owner`, `admin`)
- **Response:** `200 OK`

### `POST /delete-batch`
Soft delete multiple stock entries at once.
- **Auth Required:** Yes (`owner`, `admin`)
- **Request Body:** `{ "ids": ["uuid-1", "uuid-2"] }`
- **Response:** `200 OK`

### `GET /recycle-bin`
Get soft-deleted stock entries.
- **Auth Required:** Yes (`owner`, `admin`)
- **Response:** `200 OK` Array of deleted stock.

### `POST /recover-batch`
Recover multiple deleted stock entries.
- **Auth Required:** Yes (`owner`, `admin`)
- **Request Body:** `{ "ids": ["uuid-1"] }`
- **Response:** `200 OK`

### `POST /:id/request-update-otp`
Requests a 6-digit OTP to authorize updating a stock entry.
- **Auth Required:** Yes (`staff`, `owner`)
- **Response:** `200 OK`

---

## 5. Notifications

Base Route: `/api/notifications`

### `GET /`
Get notifications for the logged-in user's role.
- **Auth Required:** Yes
- **Response:** `200 OK` Array of notifications.

### `PUT /read-all`
Mark all notifications as read.
- **Auth Required:** Yes
- **Response:** `200 OK`

### `PUT /:id/status`
Update a specific notification's read status.
- **Auth Required:** Yes
- **Request Body:** `{ "isRead": true|false }`
- **Response:** `200 OK`

### `DELETE /clear-all`
Clear (delete) all notifications for the user's role.
- **Auth Required:** Yes
- **Response:** `200 OK`

### `DELETE /:id`
Delete a specific notification.
- **Auth Required:** Yes
- **Response:** `200 OK`
