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

The current version provides JWT authentication, role-based access for catalog writes, guest browsing of the public product catalog, category subcategories and brands, a logged-in shopping cart, wishlist and favorites, multiple shipping addresses with one default, cash-on-delivery checkout with optional discount codes, order filtering and reorder, product reviews after delivery, category and product management, search, filtering, sorting, pagination, request validation, centralized error handling, duplicate detection, relationship protection, and automatic slug generation.

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
- Authenticated wishlist and favorites with live product prices (up to 50 items each)
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
| `CORS_ORIGIN` | Allowed browser origin | `http://localhost:3001` |
| `UPLOADS_DIR` | Local directory for uploaded product images | `uploads` |

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

Categories support one level of subcategories via optional `parentId`. Root categories have `parentId: null`. Subcategories must be created under a root category. Products may link to either a root category or a subcategory.

| Method | Endpoint | Access | Description |
| :---: | --- | --- | --- |
| `GET` | `/categories` | Public | List categories with pagination |
| `POST` | `/categories` | Admin | Create a root category or subcategory |
| `GET` | `/categories/:id` | Public | Get a category with `parent` and `subcategories` |
| `PATCH` | `/categories/:id` | Admin | Update a category |
| `DELETE` | `/categories/:id` | Admin | Delete a category |

List query parameters:

| Parameter | Description |
| --- | --- |
| `page` / `limit` | Pagination (max `limit` 100) |
| `rootsOnly=true` | Root categories only |
| `parentId=<uuid>` | Direct subcategories of a root category |

Create root category:

```json
{
  "name": "Electronics",
  "description": "Electronic devices"
}
```

Create subcategory:

```json
{
  "name": "Phones",
  "parentId": "<root-category-uuid>"
}
```

A category cannot be deleted while it has subcategories or associated products. The API returns `409 Conflict`.

### Brands

| Method | Endpoint | Access | Description |
| :---: | --- | --- | --- |
| `GET` | `/brands` | Public | List brands with pagination |
| `GET` | `/brands/:id` | Public | Get a brand by ID |
| `POST` | `/brands` | Admin | Create a brand |
| `PATCH` | `/brands/:id` | Admin | Update a brand |
| `DELETE` | `/brands/:id` | Admin | Delete a brand |

Create body:

```json
{
  "name": "Samsung",
  "logo": "https://example.com/brands/samsung.png"
}
```

A brand with associated products cannot be deleted. The API returns `409 Conflict`.

### Products

Products are either `simple` or `variable`. Simple products keep price and stock on the product row (the previous behavior). Variable products are not purchased directly: each variant has its own price, stock, and optional SKU. Wishlist, favorites, reviews, and product-scoped coupons stay on the parent product.

| Method | Endpoint | Access | Description |
| :---: | --- | --- | --- |
| `GET` | `/products` | Public | Search, filter, sort, and paginate active products |
| `GET` | `/products/:id` | Public | Get one active product; includes `images` and, for variable products, `variants` |
| `GET` | `/admin/products` | Admin | List all products, including inactive |
| `POST` | `/products` | Admin | Create a simple or variable product |
| `PATCH` | `/products/:id` | Admin | Update a product (not variant price/stock) |
| `DELETE` | `/products/:id` | Admin | Delete a product |
| `POST` | `/products/:id/images` | Admin | Upload a jpeg, png, or webp image |
| `PATCH` | `/products/:id/images/:imageId` | Admin | Set primary image or change position |
| `DELETE` | `/products/:id/images/:imageId` | Admin | Delete an uploaded image |
| `POST` | `/products/:id/variants` | Admin | Add a variant |
| `PATCH` | `/products/:id/variants/:variantId` | Admin | Update variant price, stock, SKU, or `isActive` |
| `DELETE` | `/products/:id/variants/:variantId` | Admin | Delete a variant if unused |
| `GET` | `/products/:id/reviews` | Public | List reviews for a product |
| `POST` | `/products/:id/reviews` | Authenticated | Review a product from a delivered order |
| `PATCH` | `/products/:id/reviews/me` | Authenticated | Update the current user's review |

