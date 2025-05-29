# TrustMed Backend API

## Overview

TrustMed Backend is the server-side component of the TrustMed Secure Connect 2025 healthcare management system. It provides a secure, robust API for managing healthcare data, user authentication, and communication between healthcare providers, administrators, and insurance companies.

## Features

### Authentication & Authorization
- Secure JWT-based authentication system
- Role-based access control (Admin, Doctor, Insurance)
- Password encryption with bcrypt
- First-time login password change requirement

### Data Security
- AES-256-CBC encryption for sensitive patient data
- Comprehensive audit logging system
- Secure data transmission with HTTPS

### API Endpoints
- **Auth**: User authentication and management
- **Admin**: Administrative functions and system management
- **Doctor**: Patient management and medical record access
- **Insurance**: Insurance claims processing and verification
- **Records**: Medical record creation and management

### Database
- Relational database schema optimized for healthcare data
- Secure storage of patient information
- Efficient data retrieval and management

## Technology Stack

### Backend Framework
- Node.js with Express.js

### Database
- MySQL (v8.0+)

### Security
- JWT for authentication
- bcrypt for password hashing
- AES-256-CBC encryption for sensitive data

### Email
- Nodemailer for email notifications

### Logging
- Winston for application logging
- Custom audit logging for compliance

## Getting Started

### Prerequisites
- Node.js (v14 or later)
- MySQL (v8.0 or later)

### Installation

1. Clone the repository
```bash
git clone https://github.com/ChamathWickramasighe/TrustMed_WebApi.git
cd TrustMed_WebApi
```

2. Install dependencies
```bash
npm install
```

3. Configure environment variables
   - Copy `.env.sample` to `.env`
   - Update the values in `.env` with your configuration

4. Set up the database
```bash
# Import database schema
mysql -u root -p trustmed_db < scripts/dbshema.sql

# Run setup script to create initial admin user
cd scripts
node seed-database.js
```

Or you can copy, paste sql script from 'scripts/dbshema.sql' into your MySQl workbench and run seed-database.js(scripts/seed-database.js) script to iniyialize admin user

5. Start the server
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

6. Verify the server is running by accessing the health check endpoint
```
GET http://localhost:5000/health
```

## API Documentation

### Authentication

```
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password",
  "role": "admin|doctor|insurance"
}
```

### Admin Routes

All admin routes require authentication and admin role.

```
GET /api/admin/staff - Get all staff members
POST /api/admin/staff - Create new staff member
GET /api/admin/patients - Get all patients
POST /api/admin/patients - Register new patient
```

### Doctor Routes

All doctor routes require authentication and doctor role.

```
GET /api/doctor/patients - Get doctor's patients
GET /api/doctor/patients/:patientId/records - Get patient records
POST /api/doctor/records/prescription - Create prescription
POST /api/doctor/records/labtest - Order lab test
```

### Insurance Routes

All insurance routes require authentication and insurance role.

```
GET /api/insurance/patients - Get insured patients
GET /api/insurance/claims - Get insurance claims
PUT /api/insurance/claims/:claimId - Update claim status
```

## Security Features

### Data Encryption

Sensitive patient data is encrypted using AES-256-CBC encryption. The encryption middleware automatically handles encryption and decryption of designated sensitive fields.

### Audit Logging

The system maintains comprehensive audit logs for all data access and modifications, recording:
- User ID of the person performing the action
- Action type (create, read, update, delete)
- Resource type and ID affected
- Timestamp
- Additional details about the action

### Authentication Security

- JWT tokens with configurable expiration
- Password hashing with bcrypt
- Role-based access control
- First login password change requirement

## Project Structure

```
/src
  /config       - Database and application configuration
  /controllers  - Request handlers for each route
  /middleware   - Express middleware (auth, encryption, etc.)
  /models       - Database models and data access
  /routes       - API route definitions
  /services     - Business logic services
  /utils        - Utility functions
  app.js        - Express application setup
  server.js     - Server entry point
/scripts        - Database scripts and utilities
```

## Contact

For support or inquiries, please contact the development team (wickrachamath@gmail.com).