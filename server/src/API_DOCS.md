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
  ```json
  {
    "message": "User registered successfully",
    "userId": "uuid-string"
  }
  ```

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

## 3. Stock Management

Base Route: `/api/stock`
**Note:** All routes here require a valid JWT token sent in the `Authorization` header as a Bearer token.
`Authorization: Bearer <your_token>`

### `POST /upload`
Uploads a new stock entry. Creates a record in both the `Stock` and `StockMaster` tables.
- **Auth Required:** Yes
- **Allowed Roles:** `staff`, `owner`, `admin`
- **Request Body:**
  ```json
  {
    "INV": "INV001",
    "INV_NO": "12345",
    "GRADE": "A",
    "TOTAL_BAGS": 100,
    "BAG_WT": 50.5,
    "NET_WT": 5050.0,
    "DOP": "2026-05-27T10:00:00Z",
    "BROKER": "Broker Name",
    "BUYER": "Buyer Name",
    "SOLD_DATE": "2026-06-01T10:00:00Z",
    "SOLD_RATE": 150.0,
    "BILL_NO": "B-999",
    "BILTY_NO": "BLT-111",
    "PURCHASE_SAMPLE": "Sample A",
    "PURCHASE_SAMPLE_DATE": "2026-05-25T10:00:00Z"
  }
  ```
- **Response:** `201 Created`

### `DELETE /:id`
Deletes a specific stock entry from the `Stock` table only.
- **Auth Required:** Yes
- **Allowed Roles:** `owner`, `admin`
- **Response:** `200 OK`
  ```json
  {
    "message": "Stock entry deleted successfully"
  }
  ```

### `POST /:id/request-update-otp`
Requests a 6-digit OTP to authorize updating a stock entry. Generates the OTP and alerts the owner.
- **Auth Required:** Yes
- **Allowed Roles:** `staff`, `owner`
- **Response:** `200 OK`
  ```json
  {
    "message": "OTP sent to owner successfully"
  }
  ```

### `PUT /:id`
Updates an existing stock entry. Requires a valid, unexpired OTP that was generated for this specific stock item.
- **Auth Required:** Yes
- **Allowed Roles:** `staff`, `owner`
- **Request Body:** Same fields as `/upload`, but includes the mandatory `otp` field.
  ```json
  {
    "otp": "123456",
    "INV": "INV001-Updated",
    "GRADE": "B"
    // ... other fields
  }
  ```
- **Response:** `200 OK`
  ```json
  {
    "message": "Stock entry updated successfully",
    "stock": { ...updatedStockObject }
  }
  ```
