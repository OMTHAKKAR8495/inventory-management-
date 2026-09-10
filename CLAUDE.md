# ProvisionSmart — Agent & Developer Guide

This document provides comprehensive project-specific context, conventions, architecture details, and operating guidelines for developers and AI coding agents working on **ProvisionSmart**.

---

## 🏛️ Architecture & System Overview

**ProvisionSmart** is a commercial-grade, full-stack inventory management, POS billing counter, procurement, and B2B trade credit system built for wholesale provision, grocery, and FMCG distributor businesses.

### 1. Dual-Database Storage Engine (`src/lib/cloudDb.ts` & `src/lib/db.ts`)
- **Cloud Mode (Production/Vercel)**: Connects to PostgreSQL (Supabase / Neon / AWS RDS) via IPv4 transaction pooler on port 6543 (`DATABASE_URL`).
- **Local Mode / Test Fallback (Offline & Testing)**: Seamlessly falls back to local SQLite (`./data/inventory.db`) with WAL mode enabled.
- **SQL Compatibility**:
  - Always use `?` placeholders in queries; `cloudDb.ts` automatically converts them to PostgreSQL `$1, $2` via `convertPlaceholders()`.
  - `cloudDb.ts` automatically strips `public.` schema prefixes when executing on SQLite fallback.
  - Use `withTransaction(async (tx) => { ... })` for all multi-step mutations (POS checkout, inventory adjustments, Khata settlements).

### 2. Frontend Layer (Next.js 16 + React 19 + Tailwind v4)
- **App Router**: Single-page multi-module router with hash navigation (`#catalog`, `#pos`, `#procurement`, `#khata`, `#upload`, `#audit`).
- **Dark Theme Standard**: Sleek, glassmorphic dark-mode palette using Tailwind v4 and CSS tokens (`globals.css`).
- **Strict Role-Based Access Control (RBAC)**:
  - **Store Administrator**: Full access to financial valuation (INR ₹), user staff management, PO receipt, backups, and Recycle Bin.
  - **Shopfloor Manager**: Operational POS counter, stock adjustments, Khata management, and bulk upload. Cost prices and profit margins are **strictly masked on the backend** for non-admin users.

---

## 🛠️ Commands Reference

```bash
# Install dependencies
npm install --legacy-peer-deps

# Seed realistic demo catalog, users & Khata records
npm run seed

# Run local development server
npm run dev

# Run automated unit and integration tests (Vitest)
npm test

# Run tests in watch mode
npm run test:watch

# Run linter
npm run lint

# Build optimized production application
npm run build
```

---

## ⚠️ Critical Rules for AI Agents (MUST FOLLOW)

### 1. Automatic Git Push Rule
- **Always commit and push to `origin/main` automatically** after completing any requested code changes and verifying that `npm run build` or `npm test` passes cleanly.
- Do not wait for the user to ask "push to github". Commit with a concise, descriptive Conventional Commit message and push immediately.

### 2. Next.js 16 App Router Conventions
- Dynamic route segment params are **Promises** in Next.js 16:
  ```ts
  export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    // ...
  }
  ```
- All Route Handlers in `src/app/api/` must explicitly declare `export const dynamic = "force-dynamic";`.
- Server vs Client components: Interactive components must declare `"use client";` at the very top.

### 3. Deletion Semantics
- **Products**: Use **soft delete** (`deleted_at = now`) so items can be restored from the Recycle Bin (`RecycleBinModal.tsx`).
- **Khata Accounts & Staff Users**: Use atomic transactions to remove records while preserving financial audit logs (e.g. set `invoices.customer_id = NULL` rather than deleting sales invoices).

### 4. Testing Isolation
- Vitest tests run with `NODE_ENV=test` and `DATABASE_URL=""`, ensuring tests execute 100% locally on SQLite without network latency or external cloud dependencies.
