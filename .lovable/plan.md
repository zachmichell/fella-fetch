

# Analytics Dashboard - Implementation Plan

## Overview
Build a comprehensive analytics suite on the existing `/staff/analytics` page, replacing the placeholder with a tabbed dashboard pulling data from reservations, Shopify orders, and new tracking tables.

---

## Phase 1: Database Schema Changes

### New Tables

**1. `turn_aways`** - Lost business tracking
- `id` (uuid, PK)
- `service_type` (enum: daycare/boarding)
- `date` (date)
- `reason` (text - e.g., Capacity, Failed Assessment, Waitlisted)
- `estimated_value` (numeric, nullable)
- `notes` (text, nullable)
- `created_by` (uuid)
- `created_at` (timestamptz)
- RLS: Staff can CRUD, admin-only delete

**2. `incidents`** - Pet incident tracking
- `id` (uuid, PK)
- `pet_id` (uuid, FK to pets)
- `reservation_id` (uuid, nullable, FK to reservations)
- `date` (date)
- `severity` (text - Low/Medium/High)
- `category` (text - Bite, Injury, Illness, Escape, Fight, Other)
- `description` (text)
- `action_taken` (text, nullable)
- `reported_by` (uuid)
- `created_at` (timestamptz)
- RLS: Staff can insert/select/update; admin can delete

**3. `class_types`** - Training class definitions
- `id` (uuid, PK)
- `name` (text - e.g., "Obedience L1")
- `level` (integer - 1, 2, 3...)
- `description` (text, nullable)
- `max_capacity` (integer, default 10)
- `is_active` (boolean, default true)
- `sort_order` (integer, default 0)
- `created_at` (timestamptz)

**4. `class_sessions`** - Scheduled class instances
- `id` (uuid, PK)
- `class_type_id` (uuid, FK to class_types)
- `start_date` (date)
- `end_date` (date, nullable)
- `day_of_week` (integer)
- `start_time` (time)
- `end_time` (time)
- `instructor` (text, nullable)
- `is_active` (boolean, default true)
- `created_at` (timestamptz)

**5. `class_enrollments`** - Pet enrollment in classes
- `id` (uuid, PK)
- `class_session_id` (uuid, FK to class_sessions)
- `pet_id` (uuid, FK to pets)
- `client_id` (uuid, FK to clients)
- `status` (text - Interested/Enrolled/Graduated/Dropped)
- `enrolled_at` (timestamptz, nullable)
- `graduated_at` (timestamptz, nullable)
- `notes` (text, nullable)
- `created_at` (timestamptz)

### Altered Tables

**`groomers`** - Add `commission_rate` column
- `commission_rate` (numeric, default 50) -- percentage

### System Settings (data inserts)
- `daycare_max_capacity` = 160
- `boarding_max_capacity` = 55

All new tables get RLS enabled with staff read/write policies.

---

## Phase 2: Edge Function - Shopify Revenue Data

Create a new backend function `analytics-revenue` that:
- Queries Shopify Admin API for orders within a date range
- Groups revenue by service type (using line item titles or tags)
- Returns aggregated totals for the Owner's View financials
- Secured: requires staff/admin auth

---

## Phase 3: Frontend Components

The `StaffAnalytics.tsx` page will be rebuilt with 4 tabs using Shadcn Tabs + Recharts:

### Tab A: Capacity (Daycare/Boarding)
- **Capacity Heatmap**: A monthly calendar grid. Each day cell is color-coded (green/yellow/red) based on `reservations` count vs. max capacity from `system_settings`. Uses existing `reservations` table filtered by service_type and status (confirmed/checked_in).
- **Ghost Report**: Query pets table joined with reservations to find pets with no visits in 30/60/90 days. Toggle between time ranges. Shows pet name, breed, owner, last visit date.
- **Turn-Away Form**: Quick-add form (service type, date, reason dropdown, estimated value) that inserts into the new `turn_aways` table. Below it, a summary table of recent turn-aways.

### Tab B: Grooming (Performance)
- **Commission Calculator**: Select a groomer, date range. Pulls grooming reservations for that groomer, cross-references with Shopify order amounts via the edge function, applies their `commission_rate`. Displays total revenue and take-home pay.
- **Reliability Chart**: Bar chart showing cancellations and no-shows per groomer over a date range. Data from `reservations` where `service_type = 'grooming'` and `status = 'cancelled'`.
- **Upsell Tracker**: Chart showing add-on frequency per grooming appointment. Derived from Shopify line items that are tagged as add-ons within grooming orders.

### Tab C: Training (Funnel)
- **Class Management**: Mini admin to create class types and sessions (only on desktop).
- **Progression Funnel**: Visual funnel chart built with Recharts showing counts at each stage: Interested -> Enrolled L1 -> Graduated L1 -> Enrolled L2 -> Graduated L2, etc. Data from `class_enrollments` joined with `class_types`.
- **Waitlist**: Table showing count of "Interested" enrollments grouped by class type.

### Tab D: Owner's View (Financials)
- **Payroll vs. Revenue**: Dual-line Recharts chart. Revenue from Shopify edge function. Payroll from a manual input field (stored in `system_settings` as `weekly_payroll_cost`) so the owner can adjust it.
- **Incident Heatmap**: Grid/table breaking down incidents by pet breed and severity. Data from `incidents` joined with `pets` for breed info.
- **VIP List**: Table of top 10% clients by lifetime spend. Data from Shopify orders grouped by customer email, joined with `clients` table.

---

## Phase 4: File Structure

```text
src/pages/staff/StaffAnalytics.tsx          -- Main page with tabs
src/components/staff/analytics/
  CapacityTab.tsx                            -- Tab A container
  CapacityHeatmap.tsx                        -- Calendar heatmap
  GhostReport.tsx                            -- Inactive pets list
  TurnAwayForm.tsx                           -- Quick-add + table
  GroomingTab.tsx                            -- Tab B container
  CommissionCalculator.tsx                   -- Groomer pay calc
  ReliabilityChart.tsx                       -- Cancel/no-show chart
  UpsellTracker.tsx                          -- Add-on frequency
  TrainingTab.tsx                            -- Tab C container
  ProgressionFunnel.tsx                      -- Funnel visualization
  ClassManager.tsx                           -- CRUD for class types/sessions
  WaitlistTable.tsx                          -- Interested counts
  OwnersTab.tsx                             -- Tab D container
  PayrollRevenueChart.tsx                    -- Dual-line chart
  IncidentHeatmap.tsx                        -- Breed x severity grid
  VipList.tsx                                -- Top spender table
supabase/functions/analytics-revenue/
  index.ts                                   -- Shopify revenue aggregation
```

---

## Technical Notes

- All date range filtering will use a shared date picker component at the top of each tab, defaulting to the current month.
- Recharts is already installed -- we'll use `BarChart`, `LineChart`, `FunnelChart`, and custom cell renderers for the heatmaps.
- Capacity percentages are calculated as: `(count of confirmed + checked_in reservations for that date) / max_capacity from system_settings`.
- The Ghost Report uses the query: pets with `is_active = true` whose most recent reservation `start_date` is older than the selected threshold (30/60/90 days).
- Shopify revenue queries will be batched by month to avoid API rate limits.
- Mobile: Tabs will stack vertically and charts will be scrollable horizontally.
- All new tables use `is_staff_or_admin(auth.uid())` for RLS to match existing patterns.

