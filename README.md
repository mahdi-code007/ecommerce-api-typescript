<div align="center">

# 🛒 Ecommerce API

### A production-minded ecommerce backend built while expanding from mobile engineering into full-stack development

[![Node.js](https://img.shields.io/badge/Node.js-20.19%2B-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-7-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-5-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Drizzle-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)

[![Status](https://img.shields.io/badge/Status-In_Development-F59E0B?style=flat-square)](#-roadmap)
[![Learning Project](https://img.shields.io/badge/Type-Learning_Project-8B5CF6?style=flat-square)](#-my-learning-journey)
[![License](https://img.shields.io/badge/License-ISC-2563EB?style=flat-square)](./package.json)

</div>

---

## ✨ Overview

This repository is the backend foundation for a complete ecommerce platform. It is being built with **Node.js, Express, TypeScript, PostgreSQL, Drizzle, and Zod**, with a focus on clean architecture, reliable validation, secure practices, and maintainable code.

The current version provides JWT authentication, role-based access for catalog writes, guest browsing of the public product catalog, a logged-in shopping cart, multiple shipping addresses with one default, cash-on-delivery checkout, order filtering and reorder, product reviews after delivery, category and product management, search, filtering, sorting, pagination, request validation, centralized error handling, duplicate detection, relationship protection, and automatic slug generation.

> [!NOTE]
> This is an active learning project. Features are added progressively as I explore backend architecture and full-stack product development.

## 🎯 My learning journey

I am a **senior mobile application engineer** specializing in **native Android** and **Flutter** development. I created this project to deepen my backend and web development experience and grow into a **full-stack engineer** capable of designing and delivering complete products from end to end.

My goal is not to build only a standalone API. I am learning how to design an entire ecommerce ecosystem and connect all of its parts:

| Product | Purpose | Status |
| --- | --- | :---: |
| ⚙️ **Backend API** | Business logic, data, validation, security, and integrations | 🚧 In progress |
| 📱 **Mobile application** | Customer-facing shopping experience built by me | 🗓️ Planned |
| 🖥️ **Admin dashboard** | Store, product, category, order, and user management | 🗓️ Planned |

## 🧩 Platform vision

```mermaid
flowchart LR
    Mobile["📱 Mobile App<br/>Android & Flutter"] --> API["⚙️ Ecommerce API<br/>Node.js & Express"]
    Dashboard["🖥️ Admin Dashboard"] --> API
    API --> Database[("🐘 PostgreSQL")]
    API --> Services["🔌 External Services<br/>Payments, Email & Storage"]
```

## 🚀 Current capabilities

- JWT authentication with register, login, current-user, profile update, password change, and account delete
- Guest browsing of the public category and product catalog
- Authenticated shopping cart with live product prices and a calculated subtotal
- Authenticated shipping addresses with one default per user
- Cash-on-delivery checkout with price snapshots and stock decrement
- Order list filtering by status, newest/oldest sort, and pagination
- Reorder a previous order back into the cart
- Product reviews after delivery that update `ratingAverage`
- Admin-only category and product create, update, and delete
- Password hashing with bcrypt
- Role-based authorization (`user` and `admin`)
- Category CRUD operations
- Product creation, listing, updating, and deletion
- Active product catalog with case-insensitive name search
- Product filtering by category, price range, and stock availability
- Product sorting by recency, price, and rating
- Category relationship validation and populated product responses
- Integer-based pricing in minor currency units
- Product stock and active-status management
- Protected category deletion when associated products exist
- Request validation with Zod
- Pagination with configurable page size
- PostgreSQL persistence through Drizzle
- Automatic category slug generation
- Centralized operational error handling
- Duplicate resource detection
- Development request logging
- TypeScript type safety
- Ready-to-import Postman collection

## 🛠️ Tech stack

| Area | Technology |
| --- | --- |
| Runtime | Node.js |
| API framework | Express 5 |
| Language | TypeScript |
| Database | PostgreSQL |
| ORM | Drizzle |
| Validation | Zod |
| Auth | JWT + bcrypt |
| Logging | Morgan |
| Development runner | TSX |

## 🏁 Getting started

### Prerequisites

- Node.js `20.19` or newer
- PostgreSQL locally or a hosted PostgreSQL database

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/mahdi-code007/ecommerce-api-typescript.git
   cd ecommerce-api-typescript
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create your local environment file:

   ```bash
   cp .env.example config.env
   ```

4. Add your PostgreSQL connection string and a long random `JWT_SECRET` to `config.env`.
5. Apply database migrations:

   ```bash
   npm run db:migrate
   ```

6. Start the development server:

   ```bash
   npm run dev
   ```

The API is available at `http://localhost:3000` by default.

## ⚙️ Environment variables

| Variable | Description | Example |
| --- | --- | --- |
| `PORT` | HTTP server port | `3000` |
| `NODE_ENV` | Runtime environment | `development` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://ecommerce_user:YOUR_PASSWORD@localhost:5432/ecommerce_db` |
| `JWT_SECRET` | Secret used to sign access tokens | a long random string |
| `JWT_EXPIRES_IN` | Access token lifetime | `7d` |

> [!IMPORTANT]
> Never commit `config.env` or any file containing real credentials. Use `.env.example` only as a safe configuration template.

## 📜 Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server with automatic reload |
| `npm run typecheck` | Check TypeScript types without emitting files |
| `npm run build` | Compile the project into `dist/` |
| `npm start` | Run the compiled production build |
| `npm run db:generate` | Generate a Drizzle migration from schema changes |
| `npm run db:migrate` | Apply pending migrations to PostgreSQL |
| `npm run db:studio` | Open Drizzle Studio |

## 🔌 API reference

Base path: `http://localhost:3000/api/v1`

Catalog **reads** are public so guests can browse without an account. Catalog **writes** require an admin JWT. Cart, address, and order requests require any logged-in user JWT. Admin order management requires an admin JWT:

```http
Authorization: Bearer <access_token>
```

New accounts are created with `role: user`. To promote an admin locally:

```sql
UPDATE users
SET role = 'admin'
WHERE email = 'you@example.com';
```

Log in again after that update so the new token includes `role: admin`.

### Auth

| Method | Endpoint | Access | Description |
| :---: | --- | --- | --- |
| `POST` | `/auth/register` | Public | Create a customer account |
| `POST` | `/auth/login` | Public | Sign in and receive a JWT |
| `GET` | `/auth/me` | Authenticated | Return the current user |
| `PATCH` | `/auth/me` | Authenticated | Update name and/or email |
| `PATCH` | `/auth/me/password` | Authenticated | Change password |
| `DELETE` | `/auth/me` | Authenticated | Delete the account after confirming the password |

`PATCH /auth/me` accepts `name` and `email` partially and rejects an empty body. Email is stored in lowercase. A taken email returns `409`. The response never includes `passwordHash`.

Change password requires `currentPassword` and `newPassword`. A wrong current password returns `401`. The new password must differ from the current one.

Delete account requires the current password. If the user has any orders, the API returns `409`. Cart and addresses are removed with the user when deletion succeeds.

### Categories

| Method | Endpoint | Access | Description |
| :---: | --- | --- | --- |
| `GET` | `/categories` | Public | List categories with pagination |
| `POST` | `/categories` | Admin | Create a category |
| `GET` | `/categories/:id` | Public | Get a category by ID |
| `PATCH` | `/categories/:id` | Admin | Update a category |
| `DELETE` | `/categories/:id` | Admin | Delete a category |

The list endpoint accepts optional `page` and `limit` query parameters. The maximum page size is `100`.

A category that still has associated products cannot be deleted. The API returns `409 Conflict` until those products are removed or reassigned.

### Products

| Method | Endpoint | Access | Description |
| :---: | --- | --- | --- |
| `GET` | `/products` | Public | Search, filter, sort, and paginate active products |
| `POST` | `/products` | Admin | Create a product linked to an existing category |
| `PATCH` | `/products/:id` | Admin | Update a product or move it to another category |
| `DELETE` | `/products/:id` | Admin | Delete a product |
| `GET` | `/products/:id/reviews` | Public | List reviews for a product |
| `POST` | `/products/:id/reviews` | Authenticated | Review a product from a delivered order |
| `PATCH` | `/products/:id/reviews/me` | Authenticated | Update the current user's review |

The public catalog returns products where `isActive` is `true` and supports these optional query parameters:

| Parameter | Description |
| --- | --- |
| `search` | Case-insensitive partial match against the product name |
| `categoryId` | Filter by category ID |
| `minPrice` | Minimum `priceInMinorUnits` |
| `maxPrice` | Maximum `priceInMinorUnits` |
| `inStock` | Use `true` for products with stock or `false` for out-of-stock products |
| `sort` | `newest`, `price_asc`, `price_desc`, or `rating_desc` |
| `page` | Page number, starting from `1` |
| `limit` | Page size from `1` to `100` |

Example:

```http
GET /api/v1/products?search=phone&categoryId=58b9c274-6727-4ad8-921e-8b235bcb69fb&minPrice=100000&maxPrice=500000&inStock=true&sort=price_asc&page=1&limit=20
```

Product prices are stored in `priceInMinorUnits` as integers—for example, `125075` represents `1250.75` in the selected currency.

Product responses populate the related category's `name` and `slug`. Rating fields are controlled by the server: they change when a customer reviews a product after a delivered order.

A customer may leave one review per product. The product must appear on one of their `delivered` orders. A second review returns `409`. Reviewing before delivery returns `403`.

Create body:

```json
{ "rating": 5, "comment": "Fast delivery and as described." }
```

`rating` is required (`1`–`5`). `comment` is optional. `PATCH /products/:id/reviews/me` accepts the same fields partially and rejects an empty body.

### Cart

A regular user token is enough. The cart is created on the first add, not on `GET`. Stock is checked so quantity cannot exceed what is available, but adding to the cart does not decrease stock.

| Method | Endpoint | Access | Description |
| :---: | --- | --- | --- |
| `GET` | `/cart` | Authenticated | Return the current user's cart, items, and `subtotal` |
| `POST` | `/cart/items` | Authenticated | Add a product, or increase quantity if it is already in the cart |
| `PATCH` | `/cart/items/:itemId` | Authenticated | Set an item quantity |
| `DELETE` | `/cart/items/:itemId` | Authenticated | Remove one item |
| `DELETE` | `/cart` | Authenticated | Clear every item |

Add and update bodies use:

```json
{ "productId": "<uuid>", "quantity": 2 }
```

`PATCH` accepts `quantity` only. If the user has never added an item, `GET /cart` returns `{ "id": null, "items": [], "subtotal": 0 }` without inserting a cart row.

Cart prices are read live from `products`. Item totals and `subtotal` use `priceInMinorUnits`. Missing or inactive products return `404`. Quantity greater than stock returns `400`. An item that does not belong to the current user's cart returns `404`.

### Addresses

A regular user token is enough. A user may save up to 10 shipping addresses. Exactly one of them is `default`. The first address becomes default automatically. `country` is stored as `SA` and is not sent by the client.

| Method | Endpoint | Access | Description |
| :---: | --- | --- | --- |
| `GET` | `/addresses` | Authenticated | List the current user's addresses, default first |
| `POST` | `/addresses` | Authenticated | Create an address |
| `GET` | `/addresses/:addressId` | Authenticated | Get one address |
| `PATCH` | `/addresses/:addressId` | Authenticated | Update an address |
| `DELETE` | `/addresses/:addressId` | Authenticated | Delete an address |
| `PATCH` | `/addresses/:addressId/default` | Authenticated | Make this address the default |

Create body example:

```json
{
  "label": "Home",
  "fullName": "Mahdi Abd El-Mageed",
  "phone": "0501234567",
  "city": "Riyadh",
  "district": "Al Olaya",
  "street": "King Fahd Road",
  "building": "12",
  "notes": "Gate 2",
  "isDefault": true
}
```

`fullName`, `phone`, `city`, `district`, and `street` are required on create. `label`, `building`, `notes`, and `isDefault` are optional. Phone must be a Saudi number: `05XXXXXXXX` or `+9665XXXXXXXX`. `PATCH` accepts the same fields partially and rejects an empty body.

An address that does not belong to the current user returns `404`. Deleting the default promotes the oldest remaining address. Checkout copies the address onto the order, so deleting it later does not change past orders.

### Orders

Checkout turns the current cart into an order in one database transaction: it snapshots product prices and the shipping address, decrements stock, and clears cart items. Payment is cash on delivery only. A payment gateway is not implemented yet.

A regular user token is enough for the customer endpoints. The first address or any owned `addressId` can be used.

| Method | Endpoint | Access | Description |
| :---: | --- | --- | --- |
| `POST` | `/orders` | Authenticated | Place an order from the cart |
| `GET` | `/orders` | Authenticated | List the current user's orders |
| `GET` | `/orders/:orderId` | Authenticated | Get one of the current user's orders |
| `PATCH` | `/orders/:orderId/cancel` | Authenticated | Cancel a `pending` order and restock |
| `POST` | `/orders/:orderId/reorder` | Authenticated | Add the order's products back to the cart |
| `GET` | `/admin/orders` | Admin | List all orders |
| `GET` | `/admin/orders/:orderId` | Admin | Get any order |
| `PATCH` | `/admin/orders/:orderId/status` | Admin | Move the order to the next allowed status |

Checkout body:

```json
{ "addressId": "<uuid>" }
```

Admin status body:

```json
{ "status": "confirmed" }
```

Allowed status flow: `pending → confirmed → shipped → delivered`. `pending` can be cancelled by the customer or an admin. `confirmed` can be cancelled by an admin. `shipped` and `delivered` cannot be cancelled. Delivered orders set `paymentStatus` to `paid`.

`GET /orders` and `GET /admin/orders` accept:

| Parameter | Description |
| --- | --- |
| `status` | Optional: `pending`, `confirmed`, `shipped`, `delivered`, or `cancelled` |
| `sort` | `newest` (default) or `oldest` |
| `page` | Page number, starting from `1` |
| `limit` | Page size from `1` to `100` |

Example:

```http
GET /api/v1/orders?status=pending&sort=oldest&page=1&limit=10
```

`POST /orders/:orderId/reorder` copies products into the cart at live prices. Unavailable or out-of-stock items are listed in `skipped`. If nothing can be added, the API returns `400`. Checkout is still a separate `POST /orders`.

Empty cart returns `400`. An address that is not the current user's returns `404`. Inactive products or quantity above stock return `400` and leave the cart unchanged. Another user's order returns `404`.

## 🗂️ Project structure

The API is organized by **layer**, not by feature. Each request walks the same path: route → middleware → controller → repository → PostgreSQL.

```text
.
├── config/          # Database and application configuration
├── controllers/     # HTTP decisions: status codes and response shape
├── db/
│   ├── schema/      # Drizzle table definitions
│   └── repositories/# SQL only — no 401/403 decisions
├── drizzle/         # Generated SQL migrations
├── middlewares/     # Auth, roles, and Zod validation
├── postman/         # Postman API collection
├── routes/          # URL → middleware → controller wiring
├── schemas/         # Zod request contracts
├── types/           # TypeScript declaration extensions
├── utils/           # JWT, password hashing, AppError
├── app.ts           # Express app, mounts, global error handler
└── server.ts        # Loads config.env, connects DB, listens
```

## 🧠 Architecture map

### Layers and features

```mermaid
mindmap
  root((Ecommerce API))
    Entry
      server.ts
      app.ts
      config.env
    Features
      Auth
      Categories
      Products
      Cart
      Addresses
      Orders
      Reviews
    HTTP
      routes
      protect
      restrictTo
      Zod schemas
      controllers
    Data
      repositories
      Drizzle schema
      PostgreSQL
    Shared
      JWT
      bcrypt
      AppError
```

### How a request moves

`server.ts` boots the process. `app.ts` mounts `/api/v1/*` and the global error handler. Controllers never write SQL. Repositories never return `401`.

```mermaid
flowchart TB
  Client["Client / Postman / Flutter"] --> Server["server.ts"]
  Server --> App["app.ts"]
  App --> Routes["routes/"]
  Routes --> AuthMW["protect / restrictTo"]
  AuthMW --> Zod["validate + schemas/"]
  Zod --> Controller["controllers/"]
  Controller --> Repo["db/repositories/"]
  Repo --> Schema["db/schema/"]
  Schema --> PG[("PostgreSQL")]
  Controller --> JSON["JSON response"]
  AuthMW -.->|"401 / 403"| Errors["AppError"]
  Zod -.->|"400"| Errors
  Controller -.->|"404 / 409"| Errors
  Repo -.->|"DB constraint"| Errors
  Errors --> Handler["global error handler"]
  Handler --> JSON
```

Example: add a product to the cart.

```mermaid
sequenceDiagram
  participant Client
  participant Routes as cartRoutes
  participant Protect as protect
  participant Zod as validate
  participant Ctrl as cartController
  participant Repo as cartRepository
  participant DB as PostgreSQL

  Client->>Routes: POST /api/v1/cart/items
  Routes->>Protect: Authorization Bearer JWT
  Protect->>DB: load user by token.sub
  Protect-->>Routes: req.user
  Routes->>Zod: body productId + quantity
  Zod-->>Ctrl: req.validated
  Ctrl->>Repo: find product, get or create cart
  Repo->>DB: SELECT / INSERT
  Ctrl->>Repo: insert or increment item
  Repo->>DB: write cart_items
  Ctrl-->>Client: 201 cart + live subtotal
```

### Data relationships

One user has one cart, many shipping addresses, and many orders. Cart items use live product prices. Checkout snapshots price and address onto the order, then decrements stock. One address per user is `default`. A user may leave one review per product after a delivered order.

```mermaid
erDiagram
  USERS ||--o| CARTS : "one cart"
  USERS ||--o{ ADDRESSES : "up to 10"
  USERS ||--o{ ORDERS : places
  USERS ||--o{ REVIEWS : writes
  PRODUCTS ||--o{ REVIEWS : receives
  CARTS ||--o{ CART_ITEMS : contains
  PRODUCTS ||--o{ CART_ITEMS : "live price"
  ORDERS ||--o{ ORDER_ITEMS : contains
  PRODUCTS ||--o{ ORDER_ITEMS : "price snapshot"
  CATEGORIES ||--o{ PRODUCTS : groups
  USERS {
    uuid id PK
    string email
    string role
  }
  CARTS {
    uuid id PK
    uuid user_id UK
  }
  CART_ITEMS {
    uuid id PK
    uuid cart_id FK
    uuid product_id FK
    int quantity
  }
  ADDRESSES {
    uuid id PK
    uuid user_id FK
    string phone
    boolean isDefault
  }
  ORDERS {
    uuid id PK
    uuid user_id FK
    string status
    string paymentMethod
    int total
  }
  ORDER_ITEMS {
    uuid id PK
    uuid order_id FK
    uuid product_id FK
    int unitPriceInMinorUnits
    int quantity
  }
  PRODUCTS {
    uuid id PK
    int priceInMinorUnits
    int stock
    boolean isActive
    float ratingAverage
    int ratingsCount
  }
  REVIEWS {
    uuid id PK
    uuid user_id FK
    uuid product_id FK
    int rating
  }
  CATEGORIES {
    uuid id PK
    string name
    string slug
  }
```

### Who can call what

```mermaid
flowchart LR
  Guest["Guest"] --> Public["Public reads"]
  User["Logged-in user"] --> Public
  User --> CartAPI["Cart APIs"]
  User --> AddressAPI["Address APIs"]
  User --> OrderAPI["Order APIs"]
  User --> Me["GET /auth/me"]
  User --> Reviews["POST product reviews"]
  Admin["Admin"] --> Public
  Admin --> CartAPI
  Admin --> AddressAPI
  Admin --> OrderAPI
  Admin --> AdminOrders["Admin order APIs"]
  Admin --> Writes["Category and product writes"]

  Public --> Catalog["GET /categories<br/>GET /products<br/>GET product reviews"]
  CartAPI --> CartTables["carts + cart_items"]
  AddressAPI --> AddressTable["addresses"]
  OrderAPI --> OrderTables["orders + order_items"]
  AdminOrders --> OrderTables
  Writes --> CatalogTables["categories + products"]
```

Flutter mapping: `Page / Cubit` ≈ controller, `Repository` ≈ `db/repositories`, `Model` ≈ Drizzle schema + Zod, `core` interceptors ≈ `protect` and `validate`.

## 🧭 Roadmap

- [x] Project foundation and TypeScript setup
- [x] Category management
- [x] Product catalog foundation
- [x] Product search, filtering, sorting, and pagination
- [x] Product-to-category relationships
- [x] Validation and centralized error handling
- [x] Authentication and authorization
- [x] Shopping cart
- [x] Shipping addresses
- [x] COD checkout and order status
- [x] User profile management
- [ ] Brands and subcategories
- [ ] Product variants and advanced inventory
- [ ] Product image upload and storage
- [ ] Wishlist
- [ ] Coupons and promotions
- [ ] Payment gateway integration
- [x] Reviews and ratings
- [ ] File and image storage
- [ ] Automated testing
- [ ] API documentation
- [ ] Deployment and continuous integration
- [ ] Mobile application integration
- [ ] Admin dashboard integration

## 🧪 Explore with Postman

Import [`postman/Ecommerce-API.postman_collection.json`](./postman/Ecommerce-API.postman_collection.json) into Postman to explore Auth, catalog, Cart, Addresses, Orders, and Reviews requests. Customer examples use `{{token}}` from `Login`. Admin order status updates need an admin token.

---

<div align="center">

### Built as part of my journey from senior mobile engineer to full-stack engineer

**Native Android · Flutter · Backend · Full Stack**

</div>
