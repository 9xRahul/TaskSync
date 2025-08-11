
# 📌 API Documentation – Todo App Backend

**Base URL**
```
https://tasksync-lt7f.onrender.com/api
```

---

## **Authentication Routes** (`/auth`)

### 1. **Register User**
`POST /auth/register`  
Registers a new user with name, email, and password.  
Creates an OTP for email verification.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registered successfully. Verify your email using OTP."
}
```

---

### 2. **Verify Email (OTP)**
`POST /auth/verify-email`  
Verifies the user's email with the OTP sent.

**Request Body:**
```json
{
  "email": "john@example.com",
  "otp": "123456"
}
```

---

### 3. **Login**
`POST /auth/login`  

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Response:**
```json
{
  "success": true,
  "accessToken": "<JWT_ACCESS_TOKEN>",
  "refreshToken": "<JWT_REFRESH_TOKEN>"
}
```

---

### 4. **Refresh Token**
`POST /auth/refresh`  

**Request Body:**
```json
{
  "refreshToken": "<JWT_REFRESH_TOKEN>"
}
```

---

### 5. **Forgot Password**
`POST /auth/forgot-password`  
Returns a password reset token.

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "resetToken": "abc123def456..."
}
```

---

### 6. **Reset Password**
`POST /auth/reset-password`  

**Headers:**
```
Authorization: Bearer <RESET_TOKEN>
```

**Request Body:**
```json
{
  "password": "NewSecurePass456"
}
```

---

## **Task Routes** (`/tasks`)

All task routes require authentication.  
**Headers:**
```
Authorization: Bearer <ACCESS_TOKEN>
```

---

### 1. **Add Task**
`POST /tasks/addtask`  

**Request Body:**
```json
{
  "title": "Finish Backend",
  "description": "Complete the API implementation",
  "status": "pending",
  "dueDate": "2025-08-15T18:30:00.000Z"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "64a96ea770f97fc6a8efeb1d",
    "title": "Finish Backend",
    "description": "Complete the API implementation",
    "status": "pending",
    "dueDate": "2025-08-15T18:30:00.000Z",
    "owner": "64a96ea770f97fc6a8efea12"
  }
}
```

---

### 2. **Get All Tasks**
`GET /tasks/gettasks`

---

### 3. **Get Single Task**
`GET /tasks/gettask/:id`

---

### 4. **Update Task**
`PUT /tasks/update/:id`  

**Request Body:**
```json
{
  "title": "Finish Backend API",
  "status": "completed"
}
```

---

### 5. **Delete Task**
`DELETE /tasks/delete/:id`

---

## **Error Response Format**
```json
{
  "success": false,
  "error": "Error message here"
}
```

---

## **Tech Stack**
- Node.js (Express)
- MongoDB (Mongoose)
- JWT (Access & Refresh Tokens)
- argon2 (Password Hashing)
- express-validator (Request Validation)
- Rate Limiting & Brute Force Protection
- OTP-based Email Verification
- Secure Password Reset
