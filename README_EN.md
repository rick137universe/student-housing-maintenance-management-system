<p align="center">
  <img src="public/assets/shared/images/flight-logo.svg" alt="FLight project logo" width="320">
</p>

# FLight | Student Housing and Maintenance Management System

[简体中文](README.md) | [English](README_EN.md)

FLight serves students, residence managers, maintenance staff, and administrators. It covers the full workflow from housing applications, bed allocation, and bill payments to maintenance dispatch and service reviews. Built with Next.js, TypeScript, and PostgreSQL, the application persists business data through a same-origin API.

The interface is adapted from the Anime.js template and includes an animated homepage, a dedicated login page, and four role-specific workspaces. Each workspace uses a three-column layout: feature navigation, animation previews, and business content. Preview animations are configured for individual roles and pages.

The project is currently intended for coursework and local use. Online payments are simulated and do not charge real money. Database backups use PostgreSQL tools, and restores create isolated database copies.

## Features

| Role | Modules | Main capabilities |
| --- | --- | --- |
| Student | Personal information, housing services, payments, maintenance requests, announcements, personal messages | Manage profile and password; apply for check-in, room transfers, and check-out; view bills and make simulated payments; submit maintenance requests, track progress, and review services |
| Residence manager | Basic information, housing administration, bed status, initial maintenance review, bill reconciliation, personal center, personal messages | Maintain assigned records; review housing applications and allocate beds; check bed anomalies; review maintenance requests; reconcile bills and send payment reminders |
| Maintenance staff | Work order acceptance, maintenance processing, maintenance records, personal statistics, personal center, personal messages | Accept assigned work orders; record progress and waits for parts; confirm completion; view workload, completion rates, and service reviews |
| Administrator | Base data, workflow configuration, maintenance dispatch, reports, access control, backup and restore, bill management, announcement management, personal center, personal messages | Import and export base data; configure business rules; dispatch manually or by workload; manage accounts and building access; generate bills, publish announcements, audit operations, and manage backups and restores |

Under **Reports → Statistics Visualization**, administrators can view 12 live metrics covering beds, maintenance requests, dispatch, reviews, and bills. The page retains the template easing-editor's three-column layout and supports bar, line, and doughnut charts, building and date filters, data details, and CSV export. See the [statistics visualization guide](docs/STATISTICS_VISUALIZATION.md).

Core workflows include:

- **Housing administration:** Review and process check-in, room transfer, and check-out applications; allocate beds automatically or manually; enforce gender, capacity, and active-residency constraints; synchronize bed status and retain history.
- **Billing and payments:** Configure fixed monthly fees; generate bills in batches by billing period; maintain bills; support partial simulated payments, idempotent processing, reconciliation, and in-app payment reminders.
- **Maintenance:** Submit → initial review → dispatch → acceptance → repair → completion → review. Supports rejection, waiting for parts, processing history, and 1–5-star ratings. Under **Workflow Configuration → Maintenance Workflow**, administrators can enable **Automatically approve the initial maintenance review**. New requests then pass the initial review automatically and enter the dispatch queue directly. This setting is disabled by default, and changes do not affect existing work orders.
- **Data and statistics:** Maintain students, buildings, rooms, and beds; paginate and filter records; use CSV templates, atomic imports, and exports; summarize occupancy, outstanding payments, workloads, and ratings.
- **System administration:** Manage account status, role permissions, residence managers' building access, announcements, in-app messages, audit logs, backup policies, and restore validation.

Data access is enforced on the server. Students access their own records; residence managers access assigned or authorized buildings; maintenance staff access assigned work orders; administrators manage system-wide operations within their permissions. Role parameters in URLs or the browser do not grant access.

## Interface and Routes

- The homepage introduces the system, provides real workspace links based on the signed-in role, and invites developers to contribute.
- Module landing pages across all four workspaces use the template's Getting started dot-grid animation. Individual pages use text, shape, or numeric animations. Designated payment and personal-statistics previews read live business data and stop when they reach the target value.
- English text and ASCII digits retain the template's DINish, Berkeley Mono, and Digital-7 fonts. Chinese text uses Source Han Sans, `SourceHanSansSC`, with WOFF2 files, UI subsets, and preloading of key font weights. See the [font guide](docs/FONT_GUIDE.md).
- The top navigation provides workspace, project GitHub, and account links. The footer uses the project logo, the FLIGHT INC. credit, and links to the project and its developers.
- Page titles consistently end with ` | FLight`. Animation previews retain replay controls but hide the edit icons linking to CodePen.
- Dates are displayed as `2026年10月23日`, and billing periods as `2026年10月`. Date-time values retain the existing `HH:mm:ss` time format. Amounts are displayed as `￥200` or `￥200.50`. Display formatting is independent of database values, API values, CSV data, and form submissions; date and numeric types remain unchanged.
- Navigation across all four workspaces reuses the template's `NEW` badge for outstanding payments, pending reviews, work orders awaiting acceptance or dispatch, and unread updates. Badges also appear on parent navigation items and disappear when the corresponding task is completed. Announcements, maintenance reviews, and backup results use per-user read records: badges disappear after details are viewed and reappear when the content is updated.

