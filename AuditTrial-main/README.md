# 🛡️ AuditCore — Audit Trail & Activity Log Dashboard

A full-stack **microservices-based** platform for monitoring user activity, tracking audit trails, and detecting suspicious behavior across multiple websites. Built as a DBMS project demonstrating multi-database architecture with PostgreSQL and MongoDB.

---

## 📐 Architecture

```
┌─────────────────────┐
│   React Frontend    │  ← Vite + Recharts + React Router
│   (Port 5173)       │
└────────┬────────────┘
         │ HTTP
┌────────▼────────────┐
│  FastAPI Gateway     │  ← API Gateway, Rate Limiting, Request Logging
│  (Port 8000)         │
└────┬───────────┬────┘
     │           │
┌────▼─────┐ ┌──▼──────────┐
│ Spring   │ │  Node.js     │
│ Boot     │ │  Log Service │
│ (8081)   │ │  (3001)      │
└────┬─────┘ └──┬──────────┘
     │          │
┌────▼─────┐ ┌──▼──────────┐
│PostgreSQL│ │  MongoDB     │
│          │ │  Atlas       │
└──────────┘ └─────────────┘
```

| Layer | Technology | Responsibility |
|-------|-----------|---------------|
| Frontend | React 19 + Vite + Recharts | UI, Charts, Auth, CSV Export |
| API Gateway | FastAPI (Python) | Routing, CORS, Rate Limiting, Request Logging |
| User Service | Spring Boot (Java) | User CRUD, JWT Auth, BCrypt Hashing, Role Management |
| Log Service | Node.js (Express) | Audit/Activity Log CRUD, Aggregation, Analytics |
| SQL Database | PostgreSQL | User data, website metadata |
| NoSQL Database | MongoDB Atlas | Audit logs, activity logs, gateway request logs |

---

## ✨ Features

### User-Facing
- **User Registration** — Register with email, password, phone, and website selection (10 platforms)
- **User Login** — JWT-authenticated, personal dashboard with activity/audit history
- **User Profile** — Update name, change password

### Admin Dashboard (9 Tabs)
- **Overview** — Total users, websites, audit entries, failed attempts + charts
- **Audit Logs** — Search/filter with pagination, CSV export
- **Activity Logs** — Search by type, severity, date range
- **Users** — View, activate/deactivate, delete, change roles (USER ↔ ADMIN)
- **Websites** — Per-website breakdown with logos and stats
- **Analytics** — 30-day timeseries, top users, peak hours, failure rate by website
- **Alerts** — Suspicious activity detection (3+ failed logins in 60 min)
- **System Health** — Real-time health of all 4 services
- **Settings** — Profile update, password change, system info

### Security & Infrastructure
- 🔐 **JWT Authentication** with 24-hour token expiry
- 🔒 **BCrypt Password Hashing** with auto-migration of plaintext passwords
- 🚦 **Rate Limiting** — 200 requests/min per IP
- 📊 **Request Logging** — Every API call logged to MongoDB
- 🗑️ **TTL Indexes** — Auto-cleanup of logs older than 90 days
- 🌗 **Dark/Light Theme** with localStorage persistence
- 📱 **Responsive Design** with mobile hamburger menu

---

## 🚀 Getting Started

### Prerequisites

- **Java 17+** (for Spring Boot)
- **Node.js 18+** (for frontend + Node.js backend)
- **Python 3.9+** (for FastAPI gateway)
- **PostgreSQL** (running on port 5432)
- **MongoDB Atlas** account (or local MongoDB)

### 1. Clone the Repository

```bash
git clone <repo-url>
cd AuditTrial-main
```

### 2. Set Up PostgreSQL

Create a database:
```sql
CREATE DATABASE newauditdb;
```

### 3. Configure Environment Variables

Copy the example files and update with your credentials:

```bash
# Python Gateway
cp backend/python/.env.example backend/python/.env

# Node.js Log Service
cp backend/nodejs/.env.example backend/nodejs/.env

# Spring Boot
cp backend/springboot/auditSpringBoot/src/main/resources/application.properties.example \
   backend/springboot/auditSpringBoot/src/main/resources/application.properties
```

