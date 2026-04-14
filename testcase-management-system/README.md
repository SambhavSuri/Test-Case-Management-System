# JumpIQ - Test Case Management System

A full-stack Test Case Management Portal for QA teams to create, organize, execute, and track test cases across projects.

## Features

- **Test Case Repository** - Create test cases manually, bulk import via CSV/Excel, or auto-generate from BRD documents using AI
- **Test Plan Management** - Create and manage test plans with owner, timeline, and status tracking
- **Plan-Based Execution** - Select a test plan and run its assigned test cases with pass/fail/block actions
- **Real-Time Progress Tracking** - KPI dashboards with live completion percentages, pass/fail counts, and execution logs
- **Project Organization** - Hierarchical structure with Projects, Modules, and Suites
- **Traceability Matrix** - Map requirements to test cases with coverage indicators
- **Quality Reports** - Summary, execution, defect trend, and traceability reports
- **Role-Based Access** - Admin and QA Engineer roles

## Tech Stack

| Layer     | Technology                                                     |
| --------- | -------------------------------------------------------------- |
| Frontend  | React 18, TypeScript, Vite, Tailwind CSS, Zustand, React Router |
| Backend   | Node.js, Express.js, TypeScript                                |
| Storage   | JSON file-based (local)                                        |
| DevOps    | Docker, Docker Compose                                         |

## Project Structure

```
testcase-management-system/
├── frontend/                   # React frontend application
│   ├── src/
│   │   ├── components/         # Layout, SideNavBar, TopNavBar
│   │   ├── pages/              # Dashboard, TestCaseRepository, TestPlans,
│   │   │                       # TestExecutionCycle, QualityReports, TraceabilityMatrix
│   │   ├── App.tsx             # Route definitions
│   │   └── main.tsx            # Entry point
│   ├── Dockerfile
│   ├── tailwind.config.js
│   └── vite.config.ts
├── backend/                    # Express API server
│   ├── src/
│   │   ├── index.ts            # API routes and server setup
│   │   └── utils/
│   │       └── jsonDb.ts       # JSON file database layer
│   ├── data/                   # JSON data files
│   │   ├── testcases.json
│   │   ├── testplans.json
│   │   ├── projects.json
│   │   └── users.json
│   ├── uploads/                # File uploads directory
│   └── Dockerfile
└── docker-compose.yml          # Multi-container orchestration
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd testcase-management-system
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

### Running Locally

Start both servers in separate terminals:

**Backend** (runs on port 3001):

```bash
cd backend
npm run dev
```

**Frontend** (runs on port 5173):

```bash
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Running with Docker

```bash
docker-compose up --build
```

- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend API: [http://localhost:3001](http://localhost:3001)

## API Endpoints

All data is served through a generic REST API:

| Method | Endpoint               | Description         |
| ------ | ---------------------- | ------------------- |
| GET    | `/api/:collection`     | List all items      |
| GET    | `/api/:collection/:id` | Get single item     |
| POST   | `/api/:collection`     | Create item         |
| PUT    | `/api/:collection/:id` | Update item         |
| DELETE | `/api/:collection/:id` | Delete item         |
| POST   | `/api/auth/login`      | Authentication      |

**Available collections:** `testcases`, `testplans`, `projects`, `users`

## Default Credentials

| Username     | Password   | Role        |
| ------------ | ---------- | ----------- |
| admin        | password   | Admin       |
| qa_engineer  | password   | QA Engineer |
