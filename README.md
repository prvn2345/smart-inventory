# 🚀 Smart Inventory Management System

A full-stack MERN application for managing inventory with real-time alerts, AI demand predictions, and analytics.

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite, Tailwind CSS v4, Recharts, Socket.io-client |
| Backend | Node.js + Express 5, Socket.io, node-cron, Nodemailer |
| Database | MongoDB + Mongoose |
| Auth | JWT (Admin + Staff roles) |
| AI/ML | Linear Regression, Moving Average, Exponential Smoothing (simple-statistics) |

## 📁 Project Structure

```
├── backend/
│   ├── models/          # Mongoose schemas (User, Product, Order, etc.)
│   ├── routes/          # REST API routes
│   ├── middleware/       # JWT auth middleware
│   ├── utils/           # Socket.io, cron jobs, mailer, prediction engine, seed
│   ├── uploads/         # Uploaded files
│   └── server.js        # Express + Socket.io server
│
└── frontend/
    └── src/
        ├── components/  # Reusable UI + feature components
        ├── context/     # Auth + Theme context
        ├── hooks/       # useSocket hook
        ├── pages/       # All page components
        └── services/    # Axios API service layer
```

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### 2. Backend Setup

```bash
cd backend
# Copy and configure environment
cp .env.example .env
# Edit .env with your MongoDB URI and email settings

# Install dependencies (already done)
npm install

# Seed sample data
npm run seed

# Start development server
npm run dev
```

### 3. Frontend Setup

```bash
cd frontend
# Install dependencies (already done)
npm install

# Start development server
npm run dev
```

### 4. Access the App

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000/api

### 5. Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@inventory.com | admin123 |
| Staff | staff@inventory.com | staff123 |

## ✨ Features

### Core
- ✅ Product CRUD with categories, suppliers, locations
- ✅ Real-time stock tracking via Socket.io
- ✅ Low-stock threshold alerts (cron job every 5 min)
- ✅ Email alerts via Nodemailer
- ✅ JWT authentication with Admin/Staff roles

### Analytics
- ✅ Dashboard with KPI cards
- ✅ Daily/weekly/monthly sales charts (Recharts)
- ✅ Inventory distribution by category
- ✅ Inventory movement trends
- ✅ Top selling products

### AI Predictions
- ✅ Linear Regression demand forecasting
- ✅ Moving Average prediction
- ✅ Exponential Smoothing prediction
- ✅ Confidence scores + recommended reorder quantities

### Extra Features
- ✅ CSV/Excel bulk product upload
- ✅ Export inventory as PDF or Excel
- ✅ Export sales report as PDF
- ✅ Dark/Light mode
- ✅ Product update history
- ✅ Activity logs per product
- ✅ Pagination, search, filtering
- ✅ Responsive mobile-friendly UI

## 🌐 Deployment

### Backend → Render
1. Push to GitHub
2. Create new Web Service on Render
3. Set environment variables from `.env.example`
4. Build command: `npm install`
5. Start command: `npm start`

### Frontend → Vercel
1. Push to GitHub
2. Import project on Vercel
3. Set `VITE_API_URL` if needed
4. Deploy

### Database → MongoDB Atlas
1. Create free cluster at mongodb.com/atlas
2. Get connection string
3. Set `MONGO_URI` in backend environment variables

## 📧 Email Configuration (Gmail)

1. Enable 2FA on your Google account
2. Generate an App Password: Google Account → Security → App Passwords
3. Set `EMAIL_USER` and `EMAIL_PASS` in `.env`
