Laravel backend sample for Badmin

This folder contains example Laravel files you can copy into your `badmin-backend` project.

What's included:
- Migrations for `players`, `courts`, `matches`.
- Eloquent models: `Player`, `Court`, `Match`.
- Controllers: `PlayerController`, `MatchController`, `CourtController`, `QueueController`.
- Service: `MatchmakerService` (algorithm skeleton)
- `routes/api.php` example
- `openapi.yaml` minimal API spec

How to use:
1. Copy the files under `backend-samples/laravel` into your Laravel project (preserve paths).
2. Run `composer install`, set up `.env` with DB credentials.
3. Run migrations: `php artisan migrate`.
4. Wire controllers to routes (see `routes/api.php`).
5. Seed some players or create via `/api/players`.

Notes:
- These are templates to help bootstrap. Adjust validation, auth (e.g. Sanctum), and business rules as needed.
