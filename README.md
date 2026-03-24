# Teaching Grid

A web application for managing academic teaching allocations and staff workloads. Built for university departments to coordinate teaching assignments across staff, modules, and academic terms.

## Features

- **Interactive teaching grid** with drag-and-drop staff-to-module assignment
- **Staff management** -- track availability, leave of absence, rank, expected workload
- **Module management** -- organise by level (UG, MSc, PhD) and term (Michaelmas, Hilary, Trinity)
- **Service roles** -- track departmental and school-level administrative duties
- **Communication tracking** -- log allocation discussions and agreement status per staff member
- **Workload reports** -- over/underload warnings, per-term breakdowns
- **Excel export** -- formatted spreadsheets with formulas and staff summaries
- **Multiple grid views** -- by staff, by module, by UG year, by PG level
- **Keyboard shortcuts** -- navigation, copy/paste allocations, undo/redo
- **Validation** -- warnings for LOA conflicts, term availability, workload imbalances

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) 16 (App Router) with React 18
- **Language**: TypeScript
- **Database**: SQLite via [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) (WAL mode, zero config)
- **Styling**: Tailwind CSS with [Radix UI](https://www.radix-ui.com/) primitives (shadcn/ui)
- **Drag & Drop**: [@dnd-kit](https://dndkit.com/)
- **Excel**: [ExcelJS](https://github.com/exceljs/exceljs) for styled exports

## Prerequisites

- **Node.js 20.9.0 or higher** (required by Next.js 16)
- npm

If you manage Node versions with [nvm](https://github.com/nvm-sh/nvm):

```bash
nvm install 20   # install if needed
nvm use 20       # switch to it
```

## Quick Start

```bash
git clone https://github.com/cboussalis/teaching-grid.git
cd teaching-grid
npm install
npm run dev
```

Open [http://localhost:1821](http://localhost:1821) in your browser.

The SQLite database is **automatically created** at `data/teaching.db` on first run with an empty schema. No database setup required.

### Launch Script (Linux)

A convenience script is included that starts the dev server (if not already running) and opens your browser:

```bash
./launch-teaching-grid.sh
```

It uses relative paths, so it works from wherever the repo is cloned. Set the `BROWSER` environment variable to override the default (e.g., `BROWSER=firefox ./launch-teaching-grid.sh`).

## Populating Data

The app starts with an empty database. There are two ways to add data:

### Option 1: Manual Entry via the UI

Use the web interface to add data directly:

1. **Staff** (`/staff`) -- add staff members with their name, abbreviation, rank, expected load, and availability
2. **Modules** (`/modules`) -- add modules with code, name, level, term, and teaching hours
3. **Teaching Grid** (`/grid`) -- assign staff to modules by dragging or clicking
4. **Service Roles** (`/services`) -- add administrative duties and assign staff

This is the simplest approach for small departments or for getting started.

### Option 2: Bulk Import from CSV/Excel

For larger datasets or migrating from a previous year, use the import script. It reads from a directory of CSV and Excel files.

```bash
npx tsx scripts/import-excel.ts
```

The script expects files in a `../last-year/` directory (one level up from the app root). Edit the `lastYearPath` variable in the script if your files are elsewhere.

#### Expected File Formats

**1. Staff CSV** (`staff_25-26.csv`)

A CSV file with staff details. Required columns:

| Column | Description | Example |
|--------|-------------|---------|
| `name` | Full name | `Jane Smith` |
| `name_abbrev` | Short abbreviation (used in the grid) | `JS` |
| `load` | Expected teaching load (numeric) | `3` |
| `loa` | Leave of absence flag (0 or 1) | `0` |
| `mt_available` | Available in Michaelmas Term (0 or 1) | `1` |
| `ht_available` | Available in Hilary Term (0 or 1) | `1` |
| `notes` | Optional notes | `On research buyout` |

Example:

```csv
name,name_abbrev,load,loa,mt_available,ht_available,notes
Jane Smith,JS,3,0,1,1,
John Doe,JD,2,0,1,0,On sabbatical HT
Alex Brown,AB,3,1,0,0,Full year LOA
```

**2. Teaching Grid Excel** (`PS_GRID_DRAFT1.xlsx`)

An Excel workbook where each sheet represents a module level. The import script determines the level from the sheet name (e.g., a sheet named "UG" or "Undergraduate" maps to UG level).

Each sheet should have this layout:

| Module Code | Module Name | *Staff Abbrev 1* | *Staff Abbrev 2* | ... |
|-------------|-------------|:---------:|:---------:|:---:|
| POU1234 | Introduction to Politics | 1 | | |
| POU2345 | Comparative Politics | | 1 | |
| POU3456 | Political Theory | 0.5 | 0.5 | |

- **Row 1 (headers)**: First columns are module info; remaining columns are staff abbreviations (must match `name_abbrev` from the staff CSV)
- **Data rows**: Each row is a module. Numeric values in staff columns indicate allocated teaching hours.
- **Module code** is in column A, **module name** in column B. Staff columns start from column C onward.
- The term is inferred from the module code (codes ending in `1` default to MT, `2` to HT, etc.) or from a cell value in the row if it matches a known term.

Sheet name to level mapping:

| Sheet name contains | Mapped level |
|---------------------|-------------|
| `ug`, `undergrad` | UG |
| `msc`, `ip` | MSc IP |
| `asds`, `data` | ASDS |
| `phd`, `doctoral` | PhD |

**3. Service Roles Excel** (`service_25-26.xlsx`)

An Excel file with one sheet listing service roles. The script searches for these column names (case-insensitive):

| Column | Description | Example |
|--------|-------------|---------|
| `Role` / `Name` / `Service` | Role name | `Director of Studies` |
| `Category` / `Type` | `Dept` or `School` | `Dept` |
| `Staff` / `Assigned` | Staff name or abbreviation | `JS` |
| `Term` | When the role is active | `Full Year` |

### After Import

Once data is loaded (by either method), the teaching grid at `/grid` will display modules as rows and staff as columns, with allocations shown as hour values in the cells. All other pages (dashboard, reports, exports) draw from the same database.

## Pages

| Route | Description |
|-------|-------------|
| `/` | Dashboard -- overview stats, allocation completion, quick links |
| `/staff` | Staff management -- add/edit/delete, view loads, rank, availability |
| `/modules` | Module management -- add/edit/delete, batch edit level/term/ECTS |
| `/grid` | Teaching grid -- drag-and-drop allocations, multiple view modes |
| `/services` | Service roles -- departmental and school-level duties |
| `/communications` | Communication tracking -- log discussions, track agreement status |
| `/reports` | Workload reports, module status, warnings; Excel export |

## API Endpoints

| Endpoint | Methods | Description |
|----------|---------|-------------|
| `/api/staff` | GET, POST | List / create staff |
| `/api/staff/[id]` | GET, PUT, DELETE | Single staff CRUD |
| `/api/modules` | GET, POST | List / create modules |
| `/api/modules/[id]` | GET, PUT, DELETE | Single module CRUD |
| `/api/allocations` | GET, POST, DELETE | Manage allocations |
| `/api/allocations/batch` | POST | Batch allocation operations (used by drag-drop) |
| `/api/allocations/[id]` | PUT, DELETE | Single allocation CRUD |
| `/api/services` | GET, POST | List / create service roles |
| `/api/services/[id]` | PUT, DELETE | Single service role CRUD |
| `/api/communications` | GET | List all communication statuses |
| `/api/communications/[staffId]` | GET, PUT | Staff communication status |
| `/api/communications/[staffId]/log` | GET, POST | Communication log entries |
| `/api/grid` | GET | Grid data with joins and filters |
| `/api/reports` | GET | Report data |
| `/api/dashboard` | GET | Dashboard statistics |
| `/api/export/excel` | POST | Styled Excel export |
| `/api/export/text` | GET | Plain text export |
| `/api/export` | GET | Basic export |

## Database Schema

The SQLite database (`data/teaching.db`) is created automatically. Tables:

- **staff** -- name, abbreviation, rank, gender, affiliation, LOA status, term availability, expected load, notes
- **module** -- code, name, level (UG/MSc IP/ASDS/PhD), term (MT/HT/TT/FullYear), teaching load hours, ECTS
- **allocation** -- links staff to modules with allocated hours (unique per staff-module pair)
- **service_role** -- role name, category (Dept/School), assigned staff, term
- **academic_year** -- year label and current-year flag
- **communication** -- per-staff status tracking (not_started/email_sent/in_discussion/agreed/disputed)
- **communication_log** -- timestamped notes attached to each communication record

## Project Structure

```
├── data/                    # SQLite database (auto-created)
├── scripts/
│   └── import-excel.ts      # Bulk data import from CSV/Excel
├── src/
│   ├── app/                 # Next.js App Router pages & API routes
│   │   ├── api/             # REST API (staff, modules, allocations, etc.)
│   │   ├── communications/  # Communication tracking page
│   │   ├── grid/            # Teaching grid page
│   │   ├── modules/         # Module management page
│   │   ├── reports/         # Reports & export page
│   │   ├── services/        # Service roles page
│   │   └── staff/           # Staff management page
│   ├── components/
│   │   ├── grid/            # Grid-specific components (drag-drop, filters, sidebar)
│   │   ├── export/          # Export modal
│   │   ├── nav.tsx          # Navigation bar
│   │   └── ui/              # Reusable UI components (shadcn/ui)
│   ├── hooks/               # Custom React hooks (undo/redo, shortcuts, validation, clipboard)
│   ├── lib/                 # Database, queries, utilities, Excel styling
│   └── types/               # TypeScript interfaces
├── launch-teaching-grid.sh  # Convenience launcher (Linux)
├── package.json
└── README.md
```

## Module Code Conventions

The grid uses module code prefixes to organise year-based views. These patterns are used by default but are not enforced -- you can use any module codes:

- `POU1xxx` -- `POU4xxx`: Political Science UG Years 1--4
- `PIU1xxx` -- `PIU4xxx`: Philosophy UG Years 1--4
- `POXxxx`: Placeholder / TBD modules

To adapt for your department, modify the year-detection logic in `src/app/grid/page.tsx` and the grouping helpers in `src/lib/module-utils.ts`.

## Academic Terms

The app uses the Trinity College Dublin term system:

| Abbreviation | Term | Rough equivalent |
|-------------|------|-----------------|
| MT | Michaelmas Term | Autumn / Fall semester |
| HT | Hilary Term | Spring semester |
| TT | Trinity Term | Summer term |
| FullYear | Full Year | Spans all terms |

These values are enforced at the database level. To change them, edit the `CHECK` constraints in `src/lib/db.ts`.

## Development

```bash
npm run dev      # Start dev server on port 1821
npm run build    # Production build
npm run start    # Start production server (after build)
npm run lint     # ESLint
```

Path alias: `@/*` maps to `./src/*` (configured in `tsconfig.json`).

## Data Management

### Backup

Copy these files to back up your data:

```bash
cp data/teaching.db data/teaching.db.backup
```

If the server is running, the WAL files (`teaching.db-shm`, `teaching.db-wal`) may also exist -- stop the server first for a clean backup, or copy all three files together.

### Reset

To start fresh, delete the database and restart:

```bash
rm data/teaching.db data/teaching.db-shm data/teaching.db-wal
npm run dev
```

A new empty database will be created automatically.

## Troubleshooting

### Node.js version error

If you see `Node.js version ">=20.9.0" is required`:

```bash
nvm install 20 && nvm use 20
```

### Database locked

Ensure no other process is accessing `data/teaching.db`. The WAL mode handles most concurrent access, but running multiple dev servers against the same database can cause issues.

### Port already in use

The dev server runs on port 1821 by default. To change it, edit the `dev` script in `package.json`:

```json
"dev": "next dev --port 3000"
```

### Missing native dependencies

`better-sqlite3` requires a C++ compiler for its native bindings. If `npm install` fails:

```bash
# Ubuntu/Debian
sudo apt install build-essential python3

# macOS
xcode-select --install
```

Then run `npm install` again.

## License

MIT
