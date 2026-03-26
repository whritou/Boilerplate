
# Next.js E-Commerce Boilerplate

A production-ready full-stack boilerplate built with **Next.js 16**, **TypeScript**, **Prisma**, **NextAuth**, **Stripe**, and **shadcn/ui**. It ships with a complete e-commerce domain (products, cart, orders, payments), a layered backend architecture, and 55+ tests — ready to clone and build on.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Database | PostgreSQL + Prisma ORM |
| Auth | NextAuth v4 (Credentials + OAuth) |
| Payments | Stripe (PaymentIntents + Checkout + Webhooks) |
| UI | shadcn/ui + Radix UI + Tailwind CSS v4 |
| Animation | Motion (Framer Motion v12) |
| State | Zustand 5 |
| Validation | Zod v4 |
| Email | Nodemailer |
| Testing | Vitest + Testing Library |
| Deployment | Vercel (Analytics + Speed Insights) |

---

## Architecture

The backend follows a clean layered architecture: **Route Handler → Middleware → Service → Repository → Prisma**. Each layer has a single responsibility and is independently testable.

```
src/
├── app/                    # Next.js App Router pages & API routes
├── services/               # Business logic (auth, cart, order, payment, product, mail, user)
├── repositories/           # Data access layer (base + domain-specific)
├── middlewares/            # withValidation, withErrorHandler, rateLimit
├── stores/                 # Zustand client state (cart, order, product, CRUD factory)
├── hooks/                  # Custom React hooks
├── validations/            # Zod schemas for every domain
├── providers/              # AuthProvider, ThemeProvider
├── utils/                  # apiResponse, errors, http, mail, token helpers
├── lib/                    # Stripe client, Prisma client, QueryBuilder
└── __tests__/              # Unit, integration, API, and performance tests
```

### Repository Pattern + QueryBuilder

All repositories extend a generic `BaseRepository<T, CreateDTO, UpdateDTO>` that provides:

- Paginated `findMany` with filtering, sorting, search, and relation includes
- `softDelete` / `hardDelete` / `restore` with automatic `deletedAt` exclusion
- `upsert`, `exists`, `count`, `transaction` helpers
- A `QueryBuilder` that translates query params (`?sort=price&order=asc&page=2`) into typed Prisma arguments

Domain repositories extend the base with custom methods (e.g. `findByStripePaymentIntentId`, `findExpiredUnpaid`, `findWithDetails`).

---

## Authentication (NextAuth)

Authentication is handled by NextAuth v4 with the Prisma adapter, extended with a custom `AuthService`:

- **Credentials login** with bcrypt password hashing
- **OAuth** provider support (Google, GitHub, etc.) via the Prisma account adapter
- **Email verification** — generates a SHA-256 hashed token, stores it in `VerificationToken`, sends an email link, and marks the account verified on click
- **Password reset** — same token flow with a 15-minute TTL
- **Role-based access** — `USER` and `ADMIN` roles stored on the `User` model, propagated to the JWT and accessible via `useSession`
- **Session JWT** — signed with `NEXTAUTH_SECRET`, 30-day expiry, `httpOnly` + `secure` + `SameSite=lax` cookie

```ts
// Custom session type extension (next-auth.d.ts)
interface Session {
  user: { id: string; role: UserRole; ... }
}
```

---

## Products

- Full CRUD with soft-delete (`deletedAt`) and archive flag (`isArchived`)
- Stock management — quantity tracked per product
- QueryBuilder-powered listing: filter by name/price, sort, paginate, search
- `ProductService` validates existence and active status before cart/order operations

---

## Cart

- Per-user server-side cart stored in PostgreSQL (`Cart` + `CartItem`)
- Cart items capture price at time of addition (price snapshot)
- `CartService` validates stock before adding items
- Client-side `cart.store.ts` (Zustand) mirrors server state and provides optimistic updates

---

## Orders

The `OrderService` implements the full order lifecycle:

| Step | Detail |
|---|---|
| **Create from cart** | Validates stock, snapshots item prices, decrements inventory, clears cart, sets 15-minute expiry |
| **Shipping address** | Owner-only update on `pending` orders; required before payment |
| **Auto-expiry** | Orders not paid within 15 minutes are automatically expired — stock is restored and the Stripe PaymentIntent is cancelled |
| **User cancel** | Restores stock + cancels Stripe PaymentIntent |
| **Admin refund** | Issues full Stripe refund with idempotency key, updates DB atomically (`$transaction`), restores stock, sends refund email |
| **Batch cleanup** | `cancelAllExpired()` designed for a cron job |

Order statuses: `pending → confirmed → shipped → delivered` (or `canceled` / `expired`).

---

## Stripe Integration

Two payment flows are supported side-by-side:

### 1. Embedded Payment (Stripe Elements)

```
POST /api/payments/intent  →  createPaymentIntent(orderId)
                           →  returns { clientSecret }
                           →  <PaymentElement> renders in-page form
```

- Creates a `PaymentIntent` via the Stripe API and stores the intent ID on the order
- Reuses the existing intent if it is still active (avoids duplicates)
- `syncPaymentStatus(orderId)` polls the intent status after the user returns — handles the case where webhooks have not fired yet

### 2. Hosted Checkout (Stripe Checkout Sessions)

```
POST /api/payments/checkout  →  createCheckoutSession(orderId, successUrl, cancelUrl)
                             →  redirects user to Stripe-hosted page
```

### Webhooks

A dedicated webhook handler at `/api/webhooks/stripe` processes:

- `payment_intent.succeeded` — confirms the order, records the payment
- `payment_intent.payment_failed` — marks payment as failed
- `checkout.session.completed` — handles hosted checkout completion

