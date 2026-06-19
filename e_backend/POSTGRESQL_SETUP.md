# PostgreSQL Setup

The backend is configured to use PostgreSQL through environment variables loaded from `e_backend/.env`.

## 1. Create Database

Open SQL Shell or pgAdmin and run:

```sql
CREATE DATABASE new_ecommerce;
```

## 2. Configure Environment

Copy the example file and update the values for your machine:

```powershell
copy .env.example .env
```

Required database variables:

```text
POSTGRES_DB=new_ecommerce
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-password
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
```

The admin dashboard password is controlled by:

```text
ADMIN_PORTAL_PASSWORD=your-admin-password
```

## 3. Install Dependencies

```powershell
venv\Scripts\python.exe -m pip install -r requirements.txt
```

## 4. Apply Migrations

```powershell
venv\Scripts\python.exe manage.py migrate
```

## 5. Seed Demo Data

```powershell
venv\Scripts\python.exe manage.py seed_demo
```

## 6. Start Backend

```powershell
venv\Scripts\python.exe manage.py runserver 8000
```
