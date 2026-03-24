# Teaching Grid Management System

A web-based application for managing academic teaching allocations and staff workloads. Built for university departments to coordinate teaching assignments across staff members, modules, and academic terms.

## Features

- **Interactive Teaching Grid**: Spreadsheet-like interface with drag-and-drop support for assigning staff to modules
- **Staff Management**: Track staff availability, leave of absence, and expected workloads
- **Module Management**: Organize courses by level (UG, MSc, PhD) and term (MT, HT, TT)
- **Service Roles**: Manage departmental and school-level administrative duties
- **Workload Reports**: Comprehensive analysis with over/underload warnings
- **Data Export**: Export allocations to formatted Excel files
- **Real-time Validation**: Warnings for scheduling conflicts and availability violations
- **Multiple Views**: Filter by staff, module, undergraduate year, or postgraduate level
- **Keyboard Shortcuts**: Quick navigation and allocation management
- **Undo/Redo**: Track and revert changes

## Tech Stack

- **Framework**: Next.js 16 with React 18
- **Language**: TypeScript
- **Database**: SQLite with better-sqlite3
- **Styling**: Tailwind CSS with Radix UI components
- **Drag & Drop**: @dnd-kit

## Prerequisites

- Node.js 20.9.0 or higher (required by Next.js 16)
- npm

**Note**: If you have multiple Node.js versions via nvm, switch to v20+ first:
```bash
nvm use 20
```

## Installation

1. Clone or download the repository:
   ```bash
   cd /path/to/app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

The SQLite database will be automatically created at `data/teaching.db` on first run.

## Usage Guide

### Dashboard

The home page displays an overview of:
- Total staff members and modules
- Allocation completion status
- Quick statistics on workload distribution
- Navigation links to all sections

### Staff Management (`/staff`)

Manage your department's teaching staff:

1. **Add Staff**: Click "Add Staff" and fill in:
   - Name and abbreviation (used in the grid)
   - Expected teaching load (hours)
   - Term availability (MT/HT)
   - Leave of absence status

2. **Edit Staff**: Click the edit icon next to any staff member

3. **Delete Staff**: Click the delete icon (removes all associated allocations)

The staff list shows each person's current workload against their expected load.

### Module Management (`/modules`)

Manage courses and teaching modules:

1. **Add Module**: Click "Add Module" and enter:
   - Module code (e.g., "POU101")
   - Module name
   - Level: UG (Undergraduate), MSc IP, ASDS, or PhD
   - Term: MT (Michaelmas), HT (Hilary), TT (Trinity), or Full Year
   - Teaching hours required
   - ECTS credits (optional)

2. **Edit Module**: Click any module row to edit

3. **Batch Edit**: Select multiple modules to update level, term, or ECTS together

4. **Delete Module**: Remove modules (cascades to allocations)

### Teaching Grid (`/grid`)

The main interface for managing allocations:

#### Grid Views

Use the tabs to switch between views:
- **Staff View**: Rows are staff members, columns are modules
- **Module View**: Rows are modules, columns are staff
- **Year Views** (1st-4th Year UG): Filter by undergraduate cohort
- **PG Views**: Filter by postgraduate level

#### Making Allocations

**Drag and Drop**:
1. Find a staff member in the left sidebar
2. Drag their badge onto a module cell
3. Drop to create an allocation with default hours

**Direct Entry**:
1. Click any cell in the grid
2. Type the hours to allocate
3. Press Enter or click away to save

**Copy/Paste**:
1. Select a cell with an allocation
2. Press `Ctrl+C` to copy
3. Navigate to another cell
4. Press `Ctrl+V` to paste

#### Validation Warnings

The grid displays warnings for:
- **Red**: Staff on leave of absence assigned to modules
- **Orange**: Staff unavailable in the allocated term
- **Yellow**: Staff over their expected workload
- **Blue**: Staff under their expected workload

#### Staff Sidebar

The left panel shows:
- All staff members with their abbreviations
- Current load vs expected load bar
- Leave/availability status indicators
- Filter to show only available staff

#### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Arrow keys | Navigate between cells |
| Enter | Edit selected cell |
| Delete/Backspace | Clear allocation |
| Ctrl+C | Copy allocation |
| Ctrl+V | Paste allocation |
| Ctrl+Z | Undo |
| Ctrl+Shift+Z | Redo |
| ? | Show shortcuts help |

### Service Roles (`/services`)

Track administrative duties:

1. **Add Role**: Create departmental or school-level service roles
2. **Assign Staff**: Select who holds each role
3. **Set Term**: Indicate when the role is active

Categories:
- **Dept**: Department-level roles (e.g., Director of Studies)
- **School**: School-wide responsibilities

### Reports (`/reports`)

Generate analysis reports:

#### Workload Report
- Staff-by-staff breakdown of teaching allocations
- Total hours per term (MT, HT)
- Comparison against expected loads
- Over/underload highlighting

#### Module Status Report
- Allocation status for each module
- Identifies under-staffed or over-staffed modules
- Hours allocated vs hours required

#### Warnings Report
- All validation issues across the system
- Leave of absence conflicts
- Term availability violations
- Workload imbalances

### Exporting Data

From the Reports page:

1. Click **Export to Excel**
2. Choose export options:
   - Include all modules or filter by level
   - Include staff summary sheet
   - Add term breakdown
3. Download the formatted Excel file

The export includes:
- Module allocations by level
- Staff workload summaries
- SUMIFS formulas for automatic calculations

## Data Management

### Database Location

The SQLite database is stored at `data/teaching.db`. The application uses WAL (Write-Ahead Logging) mode for better concurrent access.

### Backup

To backup your data, copy these files:
- `data/teaching.db`
- `data/teaching.db-shm` (if exists)
- `data/teaching.db-wal` (if exists)

### Import from Excel

If migrating from a legacy system, use the import script:

```bash
npx tsx scripts/import-excel.ts
```

Edit the script to point to your source files.

## Development

### Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Run linting
npm run lint
```