The handler verifies the Stripe signature, validates the paid amount against the order total (tamper prevention), and is fully idempotent (duplicate events are safely skipped).

```ts
// Amount validation in handleStripeWebhook
if (amountReceived !== Math.round(order.totalPrice * 100)) {
  throw new BadRequestError('Payment amount does not match order total')
}
```

### Payment statuses (mirrored from Stripe)

`requires_payment_method → requires_confirmation → requires_action → processing → requires_capture → succeeded → canceled → refunded`

---

## Middleware

Three composable middleware wrappers used in API route handlers:

- **`withValidation(schema)`** — parses the request body with a Zod schema and returns `400` on failure; passes validated data to the handler with full type inference
- **`withErrorHandler(handler)`** — catches `NotFoundError`, `BadRequestError`, `ForbiddenError`, `UnauthorizedError`, and unexpected errors; maps them to the correct HTTP status via `ApiResponse`
- **`rateLimit`** — in-memory sliding window rate limiter keyed by IP

---

## shadcn/ui & UI Components

The project uses **shadcn/ui** as the component foundation:

- Components live in `src/components/ui/` and are owned by the project (not a black-box dependency)
- Theming via `next-themes` (light/dark mode, system preference)
- Custom primitives: `DataState` (loading/empty/error states), `FormPrimitives` (label + input wrappers), `MotionSkeleton` (animated loading skeletons with Framer Motion)
- Tailwind CSS v4 with PostCSS and `prettier-plugin-tailwindcss` for consistent class ordering

---

## State Management (Zustand)

Three domain stores and a generic factory:

- **`cart.store`** — cart items, add/remove/update quantity, total price
- **`order.store`** — user orders list, current order
- **`product.store`** — product list with filtering state
- **`createCRUD.store`** — generic factory that produces a typed CRUD store for any resource; used to avoid boilerplate across admin views

Custom hooks `useProduct` and `useOrder` encapsulate store selection + data fetching logic.

---

## Email (Nodemailer)

`MailService` sends transactional emails via Nodemailer (SMTP-compatible):

- Email verification link
- Password reset link
- Order refund notification

Templates are plain-text/HTML strings; the service is injected into services that need it and is mocked in tests.

---

## Tests

**55+ tests** organized into four categories:

### Unit tests (`src/__tests__/unit/`)
- All Zod validation schemas (`auth`, `cart`, `cartItem`, `order`, `orderItem`, `payment`, `product`)
- Utility functions (`apiResponse`, `errors`, `http`, `orderStatus`, `parsePgArray`)
- Middleware (`withValidation`, `withErrorHandler`, `rateLimit`)
- Repository logic (`base`, `product`, `order`, `cart`)
- Zustand stores (`cart.store`, `crud.store`)
- React hooks (`useCountdown`, `useDebouncedValue`)
- QueryBuilder + parseQueryParams

### Integration tests (`src/__tests__/integration/`)
- `AuthService` — token creation, verification, expiry, password reset
- `UserService` — create, update, role management
- `ProductService` — CRUD, soft delete, archive, stock
- `CartService` — add/remove items, stock validation, price snapshot
- `OrderService` — full lifecycle: create from cart, expiry, cancel, refund
- `PaymentService` — PaymentIntent creation, sync, webhook handling, amount validation
- `MailService` — transport calls are mocked; content and recipient are verified

### API tests (`src/__tests__/api/`)
Route-level tests using mocked services to verify HTTP contracts:
- `auth` (register, login, verify email, reset password)
- `products` + `products/:id`
- `cart` + `cart-items`
- `orders` + `orders/:id` + `orders/:id/status` + `orders/:id/cancel` + `orders/:id/refund` + `orders/:id/sync` + `orders/cleanup`
- `payments`
- `users`
- `webhook-stripe`

### Performance tests (`src/__tests__/perf/`)
- QueryBuilder throughput under load
- Validation schema parse speed
- CRUD store operations
- Product listing performance

```bash
npm test              # run all tests
npm run test:coverage # with coverage report
npm run test:watch    # watch mode
```

---

## Database Schema

```
User ──< Order ──< OrderItem >── Product
                └── Payment
User ──< Cart  ──< CartItem  >── Product
User ──< Account (OAuth)
User ──< Session (NextAuth)
VerificationToken
```

Key design decisions:
- Prices are snapshotted on `CartItem` and `OrderItem` at time of action (not fetched live)
- `Order` stores `stripePaymentIntentId` for webhook correlation and `expiresAt` for TTL enforcement
- `Payment` stores `stripeRefundId` for refund audit trail
- Soft delete on `Product` via `deletedAt`; `isArchived` for catalogue visibility

---

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
# Fill in DATABASE_URL, DIRECT_URL, NEXTAUTH_SECRET, STRIPE_SECRET_KEY,
# STRIPE_WEBHOOK_SECRET, SMTP_* variables

# 3. Run migrations and generate Prisma client
npm run db:migrate

# 4. (Optional) seed the database
npm run db:seed

# 5. Start the dev server
npm run dev
```

### Environment variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | Pooled PostgreSQL connection string |
| `DIRECT_URL` | Direct connection (for migrations) |
| `NEXTAUTH_SECRET` | Secret for JWT signing |
| `NEXTAUTH_URL` | Public app URL |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | Mail transport |

---

## Scripts

```bash
npm run dev            # Next.js dev server (Turbopack)
npm run build          # Production build
npm run lint           # ESLint
npm run typecheck      # TypeScript type check
npm run format         # Prettier
npm test               # Run all tests
npm run test:coverage  # Coverage report
npm run db:migrate     # Run Prisma migrations (dev)
npm run db:migrate:prod # Deploy migrations (CI/CD)
npm run db:studio      # Prisma Studio
npm run db:seed        # Seed the database
```

---

## License

MIT