The public catalog returns products where `isActive` is `true` and supports these optional query parameters:

| Parameter | Description |
| --- | --- |
| `search` | Case-insensitive partial match against the product name |
| `categoryId` | Filter by category ID. When the ID is a root category, products in its direct subcategories are included |
| `brandId` | Filter by brand ID |
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

For a variable product, catalog `priceInMinorUnits` is the lowest active variant price, `priceMaxInMinorUnits` is the highest, and `stock` is the sum of active variant stock. List responses include option names/values and set `variants` to `null`. `GET /products/:id` returns the full variant list for the product page.

Simple create body:

```json
{
  "name": "Coffee mug",
  "priceInMinorUnits": 2500,
  "stock": 20,
  "categoryId": "<uuid>"
}
```

Variable create body:

```json
{
  "name": "Galaxy Phone",
  "productType": "variable",
  "categoryId": "<uuid>",
  "options": [
    { "name": "Color", "values": ["Black", "Blue"] },
    { "name": "Storage", "values": ["128GB", "256GB"] }
  ],
  "variants": [
    {
      "optionValues": { "Color": "Black", "Storage": "128GB" },
      "priceInMinorUnits": 25000,
      "stock": 5,
      "sku": "GAL-BLK-128"
    }
  ]
}
```

A variable product may have up to 3 options, 20 values per option, and 100 variants. Deleting a variant that appears on an order returns `409`; deactivate it instead. A variable product must keep at least one variant.

Create the product as JSON first, then upload images with `POST /products/:id/images` as `multipart/form-data` (field name `image`). Allowed types are jpeg, png, and webp. Each file may be at most 2MB. A product may have up to 9 uploaded images. The first upload becomes primary. Files are stored under `uploads/` and served publicly at `/uploads/...`.

List responses set `images` to `null` and keep `image` as the primary URL (uploaded path or optional external URL). `GET /products/:id` returns the gallery. After any upload exists, `PATCH /products/:id` with an `image` URL returns `400`; use the nested image routes instead. Deleting a product also deletes its files from disk.

