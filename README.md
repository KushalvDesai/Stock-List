# StockList - Inventory Management System

StockList is a robust, scalable multi-role web application designed for comprehensive inventory management, specifically tailored for tracking production, stock, and sales workflows. Built with a modern tech stack, it provides specialized dashboards and workflows for Staff, Owners, and Administrators, wrapped in a mobile-first Progressive Web App (PWA) experience.

## 🚀 Features

### Role-Based Access Control (RBAC)
- **Staff:** Dedicated interfaces for seamless stock addition and inventory viewing. Features an **Excel-Like Grid Entry** for high-speed, bulk data entry with keyboard navigation and validation.
- **Owner:** High-level visibility and control. Access to an **Analytics Dashboard** (with Recharts visualizations for Stock Status and Production vs. Sales), company & staff management, and an approval system for staff's edit requests.
- **Admin:** Full system oversight. Includes a real-time system monitoring dashboard capturing server health metrics, system logs, and platform-wide user management.

### Core Workflows
- **Stock Approval Workflow:** Staff modifications require owner approval to ensure data integrity.
- **Sales Pipelines:** Separated workflows to accurately track revenue and dispatch logic for Private Sales and Auction Sales.
- **Telemetry & Monitoring:** Live tracking of API requests, errors, CPU, and Memory usage.

### Mobile-First PWA
- Smart device detection routing mobile users to a dedicated `/owner-mobile` ecosystem.
- Native UI elements like iOS-style bottom navigation and touch-optimized components.
- Persistent sessions (up to 100 days) and smart installation prompts across Android and iOS.

## 🛠️ Tech Stack

**Frontend (`/client`):**
- [Next.js](https://nextjs.org/) (React 19)
- [Tailwind CSS](https://tailwindcss.com/) & [Shadcn UI](https://ui.shadcn.com/)
- [Zustand](https://zustand-demo.pmnd.rs/) for state management
- [Recharts](https://recharts.org/) for data visualization
- `next-pwa` for offline and native-like mobile experience

**Backend (`/server`):**
- [Node.js](https://nodejs.org/) & [Express](https://expressjs.com/)
- [Prisma ORM](https://www.prisma.io/)
- PostgreSQL database
- JWT-based Authentication

## 📂 Project Structure

The project is structured as a monorepo with two main directories:

- `/client`: Contains the Next.js frontend application.
- `/server`: Contains the Node.js/Express backend API and Prisma schema.

## ⚙️ Getting Started

### Prerequisites

- Node.js (v20+ recommended)
- PostgreSQL database

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/KushalvDesai/inventory-app.git
   cd inventory-app
   ```

2. **Install dependencies:**

   You'll need to install dependencies in the root, client, and server directories.
   
   ```bash
   npm install          # Install root dependencies (concurrently)
   cd client
   npm install          # Install frontend dependencies
   cd ../server
   npm install          # Install backend dependencies
   ```

3. **Environment Setup:**
   Create `.env` files in both the `/client` and `/server` directories with the necessary environment variables (e.g., `DATABASE_URL` for PostgreSQL, JWT secrets, etc.).

4. **Database Setup:**
   From the `/server` directory, run Prisma to set up your database schema:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

### Running Locally

You can start both the frontend and backend concurrently from the root directory:

```bash
npm run dev
```

Alternatively, run them separately in different terminal tabs:
- **Client:** `cd client && npm run dev` (Runs on port 3001)
- **Server:** `cd server && npm run dev`