### Project Structure

```
src/
├── app/                 # Next.js pages and API routes
│   ├── api/            # REST API endpoints
│   ├── grid/           # Teaching grid page
│   ├── modules/        # Module management
│   ├── reports/        # Reports page
│   ├── services/       # Service roles
│   └── staff/          # Staff management
├── components/
│   ├── ui/             # Reusable UI components
│   ├── grid/           # Grid-specific components
│   └── export/         # Export functionality
├── hooks/              # Custom React hooks
├── lib/                # Database and utilities
└── types/              # TypeScript definitions
```

### API Endpoints

| Endpoint | Methods | Description |
|----------|---------|-------------|
| `/api/staff` | GET, POST | List/create staff |
| `/api/staff/[id]` | GET, PUT, DELETE | Staff CRUD |
| `/api/modules` | GET, POST | List/create modules |
| `/api/modules/[id]` | GET, PUT, DELETE | Module CRUD |
| `/api/allocations` | GET, POST, DELETE | Manage allocations |
| `/api/allocations/batch` | POST | Batch operations |
| `/api/services` | GET, POST | List/create service roles |
| `/api/grid` | GET | Grid data with filters |
| `/api/reports` | GET | Generate reports |
| `/api/dashboard` | GET | Dashboard statistics |
| `/api/export/excel` | POST | Excel export |

## Module Code Conventions

The system recognizes these module code patterns:

- `POU1` - `POU4`: Political Science UG (Years 1-4)
- `PIU1` - `PIU4`: Philosophy UG (Years 1-4)
- `POX###`: Placeholder modules

These codes are used to automatically organize the year-based grid views.

## Academic Terms

- **MT**: Michaelmas Term (Autumn)
- **HT**: Hilary Term (Spring)
- **TT**: Trinity Term (Summer)
- **Full Year**: Spans all terms

## Troubleshooting

### Node.js Version Error

If you see `Node.js version ">=20.9.0" is required`, you need to switch to a newer Node.js version:

```bash
# If using nvm
nvm use 20

# Or install Node 20 if not available
nvm install 20
```

### Database Locked Error

If you see database locked errors, ensure no other process is accessing the database. The WAL mode should handle most concurrent access scenarios.

### Port Already in Use

If port 3000 is busy:
```bash
npm run dev -- -p 3001
```

### Missing Dependencies

If components fail to load:
```bash
rm -rf node_modules
npm install
```

## License

Internal use only.
