# Socket.io Event Contracts

This document is the single source of truth for every real-time event the
system emits or listens for. Every future week that adds a real-time feature
(live queue position, appointment status changes, doctor call-next, etc.)
must add its event here **before** wiring it up, using the same format.

## Naming convention

- Events are namespaced `domain:action`, lowercase, colon-separated
  (e.g. `server:ping`, `queue:updated`, `appointment:called`).
- `server:*` — infrastructure/connection-health events, not domain data.
- `queue:*`, `appointment:*`, `doctor:*` (future) — domain events, one prefix
  per aggregate.
- Direction is always documented relative to the server: **emit** (server →
  client) or **listen** (client → server).

## Event table

| Event name    | Direction | Payload shape                 | Notes                                                                 |
| ------------- | --------- | ------------------------------ | ---------------------------------------------------------------------|
| `server:ping` | emit      | `{ timestamp: string (ISO 8601) }` | Broadcast to all connected clients every 10s. Proves the socket connection is alive; no domain meaning yet. |
| `queue:updated` | emit    | `{ departmentId: string, queueSnapshot: Array<{ tokenNumber: number, category: string, status: string }> }` | Broadcast to all connected clients whenever a department's in-memory `MultiLevelQueueScheduler` changes (enqueue on booking check-in/walk-in, dequeue on Call/Recall/no-show, re-enqueue on Skip/Refer). `queueSnapshot` is ordered as the scheduler would serve it. Currently a global broadcast (no per-department rooms yet); clients filter on `departmentId`. Consumed by the Clinician Dashboard, the patient-facing Queue Status page, and `DevSocketListener.jsx`. |
| `appointment:called` | emit | `{ appointmentId: string, departmentId: string, tokenNumber: number, patientName: string }` | Broadcast when a clinician calls a patient forward — via Call, Recall, or the automatic promotion after a no-show (`POST /api/clinician/queue/call\|recall\|no-show`). The patient-facing Queue Status page matches on `appointmentId` to show "you are being called now"; the Now Serving waiting-room display matches on `departmentId` to update its board. |
| `appointment:completed` | emit | `{ appointmentId: string, patientId: string }` | Broadcast when a clinician marks a consultation complete (`POST /api/clinician/queue/complete`). The patient-facing app matches on `patientId` to trigger the post-visit feedback prompt (Task 7). |

## Adding a new event (future weeks)

When a new real-time feature is added, append a row above with:

1. **Event name** — following the `domain:action` convention.
2. **Direction** — `emit` or `listen` from the server's perspective.
3. **Payload shape** — a TypeScript-like inline shape, including optional
   fields marked with `?`.
4. **Notes** — who triggers it, which clients receive it (broadcast vs. a
   specific room), and any ordering/idempotency assumptions.
