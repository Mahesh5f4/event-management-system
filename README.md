# 🌌 EventHub: Distributed Event Booking Platform

[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.4-6DB33F?style=flat&logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=black)](https://reactjs.org/)
[![Redis](https://img.shields.io/badge/Redis-Distributed%20Locking-DC382D?style=flat&logo=redis&logoColor=white)](https://redis.io/)
[![RabbitMQ](https://img.shields.io/badge/RabbitMQ-Async%20Processing-FF6600?style=flat&logo=rabbitmq&logoColor=white)](https://www.rabbitmq.com/)

## 1. Project Overview
EventHub is a full-stack platform designed for high-availability event ticketing and inventory management. The system addresses the technical challenges of maintaining data consistency during high-contention booking windows through a multi-layered concurrency strategy.

### Primary Use Cases
*   **Inventory Reservation**: Synchronized seat selection across concurrent users.
*   **Transactional Booking**: Atomic ticket issuance with integrated payment simulation.
*   **Background Processing**: Offloading resource-intensive tasks (PDF generation, notifications) to message brokers.

---

## 2. System Features

| Category | Technical Implementation |
| :--- | :--- |
| **Identity & Access** | Stateless JWT with RSA256 signatures; Google OAuth 2.0 OpenID Connect. |
| **Concurrency Control** | Distributed Mutex (Redis SETNX) + JPA Optimistic Locking (`@Version`). |
| **Data Integrity** | Transactional boundaries for inventory updates; soft-deletes for audit trails. |
| **Async Operations** | RabbitMQ-driven task offloading for PDF generation and email delivery. |
| **Observability** | Prometheus-compatible metrics via Spring Actuator and Micrometer. |
| **Performance** | Redis L2 caching for read-heavy event metadata. |

---

## 3. Architecture & Data Flow

### 3.1 Backend Service Architecture
The backend follows a modular monolith structure, separating concerns into domain-specific packages.

```mermaid
graph TD
    User([Web Client]) --> Gateway[Spring Security Filter Chain]
    Gateway --> Controllers[Rest Controllers]
    Controllers --> Services[Business Logic Services]
    
    subgraph "Consistency Layer"
        Services --> RedisLock[Redis Distributed Lock]
        Services --> JPA[Spring Data JPA / Hibernate]
    end
    
    JPA --> MySQL[(MySQL 8.0)]
    RedisLock --> Redis[(Redis 7.0)]
    
    subgraph "Async Layer"
        Services --> RMQ_Pub[RabbitMQ Publisher]
        RMQ_Pub --> RMQ[[RabbitMQ Broker]]
        RMQ --> RMQ_Sub[Background Consumer]
        RMQ_Sub --> Mail[Email/PDF Service]
    end
```

### 3.2 Request Lifecycle: Booking Flow
1.  **Auth**: Filter chain validates JWT/OAuth principal.
2.  **Inventory Check**: Initial read from MySQL (or Redis cache).
3.  **Distributed Lock**: Attempt `SETNX` on `seat_lock:{eventId}:{seatId}`.
4.  **Transaction**:
    *   Update event capacity.
    *   Hibernate checks `@Version` for stale reads.
    *   Save booking record.
5.  **Event Dispatch**: Publish `BookingMessage` to RabbitMQ.
6.  **Cleanup**: Release Redis lock (explicitly or via 5m TTL).

---

## 4. Concurrency & Integrity Strategy

### 4.1 Distributed Locking (Redis SETNX)
To prevent the "Lost Update" problem at the application layer, we implement a distributed mutex.
*   **Strategy**: `setIfAbsent(key, value, timeout)`
*   **Failure Behavior**: Returns `409 Conflict` if the lock is held.
*   **Expiration**: 5-minute TTL prevents deadlocks from orphaned locks.

### 4.2 Optimistic Locking (JPA `@Version`)
Serves as a second layer of defense for database consistency.
*   **Implementation**: Every `Event` entity has a version field incremented on update.
*   **Conflict Handling**: If two transactions pass the Redis lock but update simultaneously, the second will throw `OptimisticLockException`.

---

## 5. API Documentation

### 5.1 Authentication
`POST /api/auth/login`
*   **Payload**: `{ "email": "...", "password": "..." }`
*   **Response (200)**: `{ "token": "...", "expiresIn": 3600 }`

### 5.2 Booking
`POST /api/bookings`
*   **Payload**: `{ "eventId": 1, "seatId": "A12" }`
*   **Response (201)**: `{ "id": 500, "status": "CONFIRMED" }`
*   **Conflict (409)**: `{ "error": "Seat is temporarily held by another user" }`

---

## 6. Tech Stack Details

| Layer | Component | Implementation |
| :--- | :--- | :--- |
| **Frontend** | React 19, TS | Vite build tool; Redux Toolkit for state management. |
| **Backend** | Spring Boot 3.4 | Spring Web, Security, Data JPA, Actuator. |
| **Persistence** | MySQL 8.0 | InnoDB engine; normalized schema for referential integrity. |
| **Messaging** | RabbitMQ | Decoupled background task execution. |
| **In-Memory** | Redis 7.0 | Caching and distributed synchronization. |

---

## 7. Development & Deployment

### 7.1 Local Environment Setup
1.  **Infrastructure**: Navigate to `backend/` and run `docker-compose up -d` to spin up MySQL, Redis, and RabbitMQ.
2.  **Backend**: `./mvnw spring-boot:run`.
3.  **Frontend**: `npm install && npm run dev`.

### 7.2 Deployment Strategy
*   **Current State**: Deployable via Docker Compose for all infrastructure.
*   **Future Roadmap**:
    *   Moving to Kubernetes (K8s) for horizontal pod autoscaling (HPA).
    *   Implementing Idempotency Keys for all write operations.
    *   Migrating to a distributed database (e.g., CockroachDB) if relational scaling becomes a bottleneck.

---

## 5. Detailed Documentation
For deep-dives into specific modules, refer to the technical docs:
*   [**Concurrency & Locking Strategy**](docs/concurrency/locking-strategy.md)
*   [**Backend Architecture & Data Flow**](docs/architecture/system-design.md)
*   [**API Specification**](docs/api/endpoints.md)
*   [**Deployment Roadmap**](docs/deployment/)

---

## 6. Folder Structure

```text
.
├── backend/                # Spring Boot Service
│   ├── src/main/java/      # Domain logic (auth, booking, events)
│   ├── src/main/resources/ # Persistence and environment config
│   └── docker-compose.yml  # Local infrastructure definition
├── frontend/               # React SPA
│   ├── src/components/     # UI components (GSAP integration)
│   ├── src/store/          # Redux/State management
│   └── vite.config.ts      # Frontend build config
└── docs/                   # Conceptual documentation modules
```

---

## 9. Contributing & Security
*   **Security Architecture**: All sensitive operations require valid JWT. Rate limiting is applied at the IP level.
*   **Monitoring**: Access real-time metrics at `/actuator/prometheus`.

---
*For detailed implementation notes, refer to the source code documentation in the respective modules.*
