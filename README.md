# Full-Stack E-Commerce Platform

A professional full-stack e-commerce application built with React, Django REST Framework, and PostgreSQL. The project includes a customer storefront, account-based checkout, order history, product reviews, and an administrative dashboard for catalog, order, customer, and inventory management.

## Highlights

- Responsive storefront with product browsing, category filtering, product details, cart, and checkout.
- Customer authentication with registration, login, profile management, persistent cart, and order history.
- Admin dashboard for products, categories, orders, customers, low-stock products, and review moderation.
- Multi-item checkout with stock validation and atomic inventory updates.
- Payment tracking for Cash on Delivery, bKash, and Nagad transaction references.
- RESTful API design using Django REST Framework.
- PostgreSQL-backed relational data model with Django migrations.

## Tech Stack

- Frontend: React, Vite, Ant Design, JavaScript
- Backend: Django, Django REST Framework
- Database: PostgreSQL
- Tooling: npm, pip, Django migrations

## Project Structure

```text
New_Ecommerce/
  e_backend/    Django REST API and database models
  e_frontend/   React storefront and admin dashboard
```

## Backend Setup

```powershell
cd e_backend
venv\Scripts\python.exe -m pip install -r requirements.txt
copy .env.example .env
```

Update `.env` with your local PostgreSQL credentials, then create the database:

```sql
CREATE DATABASE new_ecommerce;
```

Run migrations and seed demo data:

```powershell
venv\Scripts\python.exe manage.py migrate
venv\Scripts\python.exe manage.py seed_demo
venv\Scripts\python.exe manage.py runserver 8000
```

## Frontend Setup

```powershell
cd e_frontend
npm install
npm run dev
```

Open the Vite URL in the browser, usually `http://127.0.0.1:5173`.

## Local Admin Access

The admin portal is available from the storefront `Admin` button or directly at `/admin`. For this local setup, the admin portal password is configured in `e_backend/.env` as `ADMIN_PORTAL_PASSWORD`.

## CV Summary

Built a full-stack e-commerce platform with React, Django REST Framework, and PostgreSQL, featuring customer authentication, product and category management, cart and checkout flow, order tracking, payment status handling, reviews, inventory updates, and an admin dashboard for operational management.