### 4. Start the Spring Boot User Service (Port 8081)

```bash
cd backend/springboot/auditSpringBoot
./mvnw spring-boot:run
```

### 5. Start the Node.js Log Service (Port 3001)

```bash
cd backend/nodejs
npm install
node server.js
```

### 6. Start the FastAPI Gateway (Port 8000)

```bash
cd backend/python
pip install -r requirements.txt  # or use venv
uvicorn main:app --reload --port 8000
```

### 7. Start the React Frontend (Port 5173)

```bash
cd frontend/frontend
npm install
npm run dev
```

### 8. (Optional) Seed Sample Data

```bash
cd backend/nodejs
node seedLogs.js
```

---

## 🔗 API Documentation

Once the FastAPI gateway is running, visit:
- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

### Key API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/registerUser` | Register new user |
| POST | `/signInUser` | User login |
| POST | `/adminSignIn` | Admin login |
| GET | `/api/dashboard/stats` | Dashboard overview stats |
| GET | `/api/audit/logs/search` | Search audit logs (filters + pagination) |
| GET | `/api/activity/logs/search` | Search activity logs |
| GET | `/api/admin/users` | List all users (admin) |
| PUT | `/api/admin/users/{id}/role` | Change user role |
| GET | `/api/audit/logs/suspicious` | Detect suspicious activity |
| GET | `/api/health/all` | Health check all services |

---

## 🛠️ Tech Stack

| Category | Technologies |
|----------|-------------|
| Frontend | React 19, Vite, React Router 7, Recharts, Axios |
| API Gateway | FastAPI, httpx, Motor (async MongoDB), Pydantic |
| User Service | Spring Boot 3, JPA/Hibernate, BCrypt, JJWT, Lombok |
| Log Service | Express.js, Mongoose, MongoDB Atlas |
| Databases | PostgreSQL (users), MongoDB Atlas (logs) |
| Auth | JWT (HS256), BCrypt password hashing |

---

## 📁 Project Structure

```
AuditTrial-main/
├── README.md
├── frontend/
│   └── frontend/           # React + Vite app
│       ├── src/
│       │   ├── App.jsx          # Routes & protected route guards
│       │   ├── Dashboard.jsx    # Admin dashboard (1000+ lines, 9 tabs)
│       │   ├── UserDashboard.jsx# User personal dashboard
│       │   ├── Login.jsx        # Admin login
│       │   ├── UserLogin.jsx    # User login
│       │   ├── Register.jsx     # Registration form
│       │   ├── LandingPage.jsx  # Landing page with CTAs
│       │   ├── api.js           # Axios config, interceptors, CSV export
│       │   ├── ThemeContext.jsx  # Dark/Light theme provider
│       │   └── ToastContext.jsx  # Toast notification system
│       ├── index.html
│       └── package.json
│
└── backend/
    ├── python/              # FastAPI API Gateway
    │   ├── main.py              # App, middleware, rate limiting
    │   ├── routes.py            # All proxy routes
    │   ├── schemas.py           # Pydantic models
    │   ├── database.py          # MongoDB Atlas connection
    │   └── .env
    │
    ├── nodejs/              # Express.js Log Service
    │   ├── server.js            # Express app + MongoDB connection
    │   ├── models/              # Mongoose schemas (AuditLog, ActivityLog)
    │   ├── routes/              # REST API routes with aggregation pipelines
    │   ├── seedLogs.js          # Sample data seeder
    │   └── clearLogs.js         # Log cleanup script
    │
    └── springboot/          # Spring Boot User Service
        └── auditSpringBoot/
            └── src/main/java/auditSpringBoot/
                ├── controller/      # REST controllers
                ├── service/         # Business logic
                ├── models/          # JPA entities
                ├── repository/      # Spring Data repositories
                ├── utils/           # JWT utilities & interceptor
                └── config/          # CORS & interceptor config
```

---

## 👥 Default Admin Setup

To create an admin user, first register a normal user, then manually update the role in PostgreSQL:

```sql
UPDATE user_table SET role = 'ADMIN' WHERE email = 'your-email@example.com';
```

---

## 📄 License

This project was built as a DBMS course project.
