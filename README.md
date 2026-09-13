# P2P Wallet API

A robust, production-grade Person-to-Person (P2P) Wallet REST API built with **Node.js**, **Express**, **PostgreSQL**, and **Prisma ORM**.

Designed with core fintech engineering principles: **ACID consistency**, **concurrency control**, **deadlock prevention**, **strict idempotency**, and **precision integer money handling**.

---

## Table of Contents
1. [Core Features](#core-features)
2. [Financial & Backend Engineering Decisions](#financial--backend-engineering-decisions)
   - [Money Handling (Paise / BigInt)](#1-money-handling-paise--bigint)
   - [Concurrency Control & Deadlock Prevention](#2-concurrency-control--deadlock-prevention)
   - [Database Transactions & Atomicity](#3-database-transactions--atomicity)
   - [Idempotency Handling](#4-idempotency-handling)
   - [Transaction State Machine](#5-transaction-state-machine)
3. [Database Schema](#database-schema)
4. [API Reference](#api-reference)
5. [Setup & Installation](#setup--installation)
6. [Postman Collection](#postman-collection)

---

## Core Features

- **User Authentication**: Secure registration and login using **bcrypt** password hashing, short-lived **JWT Access Tokens**, and long-lived **Refresh Tokens**.
- **Automatic Wallet Provisioning**: Every user automatically receives an initial `ACTIVE` INR wallet upon registration (1-to-1 relationship).
- **Wallet Deposit**: Add funds to a wallet with atomic balance increments and full idempotency support.
- **Atomic P2P Transfer**: Transfer funds between users with debit/credit balance updates in a single PostgreSQL transaction with row-level locks.
- **Transaction History**: Paginated, filterable financial ledger history per wallet.
- **Zod Request Validation**: Strict type checking and sanitization on all requests with standardized error responses.

---

## Financial & Backend Engineering Decisions

### 1. Money Handling (Paise / BigInt)
> **Why not JavaScript `Number` (Floating-Point)?**
> In JavaScript, `0.1 + 0.2 === 0.30000000000000004`. Using floating-point numbers for financial calculations causes precision drift and rounding errors.

* **Decision**: All monetary balances and amounts are stored and calculated in the smallest currency unit (**Paise**: `1 INR = 100 Paise`) as **`BigInt` / 64-bit integers**.
* **Example**: ₹100.50 is stored as `10050n` in the database.
* Helper utilities in `src/utils/currency.js` (`toPaise` and `fromPaise`) safely convert inputs and serialize BigInt values to JSON.

---

### 2. Concurrency Control & Deadlock Prevention
> **The Problem**: 
> 1. **Race Conditions / Double Spending**: If a user with ₹1,000 balance sends two simultaneous ₹700 transfer requests, neither must be allowed to overdraw the wallet into a negative balance.
> 2. **Deadlocks**: If User A transfers to User B while User B transfers to User A simultaneously, locking User A then User B in one request and User B then User A in another causes a circular database lock (Deadlock).

* **Solution**:
  1. **Row-Level Locking**: Uses PostgreSQL `SELECT id, balance, status FROM wallets WHERE id IN ($1, $2) FOR UPDATE` inside the transaction to lock rows until the transaction commits or rolls back.
  2. **Deterministic Lock Ordering**: Wallet IDs are sorted lexicographically (`[fromWallet.id, toWallet.id].sort()`) prior to executing `SELECT ... FOR UPDATE`. Both transactions always acquire locks in the exact same order (e.g. Wallet A first, then Wallet B), **guaranteeing deadlocks are mathematically impossible**.

---

### 3. Database Transactions & Atomicity
* All transfers and deposits execute inside `prisma.$transaction(async (tx) => { ... })`.
* If balance verification fails, or any database error occurs, PostgreSQL automatically **rolls back** the entire transaction. Neither wallet is modified, ensuring **zero partial updates**.

---

### 4. Idempotency Handling
Every deposit and transfer accepts a client-provided `idempotency_key`.
* **First Request**: The operation processes normally and the transaction is saved with the unique `idempotency_key`.
* **Identical Replay (Same Key & Payload)**: The API recognizes the key and returns the previously completed transaction without deducting or crediting funds again.
* **Payload Conflict (Same Key, Different Payload)**: The API returns HTTP `409 IDEMPOTENCY_CONFLICT` to protect against accidental reuse of keys across different payments.

---

### 5. Transaction State Machine
Transactions transition through defined states:
```
  PENDING ──► PROCESSING ──► COMPLETED
                 │
                 └──► FAILED
```
Invalid transitions (e.g., `COMPLETED` ➔ `FAILED`) are forbidden.

---

## Database Schema

```prisma
model User {
  id         String   @id @default(uuid())
  email      String   @unique
  name       String
  password   String
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt
  wallet     Wallet?

  @@map("users")
}

model Wallet {
  id                   String        @id @default(uuid())
  user_id              String        @unique
  currency             String        @default("INR")
  balance              BigInt        @default(0) // In Paise
  status               WalletStatus  @default(ACTIVE) // ACTIVE, INACTIVE, SUSPENDED
  created_at           DateTime      @default(now())
  updated_at           DateTime      @updatedAt
  user                 User          @relation(fields: [user_id], references: [id], onDelete: Cascade)
  sentTransactions     Transaction[] @relation("SentTransactions")
  receivedTransactions Transaction[] @relation("ReceivedTransactions")

  @@index([user_id])
  @@map("wallets")
}

model Transaction {
  id              String            @id @default(uuid())
  type            TransactionType   // DEPOSIT, TRANSFER
  from_wallet_id  String?
  to_wallet_id    String?
  amount          BigInt            // In Paise
  currency        String            @default("INR")
  description     String?
  status          TransactionStatus @default(PENDING) // PENDING, PROCESSING, COMPLETED, FAILED
  idempotency_key String?           @unique
  created_at      DateTime          @default(now())
  updated_at      DateTime          @updatedAt
  fromWallet      Wallet?           @relation("SentTransactions", fields: [from_wallet_id], references: [id])
  toWallet        Wallet?           @relation("ReceivedTransactions", fields: [to_wallet_id], references: [id])

  @@index([from_wallet_id])
  @@index([to_wallet_id])
  @@index([created_at, status])
  @@map("transactions")
}
```

---

## API Reference

### Base URL: `http://localhost:5000`

### 1. Users & Auth

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/users` | Public | Create user and automatically initialize wallet |
| `POST` | `/users/login` | Public | Login and receive Access + Refresh tokens |
| `POST` | `/users/refresh-token` | Public | Refresh expired access token using refresh token |
| `GET` | `/users/:id` | Bearer | Get user profile and wallet |
| `GET` | `/users/:userId/wallet`| Bearer | Get wallet by user ID |

#### Create User Request:
```json
POST /users
{
  "name": "Alice Johnson",
  "email": "alice@example.com",
  "password": "password123"
}
```

#### Login Request:
```json
POST /users/login
{
  "email": "alice@example.com",
  "password": "password123"
}
```
**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "2c93b6dc-2ac0-4374-b3a9-fc29be441e6b",
      "name": "Alice Johnson",
      "email": "alice@example.com",
      "wallet": {
        "id": "77032477-a357-4c76-872e-26dbb96195da",
        "balance": 0,
        "currency": "INR",
        "status": "ACTIVE"
      }
    },
    "token": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi..."
  }
}
```

---

### 2. Wallets & Deposits

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/wallets/:id/deposit` | Bearer | Deposit money into a wallet (Idempotent) |
| `GET` | `/wallets/:id` | Bearer | Get wallet details by ID |
| `GET` | `/wallets/:id/transactions` | Bearer | Paginated transaction ledger |

#### Deposit Request:
```json
POST /wallets/77032477-a357-4c76-872e-26dbb96195da/deposit
Headers: { "Authorization": "Bearer <TOKEN>" }
{
  "amount": 1000,
  "idempotency_key": "dep-001"
}
```

---

### 3. P2P Transfers

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/transfers` | Bearer | Atomically transfer funds between users |
| `GET` | `/transfers/:id` | Bearer | Get transaction / transfer details by ID |

#### Transfer Request:
```json
POST /transfers
Headers: { "Authorization": "Bearer <TOKEN>" }
{
  "from_user_id": "2c93b6dc-2ac0-4374-b3a9-fc29be441e6b",
  "to_user_id": "0f9056be-2723-4dea-b125-9081916009c5",
  "amount": 300,
  "idempotency_key": "tx-transfer-101",
  "description": "Dinner split"
}
```
**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "transaction": {
      "id": "ec048a9e-4cb7-4397-894f-f8b40e95261b",
      "type": "TRANSFER",
      "from_wallet_id": "77032477-a357-4c76-872e-26dbb96195da",
      "to_wallet_id": "014445ca-3b65-4c63-b3bd-c7257999218b",
      "amount": 30000,
      "currency": "INR",
      "status": "COMPLETED",
      "idempotency_key": "tx-transfer-101"
    },
    "sender_balance": 70000,
    "receiver_balance": 130000
  }
}
```

---

## Setup & Installation

### Prerequisites
- Node.js (v18+)
- PostgreSQL database
- pnpm / npm

### 1. Clone and Install Dependencies
```bash
git clone <repo-url>
cd P2P-Wallet-API
pnpm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory:
```env
PORT=5000
DATABASE_URL="postgresql://username:password@localhost:5432/p2p_wallet?schema=public"

JWT_SECRET="your_jwt_access_secret_key"
JWT_EXPIRES_IN="1h"
JWT_REFRESH_SECRET="your_jwt_refresh_secret_key"
JWT_REFRESH_EXPIRES_IN="7d"

NODE_ENV="development"
```

### 3. Run Database Migrations
```bash
pnpm prisma migrate dev --name init
pnpm prisma generate
```

### 4. Start the Application
```bash
# Development Mode (auto-restart)
pnpm dev

# Production Mode
pnpm start
```

---

## Postman Collection
The workspace includes a pre-configured **`postman_collection.json`** file.
1. Open Postman.
2. Click **Import** ➔ select `postman_collection.json`.
3. Run the requests in numbered sequence — JWT tokens and entity IDs are dynamically captured and propagated automatically.