Product responses populate the related category (`id`, `name`, `slug`, `parentId`) and optional brand (`id`, `name`, `slug`, or `null`). Rating fields are controlled by the server: they change when a customer reviews a product after a delivered order.

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
{ "productId": "<uuid>", "quantity": 2, "variantId": "<uuid>" }
```

`variantId` is required for variable products and forbidden for simple products. `PATCH` accepts `quantity` only. If the user has never added an item, `GET /cart` returns `{ "id": null, "items": [], "subtotal": 0 }` without inserting a cart row.

Cart prices are read live from the product (simple) or the variant (variable). Item totals and `subtotal` use `priceInMinorUnits`. Missing or inactive products/variants return `404`. Quantity greater than stock returns `400`. An item that does not belong to the current user's cart returns `404`.

### Wishlist

A regular user token is enough. Save products for later with live prices. A user may store up to 50 wishlist items. The same product can also be in favorites.

| Method | Endpoint | Access | Description |
| :---: | --- | --- | --- |
| `GET` | `/wishlist` | Authenticated | List the current user's wishlist, newest first |
| `POST` | `/wishlist/items` | Authenticated | Add a product |
| `DELETE` | `/wishlist/items/:productId` | Authenticated | Remove a product |

Add body:

```json
{ "productId": "<uuid>" }
```

Missing or inactive products return `404`. A duplicate add returns `409`. More than 50 items returns `400`. Removing an item that is not in the list returns `404`. An empty list returns `{ "items": [] }`.

### Favorites

Same rules as wishlist, but stored separately. A product may appear in both lists.

| Method | Endpoint | Access | Description |
| :---: | --- | --- | --- |
| `GET` | `/favorites` | Authenticated | List the current user's favorites, newest first |
| `POST` | `/favorites/items` | Authenticated | Add a product |
| `DELETE` | `/favorites/items/:productId` | Authenticated | Remove a product |

Add body:

```json
{ "productId": "<uuid>" }
```

Duplicate add returns `409` with `Product already in favorites`. Other errors match wishlist behavior.

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

### Coupons

Discount codes work like Shopify or WooCommerce: one code per order, validated server-side at checkout. Prices stay in `priceInMinorUnits`. Automatic promotions are not implemented yet.

| Method | Endpoint | Access | Description |
| :---: | --- | --- | --- |
| `POST` | `/coupons/validate` | Authenticated | Preview a code against the current cart |
| `GET` | `/admin/coupons` | Admin | List coupons with pagination |
| `POST` | `/admin/coupons` | Admin | Create a coupon |
| `GET` | `/admin/coupons/:couponId` | Admin | Get one coupon |
| `PATCH` | `/admin/coupons/:couponId` | Admin | Update a coupon |
| `DELETE` | `/admin/coupons/:couponId` | Admin | Delete if never used, else `409` |

Validate body:

```json
{ "code": "SAVE20" }
```

Validate response:

```json
{
  "coupon": {
    "code": "SAVE20",
    "name": "20% off",
    "discountType": "percentage",
    "discountValue": 20
  },
  "subtotal": 25000,
  "eligibleSubtotal": 25000,
  "discountAmount": 5000,
  "total": 20000
}
```

Admin create example (percentage with cap):

```json
{
  "code": "SAVE20",
  "name": "20% off",
  "discountType": "percentage",
  "discountValue": 20,
  "maxDiscountAmount": 5000,
  "minOrderAmount": 10000,
  "usageLimit": 1000,
  "usageLimitPerUser": 1,
  "scope": "all"
}
```

Discount types: `fixed_amount` (minor units) or `percentage` (1–100). `maxDiscountAmount` applies only to percentage discounts. Scope: `all`, `category` (requires `categoryIds`), or `product` (requires `productIds`). Codes are stored uppercase. A coupon scoped to a root category also applies to products in its direct subcategories.

Common errors: invalid or inactive code → `404`; expired, usage limit, minimum order, or no eligible cart items → `400`.

### Orders

Checkout turns the current cart into an order in one database transaction: it snapshots product prices and the shipping address, applies an optional coupon, decrements stock, and clears cart items. Payment is cash on delivery only. A payment gateway is not implemented yet.

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
{
  "addressId": "<uuid>",
  "couponCode": "SAVE20"
}
```

`couponCode` is optional. Order responses include `subtotal` (before discount), `discountAmount`, `total` (after discount), and a `couponCode` snapshot when a code was applied. Cancelling a pending order removes coupon usage and restores `timesUsed`.

Admin status body:

```json
{ "status": "confirmed" }
```

Allowed status flow: `pending → confirmed → shipped → delivered`. `pending` can be cancelled by the customer or an admin. `confirmed` can be cancelled by an admin. `shipped` and `delivered` cannot be cancelled. Delivered orders set `paymentStatus` to `paid`.

### Admin stats

Dashboard aggregates run in PostgreSQL. The admin UI should not fetch every order and reduce it in the browser. Money stays in minor units. Revenue, AOV, discounts, top products, cities, and coupons **exclude cancelled** orders. The status donut includes cancelled.

| Method | Endpoint | Access | Description |
| :---: | --- | --- | --- |
| `GET` | `/admin/stats/overview` | Admin | KPI cards, time series, breakdowns, and top lists |
| `GET` | `/admin/products` | Admin | Catalog list including inactive products |

`GET /products` remains the public catalog and still returns only `isActive = true` products. Create, update, and delete stay on `/products`.

Overview query parameters:

| Parameter | Description |
| --- | --- |
| `range` | `7d`, `30d` (default), or `90d` |
| `from` / `to` | Optional `YYYY-MM-DD` pair that overrides `range`. Inclusive calendar days. Max 366 days |
| `timezone` | IANA timezone, default `Asia/Riyadh` |
| `lowStockThreshold` | Default `5` |
| `topLimit` | Default `5`, max `20` |

