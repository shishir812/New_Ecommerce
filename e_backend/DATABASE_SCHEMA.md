# Ecommerce Backend Database Schema

This backend uses Django's built-in `auth.User` model for login identity. The `shop` app adds ecommerce-specific tables around that user.

## Model List

- `User` - Django auth user.
- `Profile` - customer contact and address details for a user.
- `Category` - product grouping, with optional parent category.
- `Product` - sellable item.
- `ProductImage` - one or more images for a product.
- `Cart` - active shopping cart for a user or guest session.
- `CartItem` - product and quantity inside a cart.
- `Order` - placed checkout/order header.
- `OrderItem` - product snapshot and quantity inside an order.
- `Payment` - payment record for an order.
- `Review` - customer product rating and comment.

## Backend Features

- Product CRUD API with admin/product-manager permissions.
- Category API with admin/product-manager permissions.
- Cart API for authenticated customers.
- Order API with multi-item checkout.
- Customer authentication: register, login, logout, current user, and order history.
- Staff users, users in the `Product Managers` group, or requests with the admin password can manage catalog and order data.
- Product stock is reduced atomically after order creation.
- Order statuses are `pending`, `confirmed`, `shipped`, `delivered`, and `cancelled`.
- Product images support external URLs and uploaded files.
- Payment system supports Cash on Delivery, bKash, and Nagad transaction tracking.
- PostgreSQL is supported through environment-based settings.

## Relationships

```text
User 1---1 Profile
User 1---1 Cart
User 1---* Order
User 1---* Review

Category 1---* Product
Category 1---* Category parent/children

Product 1---* ProductImage
Product 1---* CartItem
Product 1---* OrderItem
Product 1---* Review

Cart 1---* CartItem
Order 1---* OrderItem
Order 1---* Payment
```

## Tables

### User

Provided by Django: `django.contrib.auth.models.User`.

Important fields:

- `id`
- `username`
- `email`
- `password`
- `first_name`
- `last_name`
- `is_active`
- `is_staff`
- `is_superuser`

### Profile

Stores customer details that do not belong directly in the auth user table.

Fields:

- `id`
- `user` - one-to-one relation to `User`
- `phone`
- `address`
- `city`
- `postal_code`
- `created_at`
- `updated_at`

### Category

Organizes products.

Fields:

- `id`
- `name` - unique
- `slug` - unique URL-friendly name
- `parent` - optional self-reference for subcategories
- `is_active`
- `created_at`
- `updated_at`

### Product

Main catalog item.

Fields:

- `id`
- `category` - optional relation to `Category`
- `name`
- `slug` - unique URL-friendly name
- `sku` - unique stock keeping unit
- `description`
- `price`
- `stock`
- `status` - `draft`, `active`, or `archived`
- `is_active`
- `created_at`
- `updated_at`

Computed fields:

- `image_url` - primary product image URL from `ProductImage`
- `average_rating`
- `review_count`

### ProductImage

Allows multiple images per product.

Fields:

- `id`
- `product` - relation to `Product`
- `image_url`
- `uploaded_image`
- `display_url`
- `alt_text`
- `is_primary`
- `sort_order`
- `created_at`
- `updated_at`

### Cart

Represents an active cart. It can belong to a logged-in user or a guest session.

Fields:

- `id`
- `user` - optional one-to-one relation to `User`
- `session_key` - used for guest carts
- `is_active`
- `created_at`
- `updated_at`

Computed fields:

- `total_amount`

### CartItem

Line item inside a cart.

Fields:

- `id`
- `cart` - relation to `Cart`
- `product` - relation to `Product`
- `quantity`
- `created_at`
- `updated_at`

Constraint:

- One row per `cart` and `product`.

Computed fields:

- `line_total`

### Order

The order header. Customer details are stored here as a snapshot so old orders still make sense if a user edits their profile later.

Fields:

- `id`
- `user` - optional relation to `User`
- `customer_name`
- `customer_phone`
- `shipping_address`
- `subtotal`
- `shipping_fee`
- `total_amount`
- `status` - `pending`, `confirmed`, `processing`, `shipped`, `delivered`, or `cancelled`
- `payment_method` - `cash_on_delivery`, `bkash`, or `nagad`
- `payment_status` - `unpaid`, `pending`, `paid`, `failed`, or `cancelled`
- `notes`
- `created_at`
- `updated_at`

### OrderItem

Product snapshot inside an order. It stores product name, SKU, and price at checkout time.

Fields:

- `id`
- `order` - relation to `Order`
- `product` - optional relation to `Product`
- `product_name`
- `product_sku`
- `unit_price`
- `quantity`
- `created_at`
- `updated_at`

Computed fields:

- `line_total`

### Payment

Tracks payment attempts and successful payments for an order.

Fields:

- `id`
- `order` - relation to `Order`
- `method` - `cash_on_delivery`, `bkash`, or `nagad`
- `gateway_name`
- `transaction_id`
- `amount`
- `status` - `unpaid`, `pending`, `paid`, `failed`, or `cancelled`
- `gateway_session_key`
- `gateway_response`
- `payment_date`
- `paid_at`
- `created_at`
- `updated_at`

### Review

Customer feedback for a product.

Fields:

- `id`
- `product` - relation to `Product`
- `user` - optional relation to `User`
- `customer_name`
- `rating` - 1 to 5
- `comment`
- `is_approved`
- `created_at`
- `updated_at`

## Main API Endpoints

- `/api/profiles/`
- `/api/categories/`
- `/api/products/`
- `/api/product-images/`
- `/api/carts/`
- `/api/cart-items/`
- `/api/orders/`
- `/api/order-items/`
- `/api/payments/`
- `/api/reviews/`
- `/api/admin/overview/`

## PostgreSQL Configuration

The backend uses PostgreSQL. Configure the database through `e_backend/.env`:

```text
POSTGRES_DB=new_ecommerce
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
```
