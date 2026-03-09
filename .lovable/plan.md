

# Grooming Scheduling Engine — Architecture Plan

## Confirmed Architecture Summary

**All proposed entities and connections are fully supported.** Here's the confirmed design:

### Database Changes

**1. Alter `pets` table — add grooming-specific fields:**
- `size` (text: Small, Medium, Large, XL)
- `coat_type` (text)
- `current_condition` (text)
- `groom_level` (integer 1-4, nullable — null means "no level")
- `level_expiration_date` (date, nullable)

**2. Alter `groomers` table — add intake/scheduling fields:**
- `intake_style` (text: One-At-A-Time, Concurrent-Block, Concurrent-Staggered)
- `stagger_duration` (integer, minutes, default 15)
- `end_of_day_safeguard` (boolean, default false)
- `eod_buffer_minutes` (integer, default 60)
- `max_concurrent` (integer, default 2)
- `user_id` (uuid, nullable — links to auth.users for groomer login)

**3. New table `groomer_service_matrix`:**
- `id` (uuid PK)
- `groomer_id` (uuid, FK groomers)
- `shopify_product_id` (text — the Shopify service)
- `shopify_variant_id` (text)
- `pet_size` (text: Small, Medium, Large, XL)
- `groom_level` (integer 1-4)
- `duration_minutes` (integer)
- Unique constraint on (groomer_id, shopify_variant_id, pet_size, groom_level)
- RLS: staff CRUD

**4. New table `groom_questionnaires`:**
- `id` (uuid PK)
- `pet_id` (uuid, FK pets)
- `client_id` (uuid, FK clients)
- `status` (text: pending, approved, rejected)
- `coat_condition` (text)
- `matting_level` (text)
- `behavior_concerns` (text)
- `last_groom_location` (text)
- `photo_urls` (text array)
- `admin_notes` (text, nullable)
- `assigned_groom_level` (integer, nullable — set when approved)
- `created_at`, `reviewed_at`, `reviewed_by`
- RLS: clients can insert/view own; staff full CRUD

**5. Add `groomer` to the `app_role` enum** for groomer login accounts.

**6. User roles:** Groomer accounts get the `groomer` role. New RLS helper `is_groomer(_user_id uuid)` for groomer-specific policies.

### Auth & Roles

- Groomers get real auth accounts (email/password signup managed by admin)
- Each groomer record links to auth via `user_id`
- Groomer role grants: view own schedule, complete appointments, assign groom levels, edit own settings
- New `GroomerPortal` layout with filtered routes

### Two-Lane Booking Flow

```text
Client selects pet + grooming service
         │
         ▼
   Has active groom_level?
   (level != null AND level_expiration_date > today)
         │
    ┌────┴────┐
    No        Yes
    │         │
    ▼         ▼
  LANE A    LANE B
  Gatekeeper VIP Fast-Track
    │         │
    ▼         ▼
  Show       Lookup duration from
  questionnaire  groomer_service_matrix
  + photo upload (groomer + service + size + level)
    │         │
    ▼         ▼
  Create     Show available slots
  pending    (respecting intake rules)
  request    │
    │         ▼
    ▼        Auto-confirm booking
  Admin reviews
  → approves/rejects
```

- Lane detection happens client-side in the booking flow (check pet.groom_level and pet.level_expiration_date)
- Lane A creates a `groom_questionnaires` record + reservation with status `pending`
- Lane B queries the service matrix for duration, then feeds it into the slot availability engine
- State management: existing step-based booking flow extended with a conditional branch at the pet selection step

### Scheduling Engine

The availability algorithm (currently in `getAvailableTimeSlots` and `GroomingTimeSlots`) will be extended:

1. **Duration lookup**: Query `groomer_service_matrix` for exact duration based on groomer + service + pet size + groom level. Fall back to `groomer_service_durations` then 60-min default.

2. **Intake style logic**:
   - `One-At-A-Time`: No overlapping appointments allowed. A slot is available only if the groomer has zero active appointments during the entire duration window.
   - `Concurrent-Block`: Multiple pets can start at the same time, up to `max_concurrent`. Slot is available if current overlap count < max_concurrent.
   - `Concurrent-Staggered`: Pets start at `stagger_duration` intervals. Slot is available if: (a) it aligns to stagger intervals from existing starts, and (b) overlap count < max_concurrent.

3. **EOD Safeguard**: If `end_of_day_safeguard` is true and the pet is groom level 3 or 4, the slot is blocked if `slot_start + duration > groomer_end_time - eod_buffer_minutes`.

4. **All checks run before displaying slots** — either client-side with fetched data, or via an edge function for complex calculations.

### Groomer Portal (New)

- New route group: `/groomer/*`
- Login page similar to staff login
- Dashboard showing their own schedule (day/week view filtered to their groomer_id)
- Ability to mark appointments complete (triggers Shopify order)
- Post-visit form to assign groom level (1-4) to the pet, which auto-sets `level_expiration_date` based on a configurable system setting (e.g., "groom_level_expiration_weeks" in system_settings)
- Settings page to edit own intake style, stagger duration, EOD safeguard, max concurrent

### Level Expiration

- When a groomer assigns a groom level post-visit, `level_expiration_date = today + X weeks`
- X is read from `system_settings` key `groom_level_expiration_weeks` (default: 8)
- Configurable in Staff Settings

### Questionnaire (Lane A — Fixed Questions)

Built-in fields:
1. How long since last professional groom?
2. Coat condition (Well-maintained / Some tangles / Matted / Severely matted)
3. Matting level (None / Mild / Moderate / Severe)
4. Behavior concerns during grooming (None / Mild anxiety / Reactive / Aggressive)
5. Previous grooming location
6. Photo upload (up to 4 photos — stored in `pet-photos` bucket)

### File Structure (New/Modified)

```text
New files:
  src/pages/groomer/GroomerLogin.tsx
  src/pages/groomer/GroomerDashboard.tsx
  src/pages/groomer/GroomerSettings.tsx
  src/components/groomer/GroomerLayout.tsx
  src/components/groomer/GroomerSidebar.tsx
  src/components/groomer/AssignGroomLevelDialog.tsx
  src/components/booking/GroomQuestionnaire.tsx
  src/components/staff/grooming/ServiceMatrixEditor.tsx
  src/contexts/GroomerAuthContext.tsx

Modified files:
  src/App.tsx (add groomer routes)
  src/pages/BookingPage.tsx (two-lane logic)
  src/components/booking/GroomingTimeSlots.tsx (intake-aware slots)
  src/components/staff/grooming/GroomingAppointmentCell.tsx (level assignment)
  src/pages/staff/StaffGroomers.tsx (intake settings UI)
  src/pages/staff/StaffSettings.tsx (level expiration config)
```

### Implementation Order

1. Database migrations (new columns, new tables, enum update)
2. Service Matrix editor in Staff Groomers page
3. Groomer auth (new role, login, portal)
4. Two-lane booking flow (questionnaire + fast-track)
5. Scheduling engine upgrade (intake styles, EOD safeguard)
6. Post-visit groom level assignment
7. Admin questionnaire review UI

