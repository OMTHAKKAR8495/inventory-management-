# Contributing to ProvisionSmart

Thank you for contributing to **ProvisionSmart**! This guide outlines the development standards, branch conventions, and testing practices to maintain production quality.

---

## 🚀 Getting Started Locally

### 1. Prerequisites
- **Node.js**: v20.x or higher
- **npm**: v10.x or higher

### 2. Setup
```bash
# Clone repository
git clone https://github.com/OMTHAKKAR8495/inventory-management-.git
cd inventory-management-

# Install dependencies
npm install --legacy-peer-deps

# Create your local environment configuration
cp .env.example .env.local

# Seed initial demo database with sample products, users & Khata records
npm run seed

# Launch local development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🌿 Branch Naming Conventions

Use lowercase branch names prefixed with the category of change:

| Prefix | Description | Example |
| :--- | :--- | :--- |
| `feat/` | New features or core user-facing changes | `feat/whatsapp-pdf-receipts` |
| `fix/` | Bug fixes and mistake corrections | `fix/khata-balance-rounding` |
| `refactor/` | Code structure improvements without functionality changes | `refactor/sqlite-transaction-helper` |
| `test/` | Adding or updating tests | `test/pos-checkout-unit-tests` |
| `docs/` | Documentation, README or OpenAPI changes | `docs/update-api-spec` |
| `chore/` | Dependency upgrades or build tool adjustments | `chore/update-vitest` |

---

## 📝 Commit Conventions

We follow the **Conventional Commits** specification:

```text
<type>(<optional scope>): <description in imperative mood>

[optional body]
```

### Examples:
- `feat(pos): add multi-slab GST calculation to tax invoice`
- `fix(khata): resolve balance rounding discrepancy in debit ledger`
- `test(auth): add token expiry and invalid signature unit tests`
- `docs(api): document bulk product import endpoint in openapi spec`

---

## 🧪 Testing & Verification

Before opening a pull request or pushing your changes, always ensure all verification checks pass locally:

```bash
# Run automated unit and integration tests
npm test

# Run tests in interactive watch mode
npm run test:watch

# Run linter
npm run lint

# Verify optimized Next.js production build
npm run build
```

---

## 🚢 Pull Request Checklist

When submitting a pull request:
1. Ensure `npm test` passes with 0 failures.
2. Ensure `npm run lint` passes without errors.
3. Ensure `npm run build` succeeds cleanly.
4. Provide a clear PR description explaining what was changed and why.
5. If modifying database schemas, verify backward compatibility with both Cloud PostgreSQL and SQLite.
