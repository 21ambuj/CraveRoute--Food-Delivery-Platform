# 🍕 CraveRoute — The Ultimate Food Delivery Ecosystem

[![React](https://img.shields.io/badge/Frontend-React-61DAFB?style=for-the-badge&logo=react)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Backend-Node.js-339933?style=for-the-badge&logo=nodedotjs)](https://nodejs.org/)
[![MySQL](https://img.shields.io/badge/Database-MySQL-4479A1?style=for-the-badge&logo=mysql)](https://www.mysql.com/)
[![Socket.io](https://img.shields.io/badge/Real--time-Socket.io-010101?style=for-the-badge&logo=socketdotio)](https://socket.io/)

**CraveRoute** is a professional, full-stack food delivery platform designed for speed, security, and seamless logistics. It features a triple-threat interface for **Customers**, **Vendors**, and **Delivery Partners**, all managed by a powerful **Super Admin Dashboard**.

---

## 🚀 Key Features

### 🛒 For Customers
*   **Cinematic UI**: Modern, glassmorphic design with smooth transitions.
*   **Razorpay Integration**: Fully functional payment gateway with a "Demo Mode" for instant testing.
*   **Live Tracking**: Real-time GPS tracking of your delivery partner on an interactive map.
*   **Wallet System**: Instant refunds and credit management.

### 👨‍🍳 For Vendors (Restaurants)
*   **Live Order HQ**: Instant WebSocket notifications when new orders arrive.
*   **Menu Management**: Effortlessly add, edit, or remove products and set live pricing.
*   **Business Stats**: Track ratings and customer feedback in real-time.

### 🛵 For Delivery Partners
*   **Logistics Radar**: A GPS-powered radar to find available orders nearby.
*   **Live Streaming**: Automatically streams your location to customers once an order is picked up.
*   **Earnings Log**: Transparent payout tracking for every completed delivery.

### 🛡️ For Super Admins
*   **Master Control**: Real-time user management with the ability to **Block/Unblock** users instantly.
*   **Financial Ledger**: A detailed breakdown of platform fees, vendor earnings, and tax allocations.
*   **System Health**: Overview of platform-wide activity and revenue trends.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React.js, Tailwind CSS, TanStack Query (React Query) |
| **Backend** | Node.js, Express.js |
| **Real-time** | Socket.io (WebSockets) |
| **Database** | MySQL (with Transaction support) |
| **Maps** | Leaflet.js / OpenStreetMap |
| **Payments** | Razorpay SDK |

---

## 🏁 Quick Setup

### 1. Prerequisites
*   Node.js (v16+)
*   MySQL Server

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/21ambuj/CraveRoute--Food-Delivery-Platform.git

# Install Backend dependencies
cd backend
npm install

# Install Frontend dependencies
cd ../frontend
npm install
```

### 3. Environment Config
Create a `.env` file in the **backend** folder:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=food_delivery_app
JWT_SECRET=your_secret_key
RAZORPAY_KEY_ID=your_key
RAZORPAY_KEY_SECRET=your_secret
```

### 4. Run the Platform
```bash
# Start Backend (from /backend)
node server.js

# Start Frontend (from /frontend)
npm run dev
```

---

## ⚖️ License
Distributed under the MIT License. See `LICENSE` for more information.

---

**Developed with ❤️ by [21ambuj](https://github.com/21ambuj)**