| Page | Route |
| --- | --- |
| Homepage | `/` |
| Login | `/login` |
| Workspace for the current role | `/workspace` |
| Student workspace | `/workspace/student` |
| Residence manager workspace | `/workspace/dormManager` |
| Maintenance workspace | `/workspace/maintenance` |
| Administrator workspace | `/workspace/admin` |

Individual pages use semantic paths, such as `/workspace/student/personal/profile` and `/workspace/student/accommodation/check-in/submit`. Legacy numbered routes such as `action-1` and `action-2` remain compatible through permanent 308 redirects. See the [workspace route guide](docs/WORKSPACE_ROUTES.md) for the complete list.

## Technology Stack

| Layer | Technologies |
| --- | --- |
| Application framework | Next.js 16.3.5 App Router, React 19, TypeScript |
| Interface and animation | Anime.js 4, template Three.js scenes and runtime, CSS Modules, Tailwind CSS 4 |
| Data and validation | PostgreSQL, `pg`, Zod, parameterized SQL, transactions |
| Authentication | Salted scrypt password hashes, database-backed sessions, HttpOnly cookies, CSRF validation, login rate limiting |
| Background jobs | A separate TypeScript worker for billing schedules, backups, and restores |
| Verification | ESLint, TypeScript, API integration tests, Playwright / Microsoft Edge |

Template pages run as standalone same-origin documents. The four workspaces share static styles and animation runtimes, while React business components read and write data through APIs. Original template resources, project adaptation scripts, and business code are maintained separately. Anime.js and Three.js use the prebuilt template runtimes retained in `public/assets`; their npm packages are no longer installed separately.

## Running Locally

### Requirements

- Node.js **24 or later** and npm.
- PostgreSQL **18**, an accessible database instance, and matching versions of `psql`, `pg_dump`, and `pg_restore`.
- An administrative account for database initialization and database role setup.
- Microsoft Edge installed locally for browser regression tests.

The following commands use PowerShell and should be run from the project root.

### 1. Install and Configure

```powershell
npm ci
Copy-Item .env.example .env.local
```

Edit `.env.local` to replace the example connections and passwords. If a local configuration already exists, do not copy the file again.

| Setting | Purpose |
| --- | --- |
| `DATABASE_URL` | Application database connection; normal operation uses the restricted `dorma_app` account |
| `DATABASE_ADMIN_URL` | Administrative connection for migrations, database role setup, and isolated test database management |
| `DATABASE_OPERATIONS_URL` | Maintenance connection for backups and isolated restores, typically using `dorma_ops` with `CREATEDB` permission |
| `APP_ORIGIN` | Actual browser origin, defaulting to `http://localhost:3100`; used to validate write-request origins |
| `SEED_PASSWORD` | Password for seeded sample accounts; at least 8 characters |
| `BACKUP_DIR` | Local backup directory, outside the PostgreSQL data directory |
| `PG_BIN` | PostgreSQL command-line tools directory, such as `C:/Program Files/PostgreSQL/18/bin` |

The default database name is `student_housing_maintenance`, and the business schema is `housing`. Special characters in connection strings must be URL-encoded. Environment configuration is not tracked in Git.

### 2. Create the Database and Run Migrations

Run the database creation script only if the database does not already exist. Adjust the tool path for your local installation:

```powershell
$pgClient = 'C:/Program Files/PostgreSQL/18/bin/psql.exe'
& $pgClient -X -h localhost -p 5432 -U postgres -d postgres -v ON_ERROR_STOP=1 -f database/000_create_database.sql
```

Then run:

```powershell
npm run db:migrate
npx tsx scripts/database/setup-roles.ts
npm run db:seed
```

On an empty database, `db:migrate` creates the initial schema and then applies incremental migrations. On an existing database, it applies only unapplied migrations and verifies the checksums of previously applied files. There is no need to run `001_schema.sql` or `002_verify.sql` manually.

`setup-roles.ts` creates or updates `dorma_app` and `dorma_ops`, configures their permissions, and writes connection credentials back to `.env.local`. Skip this step if the required roles and permissions are already configured. `db:seed` explicitly initializes coursework sample data. Running it again does not erase existing business data or reset existing account passwords.

### 3. Start the Web Application and Worker

