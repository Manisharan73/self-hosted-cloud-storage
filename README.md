# Self-Hosted Cloud Storage

A full-stack, self-hosted cloud storage platform that gives you complete ownership of your data. Built with a React frontend and an Express.js backend, it provides a Google Drive-like experience on your own infrastructure.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Running the Application](#running-the-application)
- [API Reference](#api-reference)

---

## Overview

Self-Hosted Cloud Storage is a web application designed to replace third-party cloud storage providers. It allows users to register, upload, organize, share, and manage files and folders through a clean, modern interface -- all while keeping data stored entirely on hardware you control.

The system consists of two parts:

- **Frontend** -- A React SPA that provides the user interface.
- **Backend** -- An Express.js API server handling authentication, authorization, file storage, database operations, and all business logic.

---

## Features

### Authentication and Security
- User registration with email verification via Nodemailer
- Secure login with bcrypt password hashing
- JWT-based session management using HTTP-only cookies
- Protected routes with middleware-based token verification

### File Management
- Upload files (up to 100 MB per file) to any directory
- Download, rename, copy, and move files
- Duplicate name detection to prevent conflicts within the same folder
- Batch delete support for multiple files at once
- File metadata tracking (original name, system name, size, MIME type)

### Folder Management
- Create nested folder hierarchies with unlimited depth
- Rename, move, and copy entire folder trees (including all nested files)
- Breadcrumb-based navigation for intuitive directory traversal
- Automatic root folder creation on user verification

### Trash System
- Soft-delete files and folders to a recoverable trash bin
- Automatic permanent deletion of trashed items after 15 days via a cron job (runs every 15 minutes)
- Restore items to their original location; if the parent folder was deleted, items are restored to root
- Intelligent rename handling on restore to avoid name collisions (appends "Restored N")
- Recursive trash and restore for folders, cascading the operation to all children

### File Sharing
- Share individual files or entire folders with other registered users
- Read and write permission levels
- Share invitation workflow: recipients must accept (save) an invitation before the item appears in their library
- Revoke access at any time; if the recipient has already saved the item, access is marked as revoked without deleting the record
- Decline incoming share invitations
- Download shared files directly from the server
- Navigate into shared folders and browse nested contents with proper access checks

### Notifications
- Real-time polling (every 15 seconds) for pending share invitations
- Separate views for received invitations and sent (outgoing) shares
- Accept or decline actions directly from the notification panel

### User Interface
- Dark mode and light mode with theme persistence via localStorage
- Sidebar navigation (Home, Shared, Trash, Notifications)
- File table with sortable columns and right-click context menu
- Details panel for viewing file/folder metadata
- Modal popups for copy, move, and rename operations
- Breadcrumb trail for current directory path
- Notification badge showing pending invitation count

### Logging and Monitoring
- Request logging middleware that appends timestamped entries (path and method) to a log file

---

## Architecture

```
                    +------------------+
                    |     Frontend     |
                    |  React + Vite    |
                    |  (Port 5173)     |
                    +--------+---------+
                             |
                       HTTP / REST
                             |
                    +--------+---------+
                    |     Backend      |
                    |   Express.js     |
                    |  (Port 3001)     |
                    +----+--------+----+
                         |        |
               +---------+        +---------+
               |                            |
      +--------+--------+         +--------+--------+
      |    MariaDB       |         |    uploads/     |
      |  (Sequelize ORM) |         |   (on disk)     |
      |  (Port 3306)     |         |                 |
      +------------------+         +-----------------+
```

- The **Frontend** communicates with the **Backend** over REST APIs using Axios with credentials (cookies).
- The **Backend** manages all business logic, user authentication, file storage, and database operations through Sequelize ORM connected to MariaDB.
- Uploaded files are stored on the server's local disk in per-user directories, identified by a unique name assigned during registration.

---

## Tech Stack

### Frontend
| Technology       | Purpose                          |
|------------------|----------------------------------|
| React 19         | UI component library             |
| Vite 7           | Build tool and dev server        |
| React Router 7   | Client-side routing              |
| Axios            | HTTP client                      |
| React Icons      | Icon library                     |
| js-cookie        | Cookie management                |

### Backend
| Technology       | Purpose                          |
|------------------|----------------------------------|
| Express 5        | Web framework                    |
| Sequelize 6      | ORM for MariaDB                  |
| MariaDB          | Relational database              |
| JSON Web Tokens  | Authentication tokens            |
| bcrypt           | Password hashing                 |
| Multer           | File upload handling             |
| Nodemailer       | Email verification               |
| node-cron        | Scheduled trash cleanup          |
| uuid             | Unique identifier generation     |



---

## Project Structure

```
selfHostCloudStorage/
|
|-- backend/
|   |-- controllers/
|   |   |-- auth.js          # Login, signup, email verification
|   |   |-- file.js          # File CRUD, upload, download, trash, restore
|   |   |-- folder.js        # Folder CRUD, recursive copy/delete, trash, restore
|   |   |-- user.js          # Sharing, notifications, trash listing, shared browsing
|   |-- middlewares/
|   |   |-- auth.js          # JWT verification middleware
|   |   |-- log.js           # Request logging middleware
|   |   |-- multer.js        # File upload configuration (100 MB limit)
|   |-- models/
|   |   |-- user.js           # User schema (name, email, username, passhash, uniqueName)
|   |   |-- file.js           # File metadata schema
|   |   |-- folder.js         # Folder schema with self-referencing parent
|   |   |-- sharedItem.js     # Sharing records (permissions, status, expiry)
|   |   |-- userVerification.js  # Email verification tokens
|   |-- routes/
|   |   |-- auth.js           # POST /auth/signup, /auth/login, GET /auth/verify
|   |   |-- file.js           # File endpoints (upload, list, download, delete, move, copy, rename, trash, restore)
|   |   |-- folder.js         # Folder endpoints (create, delete, move, copy, rename, trash, restore)
|   |   |-- user.js           # Sharing and notification endpoints
|   |-- cron.js               # Scheduled job: permanently deletes trashed items older than 15 days
|   |-- index.js              # Express app entry point
|   |-- sequelize.js          # Database connection configuration
|   |-- package.json
|
|-- frontend/
|   |-- src/
|   |   |-- pages/
|   |   |   |-- Home.jsx          # Main file browser
|   |   |   |-- Login_SignUp.jsx   # Authentication page
|   |   |   |-- Notifications.jsx  # Share invitation management
|   |   |   |-- Shared.jsx         # Shared-with-me file browser
|   |   |   |-- Trash.jsx          # Trash bin browser
|   |   |-- components/
|   |   |   |-- Sidebar.jsx        # Navigation sidebar
|   |   |   |-- FileTable.jsx      # File/folder listing table
|   |   |   |-- FileContextMenu.jsx # Right-click context menu
|   |   |   |-- Breadcrumbs.jsx    # Directory path breadcrumbs
|   |   |   |-- DetailsPanel.jsx   # File/folder details sidebar
|   |   |   |-- PopUpCMR.jsx       # Modal for copy, move, rename operations
|   |   |-- context/
|   |   |   |-- ThemeContext.jsx       # Dark/light mode state
|   |   |   |-- NotificationContext.jsx # Notification polling and state
|   |   |-- styles/                # CSS modules for each component
|   |   |-- App.jsx                # Root component with routing
|   |-- vite.config.js
|   |-- package.json
|

|-- .gitignore
```

---

## Prerequisites

- **Node.js** (v18 or later recommended)
- **npm** (v9 or later)
- **MariaDB** (v10.6 or later) with a database and user created
- **SMTP credentials** (Gmail App Password or equivalent) for email verification

---

## Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/Manisharan73/self-hosted-cloud-storage.git
   cd self-hosted-cloud-storage
   ```

2. **Install backend dependencies**

   ```bash
   cd backend
   npm install
   ```

3. **Install frontend dependencies**

   ```bash
   cd ../frontend
   npm install
   ```


---


## Running the Application

Start both services in separate terminal sessions:

### 1. Backend

```bash
cd backend
npm run dev
```

Runs on port **3001** with Nodemon for hot reloading.

### 2. Frontend

```bash
cd frontend
npm run dev
```

Runs on port **5173** with Vite dev server.

Open your browser and navigate to `http://localhost:5173`.

---

## API Reference

### Authentication

| Method | Endpoint                              | Description                     |
|--------|---------------------------------------|---------------------------------|
| POST   | `/auth/signup`                        | Register a new user             |
| POST   | `/auth/login`                         | Login and receive JWT cookie    |
| GET    | `/auth/verify/:userId/:uniqueString`  | Verify email address            |

### Files (requires authentication)

| Method | Endpoint               | Description                          |
|--------|------------------------|--------------------------------------|
| GET    | `/file/list`           | List files and folders in a directory|
| POST   | `/file/upload/:id`     | Upload a file to a folder            |
| GET    | `/file/download/:id`   | Download a file                      |
| DELETE | `/file/delete/:id`     | Permanently delete a file            |
| POST   | `/file/delete-multiple` | Batch delete multiple files         |
| POST   | `/file/copy`           | Copy a file                          |
| POST   | `/file/move`           | Move a file to another folder        |
| POST   | `/file/rename`         | Rename a file                        |
| POST   | `/file/trash/:id`      | Move a file to trash                 |
| POST   | `/file/restore/:id`    | Restore a file from trash            |

### Folders (requires authentication)

| Method | Endpoint               | Description                          |
|--------|------------------------|--------------------------------------|
| POST   | `/folder/create`       | Create a new folder                  |
| DELETE | `/folder/delete/:id`   | Permanently delete a folder and contents |
| POST   | `/folder/move`         | Move a folder                        |
| POST   | `/folder/copy`         | Copy a folder and its contents       |
| POST   | `/folder/rename`       | Rename a folder                      |
| POST   | `/folder/trash/:id`    | Move a folder to trash               |
| POST   | `/folder/restore/:id`  | Restore a folder from trash          |

### Sharing and Notifications (requires authentication)

| Method | Endpoint                           | Description                          |
|--------|------------------------------------|--------------------------------------|
| POST   | `/user/share`                      | Share a file or folder with a user   |
| GET    | `/user/shared-with-me`             | List saved shared items              |
| GET    | `/user/notifications`              | List pending share invitations       |
| POST   | `/user/share/save/:shareId`        | Accept a share invitation            |
| POST   | `/user/share/decline/:shareId`     | Decline a share invitation           |
| POST   | `/user/share/revoke/:shareId`      | Revoke a shared item                 |
| GET    | `/user/listTrash`                  | List trashed items                   |
| GET    | `/user/share/download/:fileId`     | Download a shared file               |
| GET    | `/user/listShared`                 | Browse shared folders                |



