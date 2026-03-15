# eShop

A layered TypeScript e-commerce web application with server-rendered UI (Express + EJS) and PostgreSQL persistence.

## Features

### Anonymous user
- Browse all products
- Search products
- View single product details
- Open login/register page

### Logged-in customer
- Everything available to anonymous users
- Add products to cart and update quantities
- Checkout and place orders
- View own orders and delivery status (`pending` / `delivered`)
- View ordered products in the exact historical version that was ordered
- Update own username
- Change own password

### Logged-in manager
- Everything available to customers
- Create, edit, and delete products
- View all orders
- Filter orders (`all`, `pending`, `delivered`, `my`)
- Change order status to `pending` or `delivered`
- View user list
- Change user role (`customer` / `manager`)

## Tech stack

- TypeScript monorepo using npm workspaces
- Express + EJS templates
- PostgreSQL (Docker Compose)
- Session storage in PostgreSQL (`connect-pg-simple`)
- Password hashing with `bcrypt`

## Project structure

- [domain](domain): aggregates, enums, repository interfaces
- [application](application): services (`CartService`, `OrderService`, `ProductService`, `UserService`)
- [infrastructure](infrastructure): repository implementations (PostgreSQL and in-memory)
- [ui](ui): Express app, routes, views, static assets, seed script
- [util](util): shared utilities
- [db](db): Docker Compose and SQL initialization scripts

## Prerequisites

- Node.js
- npm
- Docker + Docker Compose

## Quick start

1. Install dependencies:

```bash
npm install
```

2. Build all workspace packages:

```bash
npm run build
```

3. Start PostgreSQL:

```bash
npm run db:up
```

1. (Optional) Seed sample users and products:

```bash
npm run db:seed
```

5. Start the app:

```bash
npm run start
```

6. Open:

- `http://localhost:3000`

7. Stop PostgreSQL when done:

```bash
npm run db:down
```

Manager account created during db initialization:
- username: `admin`
- password: `admin123!`

## Available scripts

- `npm run build` - build all workspaces
- `npm run start` - run the application
- `npm run db:up` - start PostgreSQL container
- `npm run db:seed` - insert sample data (users and products)
- `npm run db:down` - stop PostgreSQL container
