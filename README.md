# Ecommerce API

A RESTful ecommerce API built with Node.js, Express, TypeScript, MongoDB, Mongoose, and Zod.

The current version provides category management with validation, pagination, centralized error handling, and automatic slug generation.

## Tech stack

- Node.js and Express 5
- TypeScript
- MongoDB and Mongoose
- Zod request validation
- Morgan request logging

## Requirements

- Node.js 20.19 or newer
- MongoDB, either locally or through MongoDB Atlas

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the example environment file:

   ```bash
   cp .env.example config.env
   ```

3. Update `DATABASE_URI` in `config.env` with your MongoDB connection string.

4. Start the development server:

   ```bash
   npm run dev
   ```

The API runs on `http://localhost:3000` by default.

## Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server with automatic reload |
| `npm run typecheck` | Check TypeScript types without emitting files |
| `npm run build` | Compile the project into `dist/` |
| `npm start` | Run the compiled production build |

## Category endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/v1/categories` | List categories with pagination |
| `POST` | `/api/v1/categories` | Create a category |
| `GET` | `/api/v1/categories/:id` | Get one category |
| `PATCH` | `/api/v1/categories/:id` | Update a category |
| `DELETE` | `/api/v1/categories/:id` | Delete a category |

Pagination uses the optional `page` and `limit` query parameters. The maximum page size is 100.

## API collection

Import `postman/Ecommerce-API.postman_collection.json` into Postman to explore the API requests.

## Environment variables

| Variable | Description | Example |
| --- | --- | --- |
| `PORT` | HTTP server port | `3000` |
| `NODE_ENV` | Runtime environment | `development` |
| `DATABASE_URI` | MongoDB connection string | `mongodb://127.0.0.1:27017/ecommerce` |

Never commit `config.env` or any file containing real credentials.
