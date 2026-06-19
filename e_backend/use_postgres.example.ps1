# Optional helper for loading PostgreSQL settings into the current PowerShell session.
# The backend also reads e_backend/.env automatically.
$env:POSTGRES_DB = "new_ecommerce"
$env:POSTGRES_USER = "postgres"
$env:POSTGRES_PASSWORD = "your-password"
$env:POSTGRES_HOST = "localhost"
$env:POSTGRES_PORT = "5432"
$env:ALLOWED_HOSTS = "127.0.0.1,localhost"
$env:FRONTEND_BASE_URL = "http://127.0.0.1:5173"
$env:BACKEND_BASE_URL = "http://127.0.0.1:8000"

Write-Host "PostgreSQL environment variables loaded for this PowerShell session."
Write-Host "Now run: venv\Scripts\python.exe manage.py migrate"
