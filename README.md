# Secure Password Management System

A modern, secure password management system with group permissions and activity monitoring capabilities.

## Features

- **User Authentication**: Secure login and registration system
- **Group Management**: Create and manage groups (PSC, PTK, etc.) for organizing credentials
- **Permission System**: Fine-grained access control for users and groups
- **Credential Management**: Store and manage website credentials securely
- **Activity Monitoring**: Track all user activities with detailed logs
- **Admin Panel**: Administrative interface for user management and system monitoring
- **Modern UI**: Clean, responsive interface built with Material UI
- **Security**: Password encryption, JWT authentication, and other security measures

## Tech Stack

- **Frontend**: React, Material UI, React Router, Axios
- **Backend**: Node.js, Express.js
- **Database**: MongoDB
- **Authentication**: JWT (JSON Web Tokens)
- **Encryption**: AES-256 for sensitive data

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- npm or yarn

## Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd password-manager
   ```

2. Install dependencies:
   ```
   npm run install-all
   ```
   This will install dependencies for the root project, client, and server.

3. Configure environment variables:
   - Navigate to `/server/config/`
   - Rename `.env.example` to `.env` (or create a new `.env` file)
   - Update the following variables:
     ```
     NODE_ENV=development
     PORT=5000
     MONGODB_URI=mongodb://localhost:27017/password-manager
     JWT_SECRET=your_jwt_secret_key_change_this_in_production
     JWT_EXPIRES_IN=90d
     ENCRYPTION_KEY=your_encryption_key_for_passwords_32chars
     ```
     Make sure to use strong, unique values for JWT_SECRET and ENCRYPTION_KEY in production.

## Running the Application

1. Start the development server:
   ```
   npm start
   ```
   This will start both the backend server and the React frontend in development mode.

2. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000/api

## Usage

### User Registration and Login
- Register a new account with your name, email, and password
- Login with your credentials

### Dashboard
- View and manage your groups and credentials
- Create new groups or credentials
- Search and filter your stored credentials

### Group Management
- Create groups to organize your credentials (e.g., PSC, PTK)
- Add members to groups with different permission levels:
  - **Viewer**: Can only view credentials
  - **Editor**: Can add and edit credentials
  - **Admin**: Can manage members and credentials

### Credential Management
- Store website credentials including:
  - Website name
  - URL
  - Email
  - User ID
  - Password
  - Token
  - Description
- Share credentials with specific users
- Set permissions for shared credentials

### Activity Logs
- View detailed logs of all your activities
- Admins can view system-wide activity logs

### Admin Panel
- Manage users (create, edit, delete)
- View system statistics
- Monitor system activities

## Security Features

- Passwords are encrypted using AES-256 encryption
- JWT authentication with token expiration
- Rate limiting to prevent brute force attacks
- HTTPS recommended for production deployment
- Activity logging for security auditing

## Production Deployment

For production deployment:

1. Build the React frontend:
   ```
   cd client
   npm run build
   ```

2. Set environment variables for production:
   ```
   NODE_ENV=production
   PORT=5000
   MONGODB_URI=your_production_mongodb_uri
   JWT_SECRET=your_strong_jwt_secret
   JWT_EXPIRES_IN=90d
   ENCRYPTION_KEY=your_strong_encryption_key
   ```

3. Start the server:
   ```
   cd server
   npm start
   ```

## License

MIT

## Support

For support, please contact the system administrator.
