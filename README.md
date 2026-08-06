# Hospital Appointment and Queue Management System

**Using Round Robin and Priority Scheduling**

An MSc Masters Project at the University of the West of Scotland (UWS), 2025/26.

This project replaces the traditional First-Come-First-Served (FCFS) queuing model used in many hospital outpatient clinics with a fairer, smarter approach: **Multi-Level Queue Scheduling with priority aging**, combining Priority Scheduling and Round Robin Scheduling across four parallel patient queues.

---

## Table of Contents

- [Problem Statement](#problem-statement)
- [Research Question](#research-question)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [Project Modules and Team](#project-modules-and-team)
- [Scheduling Algorithms](#scheduling-algorithms)
- [Evaluation Metrics](#evaluation-metrics)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Documentation](#api-documentation)
- [Folder Structure](#folder-structure)
- [Testing](#testing)
- [Security and Compliance](#security-and-compliance)
- [Project Timeline](#project-timeline)
- [Contributing](#contributing)
- [License](#license)

---

## Problem Statement

Hospital outpatient clinics commonly use First-Come-First-Served (FCFS) queuing, treating every patient identically regardless of urgency. This means Emergency, Critical, Elderly and Disabled patients can wait just as long as Regular patients, and no-shows stall the queue with no automated recovery.

This project asks whether a **Multi-Level Queue Scheduling** model - with **priority aging** to prevent starvation - can reduce waiting time and improve fairness compared to FCFS, while remaining efficient and simple enough to deploy in a real clinical setting.

## Research Question

> To what extent does Multi-Level Queue Scheduling (priority between queues, Round Robin within queues), with priority aging, reduce average patient waiting time and starvation compared to FCFS queuing in a simulated hospital outpatient setting?

## Key Features

- Online appointment booking with an availability-aware date/time picker - doctors set weekly hours plus per-date overrides, and both the booking form and the server check the requested slot against them before confirming
- Walk-in registration and patient category capture (Emergency, Critical, Elderly, Disabled, Regular)
- Real-time queue position and token number display
- Multi-Level Queue Scheduling engine with priority aging and automatic no-show handling
- Clinician dashboard with Call / Skip / Recall / Complete / Refer / No-Show actions and a weekly + per-date availability editor
- Live "Now Serving" waiting room display, updated via WebSocket
- Real-time in-app chat between a patient and their doctor for the lifetime of an appointment (open for 24h after the consultation is marked complete)
- Email notifications: booking confirmation, appointment reminders, doctor account welcome email, and self-service forgot/reset password
- Sign in with email/password or Google Sign-In (OAuth 2.0)
- Admin dashboard: doctor and department management, a "Monitor Queue" panel showing every department's live queue at once, click-through detail behind every overview metric (on-duty/unavailable doctors, today's average wait, today's completed consultations), smart resource allocation, and CSV-exportable reports
- Benchmark simulation comparing FCFS, Priority Scheduling, Round Robin and Multi-Level Queue Scheduling across six evaluation metrics
- Role-based access control (Patient, Doctor, Admin) with JWT authentication, rate-limited login, and an audit log of admin/clinician actions
- UK GDPR / Data Protection Act 2018-conscious design: data minimisation in API responses, audit logging, and admin account deletion guarded against orphaning active appointments

## Tech Stack

**MERN Stack**

| Layer | Technology |
|---|---|
| Frontend | React (Vite), React Router |
| Backend | Node.js, Express |
| Database | MongoDB (Mongoose) |
| Real-time | Socket.io (WebSocket) - live queue updates and appointment chat |
| Authentication | JWT, bcrypt, Google OAuth 2.0 (`google-auth-library`) |
| Notifications | Nodemailer (SMTP email - confirmations, reminders, password reset, doctor welcome) |
| Testing | Jest, Supertest, `mongodb-memory-server` |

## System Architecture

The system is built as four integrated modules, each owned by one team member, communicating through a shared REST API and a real-time WebSocket layer:

```
Patient Portal  →  Backend API / Database  →  Scheduling Engine  →  Clinician Dashboard
     (Suman)             (Suresh)                  (Nirmal)              (Kabindra)
                                   ↕ WebSocket real-time layer ↕
                         (queue updates, appointment chat)
```

1. **Patient** books or walks in and selects a category.
2. **Backend** stores the record and exposes it via the API.
3. **Scheduling Engine** assigns the patient to the correct priority queue and generates a token.
4. **Real-time layer** broadcasts the queue state to the patient screen, the waiting room board, and the clinician dashboard simultaneously, and carries the patient-doctor chat.
5. **Clinician** calls the patient; a no-show automatically advances the queue; a completed consultation triggers the feedback form and opens a 24h chat window.
6. **Admin** monitors every department's live queue, drills into workload/availability/wait-time detail, and views algorithm comparison reports.

## Project Modules and Team

| Member | Module | Responsibility |
|---|---|---|
| **Suman Pokhrel** | Patient Portal and Booking | Registration, booking, walk-in, category capture, live queue display, feedback |
| **Nirmal Kharal** | Scheduling Engine and Benchmark | FCFS, Priority, Round Robin, Multi-Level Queue, benchmark harness |
| **Suresh Karki** | Backend, Security and Admin | Database, REST API, authentication, RBAC, smart allocation, reporting, compliance |
| **Kabindra Upadhayay** | Clinician Dashboard and Real-Time | Clinician actions, WebSocket layer, waiting room display, appointment chat |

Each member develops on their own branch (`suman`, `nirmal`, `kabindra`); `main` tracks the integrated, deployable state.

## Scheduling Algorithms

| Algorithm | Role in this project |
|---|---|
| **FCFS** | Baseline / control condition only |
| **Priority Scheduling** | Orders patients by category (Emergency → Critical → Elderly/Disabled → Regular), with an emergency override |
| **Round Robin** | Fair rotation within a category using a configurable time quantum |
| **Multi-Level Queue Scheduling** | The system's core algorithm - four parallel queues (Emergency, Elderly & Disabled, Booked Appointment, Walk-In), priority ordering between queues, Round Robin within each queue, plus **priority aging** so no patient waits indefinitely |

## Evaluation Metrics

All four algorithms are benchmarked against synthetic patient arrival data and compared using:

1. **Waiting Time** - how long a patient waits before being seen
2. **Response Time** - how quickly the system first acknowledges a patient
3. **Throughput** - patients seen per hour
4. **Fairness** - Jain's Fairness Index across patient categories
5. **Resource Utilisation** - how evenly doctor workload is balanced
6. **Patient Satisfaction** - post-visit feedback ratings

The comparison is computed automatically once at server startup and cached (see `backend/src/utils/benchmarkCache.js`), so the Admin Reports page always has fresh results without running the benchmark by hand. It can also be run standalone with `npm run benchmark`.

## Getting Started

**Prerequisites:** Node.js 18+, a MongoDB connection (local or Atlas).

```bash
# 1. Clone the repository
git clone <repo-url>
cd "Hospital Appointment and queue managment"

# 2. Backend
cd backend
npm install
cp .env.example .env        # fill in MONGODB_URI, JWT_SECRET, etc. - see below
npm run seed:admin          # creates the first admin account
npm run seed:departments    # optional - seeds starter departments
npm run dev                 # starts the API on http://localhost:5000

# 3. Frontend (in a second terminal)
cd frontend
npm install
cp .env.example .env        # points VITE_API_URL at the backend above
npm run dev                 # starts the app on http://localhost:5173
```

Sign in as the seeded admin to add departments, doctors and specializations, or register as a patient to try the booking flow.

## Environment Variables

**`backend/.env`**

| Variable | Purpose |
|---|---|
| `PORT` | API port (default `5000`) |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | JWT signing secret and token lifetime |
| `GOOGLE_CLIENT_ID` | OAuth 2.0 client ID for Google Sign-In |
| `CLIENT_ORIGIN` | Frontend origin allowed by CORS |
| `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Used by `npm run seed:admin` to create the first admin account |
| `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM` | SMTP settings for outgoing email; left blank, emails are skipped (logged, not sent) rather than failing the request |

**`frontend/.env`**

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Base URL of the backend API |
| `VITE_GOOGLE_CLIENT_ID` | Same OAuth 2.0 client ID as the backend, for the Google Sign-In button |

See `backend/.env.example` and `frontend/.env.example` for the full templates. Neither `.env` file is committed.

## API Documentation

All endpoints are prefixed with `/api` and (other than auth and public department listings) require a `Authorization: Bearer <token>` header.

| Base path | Covers |
|---|---|
| `/api/auth` | Signup, login, Google Sign-In, forgot/reset password, change password |
| `/api/departments` | Public department and doctor listings used by the booking flow |
| `/api/specializations` | Specialization lookup for doctor accounts |
| `/api/appointments` | Book, list mine, cancel, reschedule, check in, queue status |
| `/api/clinician` | Doctor queue actions (call/skip/recall/complete/refer/no-show) and availability |
| `/api/chat` | Appointment-scoped chat message history |
| `/api/admin` | Doctors, departments, specializations, system overview, live queues, completed-today detail, audit log, reports, benchmark results |

The real-time Socket.io event contract (queue updates, `appointment:called`/`appointment:completed`, and the `chat:*` events) is documented in [`docs/event-contracts.md`](docs/event-contracts.md).

## Folder Structure

```
backend/
  scheduling-engine/       FCFS, Priority, Round Robin, Multi-Level Queue + benchmark harness
  src/
    config/                DB connection, Socket.io setup, mailer
    controllers/            Route handlers (auth, admin, appointment, clinician, chat, department...)
    jobs/                   Scheduled jobs (e.g. appointment reminders)
    middleware/              Auth/RBAC, validation, audit logging, error handling
    models/                 Mongoose schemas (User, Appointment, Token, Message, Department...)
    routes/                 Express routers, one per resource
    utils/                  Resource allocation, availability checks, email templates, etc.
  tests/                    Jest + Supertest integration tests

frontend/
  src/
    components/             Shared UI (forms, ChatPanel, etc.)
    context/                Auth context/provider
    hooks/                  useChatSocket and other reusable hooks
    pages/                  One component per route, incl. admin/ and doctor/ subfolders
    services/                Thin fetch wrappers per API resource
```

## Testing

```bash
cd backend
npm test
```

The backend test suite (Jest + Supertest, run against an in-memory MongoDB via `mongodb-memory-server`) covers the scheduling engine, resource allocation, and every controller (auth, admin, appointment, clinician, chat, department, specialization) with both happy-path and failure-case tests. There is currently no automated frontend test suite - UI changes are verified manually against the running app.

## Security and Compliance

- **Authentication:** JWT-based sessions, bcrypt-hashed passwords, optional Google Sign-In, and rate-limited login attempts
- **Authorization:** Role-based access control (`patient` / `doctor` / `admin`) enforced per route
- **Audit logging:** Sensitive admin and clinician actions are recorded with actor, action, target, and timestamp, viewable from the Admin Audit Log page
- **Data minimisation:** API responses are shaped per-role (e.g. patients never see other patients' data; public department/doctor listings omit unrelated fields)
- **Safe account deletion:** Deleting a doctor is blocked while they have active appointments, so patients are never silently orphaned
- **Secrets:** Never committed - `.env` files are gitignored, and `.env.example` templates document required variables without real values

## Project Timeline

Delivered as a series of module increments rather than a fixed calendar:

1. **Foundations** - authentication, RBAC, department/doctor data model
2. **Core scheduling and booking** - Multi-Level Queue engine, availability-aware appointment booking, walk-in registration
3. **Real-time and clinician tooling** - WebSocket queue broadcasts, clinician queue actions, appointment chat
4. **Admin and evaluation** - admin dashboard (live queue monitor, reporting), benchmark harness, audit logging, end-to-end testing

## Contributing

This is an academic group project with a fixed team (see [Project Modules and Team](#project-modules-and-team)). Each member works on their own branch and integrates into `main`. External contributions are not currently accepted.

## License

Developed for academic assessment as part of an MSc dissertation at the University of the West of Scotland. No open-source license is granted at this time.
