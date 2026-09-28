# Scholarship Project Framework

A full-stack, containerized scholarship management platform that automates application intake, multi-criteria scoring, field verification, anomaly detection, and decision reporting for institutional scholarship programs.

---

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Service Breakdown](#service-breakdown)
- [Project Structure](#project-structure)
- [Data Model](#data-model)
- [Application Lifecycle](#application-lifecycle)
- [Scoring Engine](#scoring-engine)
- [Anomaly Detection](#anomaly-detection)
- [CI/CD Pipeline](#cicd-pipeline)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)

---

## Overview

This platform manages the complete lifecycle of scholarship applications — from student registration and document submission through automated scoring, field verification, and final administrative decisions. It is designed for institutional-scale deployments with role-based access for students, field verifiers, and administrators.

**Key capabilities:**

- Rule-based merit and need scoring with configurable per-program overrides
- Isolation Forest anomaly detection to flag suspicious applications
- Field verifier workflow with GPS-stamped reports and document auditing
- Real-time notifications via SMTP
- Structured reporting and analytics dashboards
- Fully containerized deployment via Docker Compose with a GitHub Actions CI/CD pipeline targeting AWS

---

## System Architecture

```
                          +------------------+
                          |   Client Browser  |
                          +--------+---------+
                                   |
                          +--------v---------+
                          |   Nginx (80/443)  |  Reverse Proxy
                          +---+----------+---+
                              |          |
               +--------------+          +--------------+
               |                                        |
    +----------v---------+                  +-----------v--------+
    |  Next.js 14  (3000) |                  |  Express API (4000) |
    |  apps/web            |                  |  apps/api           |
    |  - Student portal    |  /api/proxy/*    |  - REST endpoints   |
    |  - Admin dashboard   +----------------->|  - Auth & sessions  |
    |  - Verifier portal   |                  |  - Rule engine      |
    +--------------------+                  |  - Job workers      |
                                             +-+--------+---------+
                                               |        |
                        +----------------------+        +-------------------+
                        |                                                   |
             +----------v---------+                          +--------------v------+
             |  PostgreSQL 16      |                          |  ML Service (5000)   |
             |  (Prisma ORM)       |                          |  Python + FastAPI    |
             |  - All relational   |                          |  - Isolation Forest  |
             |    data             |                          |    anomaly detection |
             +--------------------+                          +---------------------+
                                               |
                        +----------------------+
                        |                      |
             +----------v--------+  +----------v--------+
             |  Redis 7           |  |  MinIO            |
             |  - BullMQ queues  |  |  - Document store |
             |  - Rate limiting  |  |  - S3-compatible  |
             +-------------------+  +-------------------+
```

---

## Service Breakdown

| Service | Image / Runtime | Port | Purpose |
|---|---|---|---|
| `web` | Next.js 14, Node 20 | 3000 | Frontend — student, admin, verifier portals |
| `api` | Express + TypeScript, Node 20 | 4000 | REST API, rule engine, BullMQ job workers |
| `ml-service` | Python 3.11 + FastAPI | 5000 | Isolation Forest anomaly scoring |
| `db` | PostgreSQL 16 Alpine | 5432 | Primary relational database |
| `redis` | Redis 7 Alpine | 6379 | BullMQ job queues, caching |
| `minio` | MinIO AIStor | 9000 / 9001 | S3-compatible document storage |
| `nginx` | Nginx Alpine | 80 / 443 | Reverse proxy, TLS termination |

---

## Project Structure

```
scholarship-project-deployment/
├── apps/
│   ├── api/                        # Express + TypeScript backend
│   │   ├── src/
│   │   │   ├── index.ts            # Server entry point, middleware, route registration
│   │   │   ├── lib/
│   │   │   │   ├── jwt.ts          # JWT signing and verification
│   │   │   │   ├── logger.ts       # Winston logger
│   │   │   │   ├── minio.ts        # MinIO client and bucket setup
│   │   │   │   ├── prisma.ts       # Prisma client singleton
│   │   │   │   └── redis.ts        # Redis/BullMQ connection
│   │   │   ├── middleware/
│   │   │   │   └── auth.ts         # JWT authentication, role guards
│   │   │   ├── routes/
│   │   │   │   ├── auth.ts         # Register, login, logout
│   │   │   │   ├── applications.ts # Application CRUD, submit, score
│   │   │   │   ├── programs.ts     # Scholarship program management
│   │   │   │   ├── rules.ts        # Eligibility rule CRUD
│   │   │   │   ├── verification.ts # Verifier assignment and field report submission
│   │   │   │   ├── officer.ts      # Officer review and shortlisting
│   │   │   │   ├── reports.ts      # Analytics and export
│   │   │   │   ├── documents.ts    # Document upload/download via MinIO
│   │   │   │   └── admin.ts        # User and system administration
│   │   │   ├── services/
│   │   │   │   ├── scoring/
│   │   │   │   │   ├── ruleEngine.ts        # Orchestrates scoring pipeline
│   │   │   │   │   ├── ruleEvaluator.ts     # Per-rule evaluation logic
│   │   │   │   │   ├── studentDataLoader.ts # Assembles student profile for scoring
│   │   │   │   │   └── statusLog.ts         # Status transition logging
│   │   │   │   ├── anomaly/
│   │   │   │   │   └── anomalyPreFilter.ts  # Pre-filter before ML call
│   │   │   │   ├── mlClient/
│   │   │   │   │   └── index.ts             # HTTP client for ML service
│   │   │   │   ├── reports/
│   │   │   │   │   └── reportGenerator.ts   # PDF/CSV report generation
│   │   │   │   └── notifications.ts         # Email notification dispatch
│   │   │   ├── jobs/
│   │   │   │   └── index.ts        # BullMQ worker definitions
│   │   │   ├── types/
│   │   │   │   └── student.ts      # Shared TypeScript types
│   │   │   └── scripts/            # Database seeding and migration helpers
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web/                        # Next.js 14 frontend (App Router)
│       ├── src/
│       │   ├── app/
│       │   │   ├── (auth)/         # Login and registration pages
│       │   │   ├── (student)/      # Student portal
│       │   │   │   ├── app/apply/      # Application form
│       │   │   │   ├── app/dashboard/  # Student dashboard
│       │   │   │   ├── app/documents/  # Document upload
│       │   │   │   └── app/status/     # Application status tracking
│       │   │   ├── (admin)/        # Admin portal
│       │   │   │   ├── admin/analytics/     # Analytics dashboard
│       │   │   │   ├── admin/applications/  # Application management
│       │   │   │   ├── admin/decisions/     # Final decisions
│       │   │   │   ├── admin/institutions/  # Institution registry
│       │   │   │   ├── admin/ml/            # ML model monitoring
│       │   │   │   ├── admin/programs/      # Scholarship programs
│       │   │   │   ├── admin/reports/       # Report generation
│       │   │   │   ├── admin/review/        # Application review
│       │   │   │   ├── admin/rules/         # Rule configuration
│       │   │   │   ├── admin/settings/      # System settings
│       │   │   │   ├── admin/users/         # User management
│       │   │   │   └── admin/verifiers/     # Verifier assignment
│       │   │   └── (verifier)/     # Field verifier portal
│       │   │       ├── verifier/dashboard/  # Pending assignments
│       │   │       ├── verifier/visit/[id]/ # Field visit form
│       │   │       └── verifier/history/    # Completed visits
│       │   └── components/
│       │       ├── layout/StaffSidebar.tsx  # Admin/verifier navigation
│       │       └── layout/StudentNav.tsx    # Student navigation
│       ├── Dockerfile
│       ├── next.config.mjs
│       ├── tailwind.config.ts
│       └── package.json
│
├── ml-service/                     # Python FastAPI anomaly detection service
│   ├── app/
│   │   ├── main.py                 # FastAPI application entry point
│   │   ├── routes/
│   │   │   └── anomaly.py          # /predict endpoint
│   │   └── services/
│   │       └── model_store.py      # Isolation Forest model loading and inference
│   ├── Dockerfile
│   └── requirements.txt
│
├── prisma/
│   ├── schema.prisma               # Full database schema (all models and enums)
│   ├── seed.ts                     # Primary seed data
│   └── test_scoring.ts             # Scoring validation script
│
├── nginx/
│   ├── nginx.conf                  # Reverse proxy routing rules
│   └── certs/                      # TLS certificate directory (not committed)
│
├── .github/
│   └── workflows/
│       └── deploy.yml              # GitHub Actions CI/CD pipeline
│
├── docker-compose.yml              # Full service orchestration
├── .env.example                    # Environment variable template
└── README.md
```

---

## Data Model

The database schema is defined in `prisma/schema.prisma` using PostgreSQL 16.

### Core Models

| Model | Description |
|---|---|
| `User` | All users — students, verifiers, admins. Role-based via `UserRole` enum |
| `ScholarshipProgram` | Scholarship schemes with seat counts and shortlist multipliers |
| `Application` | Central record linking a student to a program with full scoring fields |
| `ApplicationStatusLog` | Immutable audit trail of every status transition |
| `Document` | Files uploaded to MinIO, verified per application |
| `EligibilityRule` | Configurable scoring and eligibility rules with operators and score buckets |
| `ProgramRuleOverride` | Per-program threshold overrides for any eligibility rule |
| `VerificationAssignment` | Field verifier assignment to a flagged or sampled application |
| `VerifierFieldReport` | Structured GPS-stamped field report with per-section responses |
| `Institution` | Recognized educational institutions |
| `Notification` | In-app and email notifications linked to users and applications |

### Student Profile Models

The student profile is decomposed into specialized tables to separate concerns and allow partial saves:

| Model | Contains |
|---|---|
| `StudentPersonal` | Demographics, caste, disability, family status |
| `StudentAcademic` | HSC scores, UG percentage, year of study, institution, arrears |
| `StudentFamily` | Family size, dependents, chronic illness, widow pension |
| `StudentFinancial` | Income, ration card type, loans, deposits, gold value |
| `StudentAssets` | Land, vehicles, property, electronics |
| `StudentHousing` | House type, ownership, utilities (electricity, water, toilet, LPG) |
| `StudentGovtBenefits` | BPL card, AAY, MGNREGA, Ayushman, PM scheme flags |

### Application Status Flow

```
draft -> submitted -> evaluating -> [anomaly_flagged | evaluated]
evaluated -> scored -> verification_pending -> verification_complete
verification_complete -> [approved | waitlisted | rejected]
not_shortlisted (exit from evaluating)
```

---

## Application Lifecycle

1. **Student Registration** — student creates an account, fills multi-section profile (personal, academic, family, financial, assets, housing, government benefits), and uploads required documents.

2. **Submission** — application status moves from `draft` to `submitted`; a BullMQ job is enqueued.

3. **Anomaly Pre-filter** — the API pre-screens the profile for statistical outliers before calling the ML service. The Isolation Forest model returns an anomaly score (0–1). Applications above the configured threshold are flagged as `anomaly_flagged` for manual review.

4. **Rule-based Scoring** — the rule engine evaluates all active `EligibilityRule` records against the student's assembled profile. Rules are grouped into three score buckets:
   - `merit` — academic performance
   - `need` — financial and family circumstances
   - `integrity` — consistency and honesty checks

   A weighted sum model (WSM) produces a `composite_score`.

5. **Shortlisting** — the top N applications (seats × shortlist multiplier) are shortlisted and assigned to field verifiers.

6. **Field Verification** — verifiers complete a structured 9-section field report (identity, housing, utilities, income, assets, electronics, land, bank documents, supporting documents) with GPS coordinates and photographs. A `match_score` is computed and applied as a `post_verify_composite`.

7. **Final Decision** — administrators review scored and verified applications and issue `approved`, `waitlisted`, or `rejected` decisions. All transitions are logged in `ApplicationStatusLog`.

---

## Scoring Engine

The scoring engine lives in `apps/api/src/services/scoring/`.

### Rule Types

| Type | Behavior |
|---|---|
| `SCORE` | Adds fixed points to a score bucket when the condition passes |
| `DEDUCTION` | Subtracts points when the condition passes |
| `THRESHOLD` | Blocks progression if the condition fails (hard gate) |
| `COMPOSITE` | Aggregates multiple rule results into a weighted score |
| `AWARD` | Marks the application as eligible for award |
| `CONFIG` | System configuration constants (no direct scoring effect) |

### Supported Operators

`GT`, `LT`, `GTE`, `LTE`, `EQ`, `NEQ`, `IN`, `NOT_IN`, `AND_COMPOUND`, `SCALE`, `FORMULA`, `RANGE_CHECK`, `RANK_CUTOFF`, `CONSTANT`

Rules can be overridden per program via `ProgramRuleOverride` without modifying the base rule.

---

## Anomaly Detection

The `ml-service` exposes a single `/predict` endpoint backed by scikit-learn's `IsolationForest`.

- The model is trained on accepted application feature vectors and serialized with `joblib`.
- At inference time the API sends a feature array; the service returns a score and binary flag.
- The anomaly threshold is configurable via the `ML_ANOMALY_THRESHOLD` environment variable (default 0.65).
- XGBoost-based need scoring was removed in Phase 3; all need scoring is now handled by the rule engine.

---

## CI/CD Pipeline

The GitHub Actions workflow in `.github/workflows/deploy.yml` runs on every push to `main`.

### Steps

1. Checkout source code
2. Configure AWS credentials from repository secrets
3. Authenticate with Amazon ECR
4. Build and push Docker images for `api`, `web`, and `ml-service` tagged with the short commit SHA
5. Resolve the healthy EC2 instance ID from the configured Auto Scaling Group
6. Send a deployment command via AWS SSM Run Command which:
   - Pulls the latest code from origin
   - Logs into ECR and pulls the new images
   - Restarts only the application containers (zero-downtime for DB, Redis, MinIO)
   - Runs `prisma migrate deploy`
   - Prunes old images
7. Poll SSM for up to 10 minutes and print deployment output

### Required Secrets

| Secret | Description |
|---|---|
| `AWS_ACCESS_KEY_ID` | IAM key with ECR push and SSM SendCommand permissions |
| `AWS_SECRET_ACCESS_KEY` | Corresponding secret |

---

## Environment Variables

Copy `.env.example` to `.env` and fill in all values before running.

| Variable | Description |
|---|---|
| `POSTGRES_USER` | PostgreSQL username |
| `POSTGRES_PASSWORD` | PostgreSQL password |
| `POSTGRES_DB` | Database name |
| `DATABASE_URL` | Full PostgreSQL connection string for Prisma |
| `REDIS_URL` | Redis connection URL |
| `JWT_SECRET` | Secret for signing JWT access tokens |
| `NEXTAUTH_SECRET` | NextAuth.js session secret |
| `NEXTAUTH_URL` | Public base URL of the Next.js app |
| `MINIO_ENDPOINT` | MinIO hostname |
| `MINIO_PORT` | MinIO port (default 9000) |
| `MINIO_ACCESS_KEY` | MinIO root user |
| `MINIO_SECRET_KEY` | MinIO root password |
| `MINIO_BUCKET` | Bucket name for document storage |
| `ML_SERVICE_URL` | Internal URL of the ML service |
| `ML_ANOMALY_THRESHOLD` | Anomaly score cutoff (0.0–1.0, default 0.65) |
| `SMTP_HOST` | SMTP server hostname |
| `SMTP_PORT` | SMTP port (587 for STARTTLS) |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password or app password |
| `FROM_EMAIL` | Sender address for notifications |

---

## Getting Started

### Prerequisites

- Docker and Docker Compose v2
- Git

### Local Setup

```bash
# 1. Clone the repository
git clone https://github.com/keerthivasank04/scholarship-project-framework.git
cd scholarship-project-framework

# 2. Configure environment
cp .env.example .env
# Edit .env with your values

# 3. Start all services
docker compose up -d

# 4. Run database migrations
docker compose exec api npx prisma migrate deploy

# 5. Seed initial data (optional)
docker compose exec api npx ts-node prisma/seed.ts
```

### Access Points

| Service | URL |
|---|---|
| Student / Admin / Verifier portal | http://localhost |
| Next.js direct | http://localhost:3000 |
| API | http://localhost:4000 |
| ML Service | http://localhost:5000 |
| MinIO Console | http://localhost:9001 |
| API Health Check | http://localhost:4000/health |

### User Roles

| Role | Portal Path | Capabilities |
|---|---|---|
| `student` | `/app/dashboard` | Apply, upload documents, track status |
| `verifier` | `/verifier/dashboard` | Complete field visit reports |
| `super_admin` | `/admin/applications` | Full access to all management features |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Backend API | Node.js 20, Express, TypeScript, Prisma ORM |
| Database | PostgreSQL 16 |
| Cache / Queue | Redis 7, BullMQ |
| Object Storage | MinIO (S3-compatible) |
| ML Service | Python 3.11, FastAPI, scikit-learn (Isolation Forest) |
| Reverse Proxy | Nginx |
| Containerization | Docker, Docker Compose |
| CI/CD | GitHub Actions, AWS ECR, AWS SSM |
| Hosting | AWS EC2 Auto Scaling Group |