```powershell
npm run dev -- --hostname localhost
```

In another terminal, run:

```powershell
npm run jobs
```

Open the [local homepage](http://localhost:3100) and sign in through `/login`. `APP_ORIGIN` must match the actual protocol, hostname, and port used in the browser.

### Sample Accounts

| Role | Username |
| --- | --- |
| Student | `stu202602341` |
| Residence manager | `dm0301` |
| Maintenance staff | `mt008` |
| Administrator | `admin` |

Use the `SEED_PASSWORD` set during the first initialization. The frontend does not store or automatically fill in passwords. Student usernames use the `stu` prefix, and maintenance usernames use `mt`; student numbers remain unchanged. Seed data also includes additional students, a second residence manager, and a second maintenance staff member for testing data isolation.

## Common Commands and Verification

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server on port 3100 by default |
| `npm run db:migrate` | Initialize the schema and apply incremental migrations |
| `npm run db:seed` | Initialize coursework sample data |
| `npm run jobs` | Run the background worker continuously |
| `npm run jobs:once` | Check and process jobs once, then exit |
| `npm run restore:check -- <restored-database-name>` | Validate an isolated restored database using the registered naming format |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript type checks |
| `npm run check` | Run lint, type checks, and a production build in sequence |
| `npm run test:integration` | Run database and API integration tests |
| `npm run test:e2e` | Run integration tests and browser regression tests |
| `npm run build` | Create a production build |
| `npm start` | Start the standalone production server |

Integration tests create a uniquely named isolated test database, start a test server on port **3101**, use `.next-integration` as the build directory, and store test backups under `temp/`. They clean up the test database and registered restored copies afterward. Before running them, configure all three database connections, prepare `dorma_app`, `dorma_ops`, and the PostgreSQL tools, and ensure port 3101 is available.

Tests cover APIs for all four roles, access scopes, concurrent bed allocation and payments, transaction rollback, CSV imports, backups, and isolated restores. Browser regression tests additionally cover sign-in and sign-out, navigation, forms, pagination, animation previews, and desktop/mobile layouts. Template checks also verify byte-for-byte consistency of protected original resources. This describes test coverage, not a claim that the full acceptance suite runs for every documentation update.

## Background Jobs and Production

```powershell
npm run build
npm start
```

The project uses Next.js standalone output. `npm start` prepares `public` and static build assets, loads the local `.env.local`, and starts the server on port 3100 by default. Set `PORT` to change the port, and update `APP_ORIGIN` to match the actual address. The background worker still needs to run separately with `npm run jobs`.

The worker checks its queue and updates its heartbeat every 15 seconds. Business scheduling uses `Asia/Shanghai`. Bills are generated at 00:10 on the first day of each month, with a catch-up check for the current month at startup. The default backup policy runs daily at 02:00; the daily execution time and retention period are configurable.

Backups use the `pg_dump` custom format and record SHA-256 checksums. After validating a registered backup, the restore process uses `pg_restore` to create a separate `dorma_restore_*` database and checks its schema, constraints, and business consistency. The web interface does not overwrite the active business database. The `/api/v1/health` endpoint reports database connectivity and worker heartbeat status. Backup jobs remain queued when the worker is not running.

Production operation also requires the worker scripts, their dependencies, database connections, PostgreSQL tools, and backup directory. For HTTPS or reverse-proxy deployments, configure origin validation and proxy trust for the actual topology. See the [backend API and business guide](docs/BACKEND_API.md).

## Project Structure

```text
src/
├─ app/                 Page routes, layouts, and /api/v1 entry points
│  ├─ (auth)/           Login route group; group names are not part of URLs
│  ├─ (main)/           Route group for all four workspaces
│  ├─ api/              Same-origin API Route Handlers
│  └─ globals.css       Global styles
├─ components/          Shared UI, document controls, and persistent layouts
├─ features/            Business-specific components, services, config, and utilities
├─ hooks/               Shared document-interaction hooks
├─ lib/                 Database, security, error, and routing infrastructure
├─ services/            Shared API client, session cache, and server orchestration
├─ constants/           Role menus, module descriptions, and action constants
├─ types/               Shared types
└─ utils/               Date/currency formatting and common route utilities
public/assets/
├─ home/                Homepage template resources and project adaptations
├─ login/               Login template resources and project adaptations
├─ student/             Student workspace and template runtime shared by all roles
├─ manager/             Residence manager workspace
├─ maintenance/         Maintenance workspace
├─ admin/               Administrator workspace
├─ statistics/          Statistics visualization page and styles
└─ shared/
   ├─ css/              Shared project styles; fonts/ contains font declarations
   ├─ fonts/            Font binaries and web subsets
   ├─ images/           Project logos, favicon, and developer avatars
   └─ js/               Shared utilities for static pages
database/               Initial schema and incremental migrations
scripts/
├─ database/            Migrations, seeding, role setup, and restore checks
├─ runtime/             Production server and background worker entry points
├─ sync/                Static page, navigation, and preview synchronization
├─ fonts/               Font conversion and UI subset generation
└─ lib/                 Shared environment-loading utilities for scripts
tests/
├─ runners/             Integration and browser regression orchestration
├─ integration/         Navigation API and database aggregation checks
├─ unit/                Shared pure-function checks
├─ checks/              Page-title and static template checks
├─ e2e/                 Browser regressions grouped by role and shared scenarios
└─ fixtures/            Template resource checksums and structure manifests
docs/                   Business, route, interface, and font documentation
```

Page URL mappings are centralized in `src/lib/routing/workspace-paths.ts`. Role-specific page manifests live in `src/features/workspace/config/`, with animation mappings in its `previews/` subdirectory. `src/constants/workspace-actions.ts` defines the relationship between business entry points and APIs. Static workspace pages and previews are synchronized through `scripts/sync/sync-*.ts`; changes must account for both source configuration and generated files. See the [project structure guide](docs/PROJECT_STRUCTURE.md) for the complete directory tree, responsibilities, and migration mappings.

Local runtime data and verification output are stored separately and excluded from Git. `.local/postgres/` holds the historical PostgreSQL test instance and logs, `test-results/screenshots/` holds browser screenshots, and `temp/legacy-qa/` holds temporary archives of old mock-page checks. The documentation directory no longer contains database files or test output. The old test instance is not used by the current default connection; see the [database guide](docs/DATABASE_GUIDE.md#本机历史测试实例) for optional startup instructions.

## Documentation

The following detailed guides are currently written in Chinese.

- [Documentation index and maintenance conventions](docs/INDEX.md)
- [Project structure and directory migration](docs/PROJECT_STRUCTURE.md)
- [Database and migrations](docs/DATABASE_GUIDE.md)
- [Script purposes and execution](docs/SCRIPTS_GUIDE.md)
- [Test organization and execution](docs/TESTING_GUIDE.md)
- [Static asset organization and maintenance](docs/PUBLIC_ASSETS.md)
- [Backend APIs, permissions, and business rules](docs/BACKEND_API.md)
- [Workspace route conventions](docs/WORKSPACE_ROUTES.md)
- [Homepage design sources](docs/HOME_DESIGN.md), [login page design sources](docs/LOGIN_DESIGN.md)
- [Student workspace design](docs/STUDENT_WORKSPACE_DESIGN.md), [residence manager workspace design](docs/MANAGER_WORKSPACE_DESIGN.md)
- [Student previews](docs/STUDENT_PREVIEWS.md), [residence manager previews](docs/MANAGER_PREVIEWS.md), [maintenance previews](docs/MAINTENANCE_PREVIEWS.md), [administrator previews](docs/ADMIN_PREVIEWS.md)
- [Statistics visualization](docs/STATISTICS_VISUALIZATION.md)
- [Fonts and web font generation](docs/FONT_GUIDE.md)

Interface design, page routes, and animation previews are maintained separately. Changes should follow the code, page manifests, and relevant regression tests. The historical `archive/`, old homepage implementation, unused components, old root-level static resources, and associated unused dependencies have been removed; consult Git history if needed. Original OTF files and the standalone font LICENSE text have also been removed, while the WOFF2 files and Chinese subsets required at runtime remain. Public avatars are limited to Pimnghi and rick137universe.

## Scope and Contributing

The project does not currently integrate with real payment merchants, SMS, or email services; notifications are delivered through in-app messages. Refunds or payment reversals, reassignment of accepted work orders, and in-place database restores are not currently supported. Switching to a restored copy requires maintenance personnel to validate it and manually update the connection.

Business data isolation is implemented through backend permission checks and query scoping; database row-level security is not enabled. Passwords, database credentials, and session tokens are not committed. Dependencies, build caches, local configuration, and QA output follow `.gitignore` rules. The project name is standardized as FLight, while some database roles, internal identifiers, and message protocols retain the `dorma` name for compatibility.

Report problems through [Issues](https://github.com/rick137universe/student-housing-maintenance-management-system/issues), or contribute a pull request. Run checks relevant to your changes before submitting. Commit messages use prefixes such as `feat:`, `fix:`, `docs:`, and `refactor:`.

Developers: [rick137universe](https://github.com/rick137universe) and [Pimnghi](https://github.com/Pimnghi). The interface and animations are adapted from the Anime.js template. Third-party code, fonts, and resources retain their respective licenses.
