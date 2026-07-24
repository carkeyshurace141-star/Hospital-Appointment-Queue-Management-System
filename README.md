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

This project asks whether a **Multi-Level Queue Scheduling** model - with **priority aging** to prevent starvation — can reduce waiting time and improve fairness compared to FCFS, while remaining efficient and simple enough to deploy in a real clinical setting.

## Research Question

> To what extent does Multi-Level Queue Scheduling (priority between queues, Round Robin within queues), with priority aging, reduce average patient waiting time and starvation compared to FCFS queuing in a simulated hospital outpatient setting?

## Key Features

- Online appointment booking and walk-in registration
- Patient category capture (Emergency, Critical, Elderly, Disabled, Regular)
- Real-time queue position and token number display
- Multi-Level Queue Scheduling engine with priority aging and automatic no-show handling
- Clinician dashboard with Call / Skip / Recall / Complete / Refer / No-Show actions
- Live "Now Serving" waiting room display, updated via WebSocket
- Email and SMS notifications (booking confirmation, reminders, queue alerts)
- Admin dashboard: doctor and department management, smart resource allocation, reporting
- Benchmark simulation comparing FCFS, Priority Scheduling, Round Robin and Multi-Level Queue Scheduling across six evaluation metrics
- Role-based access control (Patient, Doctor, Admin) with JWT authentication
- UK GDPR / Data Protection Act 2018 compliant: consent capture, data minimisation, audit logging, right to erasure

## Tech Stack

**MERN Stack**

| Layer | Technology |
|---|---|
| Frontend | React |
| Backend | Node.js, Express |
| Database | MongoDB (Mongoose) |
| Real-time | Socket.io (WebSocket) |
| Authentication | JWT, bcrypt |
| Notifications | Twilio (SMS), SendGrid (Email) — sandbox mode |
| Testing | Jest, Supertest, Postman/Newman |
| API Docs | Swagger / OpenAPI |

## System Architecture

The system is built as four integrated modules, each owned by one team member, communicating through a shared REST API and a real-time WebSocket layer:

```
Patient Portal  →  Backend API / Database  →  Scheduling Engine  →  Clinician Dashboard
     (Suman)             (Suresh)                  (Nirmal)              (Kabindra)
                                   ↕ WebSocket real-time layer ↕
```

1. **Patient** books or walks in and selects a category.
2. **Backend** stores the record and exposes it via the API.
3. **Scheduling Engine** assigns the patient to the correct priority queue and generates a token.
4. **Real-time layer** broadcasts the queue state to the patient screen, the waiting room board, and the clinician dashboard simultaneously.
5. **Clinician** calls the patient; a no-show automatically advances the queue; a completed consultation triggers the feedback form.
6. **Admin** views workload, queue performance, and algorithm comparison reports.

## Project Modules and Team

| Member | Module | Responsibility |
|---|---|---|
| **Suman Pokhrel** | Patient Portal and Booking | Registration, booking, walk-in, category capture, live queue display, feedback |
| **Nirmal Kharal** | Scheduling Engine and Benchmark | FCFS, Priority, Round Robin, Multi-Level Queue, benchmark harness |
| **Suresh Karki** | Backend, Security and Admin | Database, REST API, authentication, RBAC, smart allocation, reporting, compliance |
| **Kabindra Upadhayay** | Clinician Dashboard and Real-Time | Clinician actions, WebSocket layer, waiting room display, notifications |

## Scheduling Algorithms

| Algorithm | Role in this project |
|---|---|
| **FCFS** | Baseline / control condition only |
| **Priority Scheduling** | Orders patients by category (Emergency → Critical → Elderly/Disabled → Regular), with an emergency override |
| **Round Robin** | Fair rotation within a category using a configurable time quantum |
| **Multi-Level Queue Scheduling** | The system's core algorithm — four parallel queues (Emergency, Elderly & Disabled, Booked Appointment, Walk-In), priority ordering between queues, Round Robin within each queue, plus **priority aging** so no patient waits indefinitely |

## Evaluation Metrics

All four algorithms are benchmarked against synthetic patient arrival data and compared using:

1. **Waiting Time** - how long a patient waits before being seen
2. **Response Time** - how quickly the system first acknowledges a patient
3. **Throughput** - patients seen per hour
4. **Fairness** - Jain's Fairness Index across patient categories
5. **Resource Utilisation** - how evenly doctor workload is balanced
6. **Patient Satisfaction** - post-visit feedback ratings