`range=30d` is the last 30 calendar days including today in that timezone. When `from` and `to` are sent, the response `range` is `null`. `pendingOrdersCount` is the current pending queue, not limited to the date window. Daily buckets are used for windows of 90 days or less; longer windows use ISO weeks (Monday). Missing days are zero-filled. An empty store still returns zeros and empty arrays.

Admin product list query: `page`, `limit`, `search`, `isActive`, `inStock`, `categoryId`, `brandId`, `sort` (`newest`, `oldest`, `stock_asc`, `stock_desc`, `name_asc`). Omit `isActive` to include both active and inactive products.

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

Customer order responses (`GET /orders` and `GET /orders/:orderId`) enrich each item with review context for the logged-in user:

| Field | Meaning |
| --- | --- |
| `canReview` | `true` when the order is `delivered` and the user has not reviewed this product yet |
| `hasReviewed` | `true` when the user already has a review for this product |
| `review` | The user's review (`id`, `rating`, `comment`, timestamps) or `null` |

Use `canReview` to show a new review button. Use `hasReviewed` and `review` to show the existing rating and an edit action (`PATCH /products/:id/reviews/me`). Admin order responses do not include these fields.

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
      Wishlist
      Favorites
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
  USERS ||--o{ WISHLIST_ITEMS : saves
  USERS ||--o{ FAVORITE_ITEMS : likes
  PRODUCTS ||--o{ WISHLIST_ITEMS : listed
  PRODUCTS ||--o{ FAVORITE_ITEMS : listed
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
  User --> WishlistAPI["Wishlist APIs"]
  User --> FavoritesAPI["Favorites APIs"]
  User --> AddressAPI["Address APIs"]
  User --> OrderAPI["Order APIs"]
  User --> CouponAPI["Coupon validate"]
  User --> Me["GET /auth/me"]
  User --> Reviews["POST product reviews"]
  Admin["Admin"] --> Public
  Admin --> CartAPI
  Admin --> WishlistAPI
  Admin --> FavoritesAPI
  Admin --> AddressAPI
  Admin --> OrderAPI
  Admin --> AdminOrders["Admin order APIs"]
  Admin --> AdminCoupons["Admin coupon APIs"]
  Admin --> AdminStats["Admin stats APIs"]
  Admin --> Writes["Category and product writes"]

  Public --> Catalog["GET /categories<br/>GET /products<br/>GET product reviews"]
  CartAPI --> CartTables["carts + cart_items"]
  WishlistAPI --> WishlistTable["wishlist_items"]
  FavoritesAPI --> FavoritesTable["favorite_items"]
  AddressAPI --> AddressTable["addresses"]
  OrderAPI --> OrderTables["orders + order_items"]
  CouponAPI --> CouponTables["coupons + coupon_usages"]
  AdminCoupons --> CouponTables
  AdminOrders --> OrderTables
  AdminStats --> OrderTables
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
- [x] Brands and subcategories
- [x] Product variants and advanced inventory
- [x] Product image upload and storage
- [x] Wishlist
- [x] Coupons and promotions
- [ ] Payment gateway integration
- [x] Reviews and ratings
- [ ] File and image storage
- [ ] Automated testing
- [ ] API documentation
- [ ] Deployment and continuous integration
- [ ] Mobile application integration
- [x] Admin dashboard integration

## 🧪 Explore with Postman

Import [`postman/Ecommerce-API.postman_collection.json`](./postman/Ecommerce-API.postman_collection.json) into Postman to explore Auth, catalog, Brands, Cart, Wishlist, Favorites, Coupons, Addresses, Orders, and Reviews requests. Customer examples use `{{token}}` from `Login`. Admin catalog, coupon, and order status updates need an admin token.

---

<div align="center">

### Built as part of my journey from senior mobile engineer to full-stack engineer

**Native Android · Flutter · Backend · Full Stack**

</div>
