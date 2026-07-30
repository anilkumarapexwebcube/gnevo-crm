# Gnevo CRM — Workspace Users & Team Management Checklist

Tracks the **Workspace User Management System** against the *actual* current codebase.

**Legend**
- [x] — Done & verified in code
- [~] — Partial (foundation/data model exists, but no full flow/UI)
- [ ] — Pending (buildable now, no paid creds)
- [-] — Future / needs paid creds or external service

**Reality summary (2026-07-29):** The **foundation is strong** — RBAC engine with
5 system roles + scopes, Prisma models for Office/Department/Team/TeamMember/Role,
auth security (sessions, passkeys, TOTP 2FA, audit log), and a working Client Portal.
The **gap** is the entire *team-management surface*: there is **no in-app invite
system and no way to add / edit / promote / demote / suspend users** — today users
only come from the DB seed or self-registration (which creates a *new* org, not join
an existing one). Department/Team/Office have models but **no CRUD UI**. SMTP is
already configured, so email invites can send for real.

---

## M1 — Workspace Roles  (owner / admin / **HR** / manager / employee / client)
- [x] Workspace Owner (single owner) — `owner` system role, `manageAll('org')`
- [x] Unlimited Admins — invite/assign Admin (owner-only); multiple admins supported
- [x] Unlimited HRs — **`hr` role** (manages people: user/department/team/office; no CRM data powers; cannot touch admins/owner)
- [x] Unlimited Managers — `manager` role (department scope)
- [x] Unlimited Employees — `member` role, labelled **Employee** in the UI (own scope) — full CRM access to manage leads/customers/deals/tickets
- [x] Unlimited Clients — Client Portal (Contact-based login), separate from staff roles
- _Viewer_ — extra read-only staff role (optional; not part of the core hierarchy)
- [x] Role-based permissions (RBAC) — `SYSTEM_ROLE_TEMPLATES` + RbacGuard + scopes (org/department/own)
- [~] Department support — `Department` model + FKs; **no CRUD/API/UI**
- [~] Team support — `Team`/`TeamMember` models; **no CRUD/API/UI**
- [~] Office/Branch support — `Office` model; **no CRUD/API/UI**

## M2 — Invite System  → **DONE (Phase 1)**
- [x] Invite by email — signed-token invite + email via SMTP
- [x] Bulk invite (CSV) — paste/CSV emails, one role
- [x] Invite expiration — 7-day token + `expiresAt`, expired-badge
- [x] Resend invitation — re-signs + bumps expiry
- [x] Cancel invitation
- [x] Accept invitation page — `/auth/invite?token=` (set name + password)
- [x] Welcome email — invite email w/ accept link (HTML + text)
- [x] Auto account creation — accept creates the user + signs in
- [x] Auto assign role — role chosen at invite time
- [x] Auto assign department — Department picker in invite dialog; applied on accept
- [x] Auto assign team — Team picker in invite dialog; applied on accept

## M3 — Employee Management  → **DONE (Phase 2 + 5)**
- [x] Employee profile — admin-managed "Manage profile" dialog on `/directory`
- [x] Employee avatar — upload on profile (image, 1 MB limit) + fallback initials, shown in topbar/team/profile
- [x] Employee ID
- [x] Designation
- [x] Department — assigned via invite + Structure
- [x] Team — assigned via Structure (add/remove members)
- [x] Reporting manager
- [x] Joining date
- [x] Working status — active / suspended / deleted shown
- [x] Active / Inactive — status badges in `/directory`
- [x] Suspend employee — suspend + revokes their sessions (immediate lockout)
- [x] Delete employee — soft-delete + session revoke
- [x] Restore employee

## M4 — Admin Management  → **DONE (Phase 2)**
- [x] Add second admin — invite as Admin, or change role → Admin
- [x] Multiple admins
- [x] Owner can promote employee to admin (owner-only)
- [x] Owner can demote admin (owner-only)
- [x] Transfer workspace ownership (owner → picks new owner, self becomes admin)
- [x] Prevent owner deletion
- [x] Prevent last admin deletion (delete + suspend + demote guards)

## M5 — Permissions  → **DONE (Phase 4)** (`/roles`)
- [x] Permission matrix — visual resource×action grid editor at `/roles`
- [x] Custom roles — create/edit/delete custom roles (builder UI)
- [x] Clone existing role — clone any role (incl. system) into a custom one
- [x] Create custom permissions (UI) — toggle grid; row-toggle for all actions
- [x] Read / Create / Update / Delete permission — grid columns + RbacGuard enforced
- [x] Module-level permission — per-resource permissions
- [x] Record-level (scope) — org / department / own scope selector per role
- [x] Import/export permission definitions — export any role as JSON + import a role JSON on `/roles`

## M6 — Team Management  → **DONE (Phase 3)** (`/structure` → Teams)
- [x] Create / Rename / Delete team
- [x] Team manager (team lead)
- [x] Team members (add/remove from org members, inline chips)
- [x] Team statistics / performance / activity timeline — performance leaderboard (task completion) + recent team activity on `/directory`

## M7 — Departments  → **DONE (Phase 3)** (`/structure` → Departments)
- [x] Create / Rename / Delete department
- [x] Department manager
- [x] Office link + member count
- [x] Department dashboard / analytics — per-department dialog (people, teams, task throughput) on `/structure`

## M8 — Workspace Access  → **mostly DONE**
- [x] Login history — "Recent sign-ins" card in Settings → Security (self) + admin view in HR → Reports
- [x] Device management — Sessions manager (device/OS/browser/IP)
- [x] Active sessions — `/settings` → Security
- [x] Force logout — revoke session + sign-out-everywhere (session-enforced JWT)
- [x] Disable account — suspend/delete revoke sessions → immediate lockout enforced
- [x] Password reset — forgot-password + reset flow + revokes sessions
- [x] Two-factor authentication — TOTP setup/enable/disable
- [x] Passkeys — WebAuthn as 2nd factor
- [x] Session timeout — configurable workspace idle auto-sign-out (Settings → Security)

## M9 — Employee Productivity  → **DONE (Phase 5 + 6)**
- [x] Time tracking — per-project time log
- [x] Task completion — tasks board + status
- [x] Productivity snapshot (per employee) — tasks total/done/overdue/completion% on profile
- [x] Attendance — clock in / clock out + history (`/hr`)
- [x] Leave requests — submit + approve/reject workflow (`/hr`)
- [x] Holiday calendar — org holiday list, HR-managed (`/hr`)
- [x] Working-hours totals / attendance analytics — per-employee hours this month + attendance rate in HR → Analytics

## M10 — Notifications  → infra done, events not wired
- [x] In-app notifications system (bell + polling) + email (SMTP)
- [x] Invite notification — inviter notified when invite accepted
- [x] Role changed notification — member notified on role change / new-owner
- [x] Team changed notification — on department change + team add
- [x] Password changed notification
- [x] Login alert — new sign-in notification (with IP)
- [x] Account disabled notification — suspend / remove / reactivate

## M11 — Audit & Security  → mostly done
- [x] User audit logs — `/audit` viewer (owner/admin)
- [x] Permission change logs — `user.role_changed` + `workspace.ownership_transferred`
- [x] Login audit — `auth.login` / `login_failed` / `mfa_failed`
- [x] Invite audit — `invite.created` / `invite.cancelled` / `invite.accepted`
- [x] Delete audit — `*.deleted` incl. `user.deleted` / `user.suspended`
- [x] Restore audit — `user.restored`
- [x] Admin action history — audit log captures admin actions

## M12 — Client Portal  → mostly done
- [x] Client account — Contact with portal login enabled
- [x] Client login — separate `gnevo_portal` cookie + portal auth
- [x] Client profile — client edits own name + phone from the portal
- [x] Assigned account manager — set per customer (staff member); shown on customer detail + in the client portal
- [x] Assigned projects / invoices / tickets — per-record portal visibility (show/hide each) + section permissions gate what each client sees
- [x] Client permissions — granular per-contact portal permissions (projects / invoices / tickets)
- [x] Client profile — client edits own name + phone from the portal

## M13 — Reports
- [x] User export — CSV / **Excel (.xlsx)** / **PDF** from `/directory`
- [x] Productivity report — per-employee productivity (tasks total/done/overdue/completion%) in profile dialog + `/profile`
- [x] People analytics — HR analytics tab (headcount by role & department, attendance rate, leave stats) on `/hr`
- [x] Login history + attendance-history reports — HR → Reports tab (recent sign-ins w/ IP + all-employee attendance log)

---

## Verdict — should we implement it?

**Yes — strongly recommended.** The product's stated goal is a multi-role workspace
(Owner / Admin / Manager / Employee / Client). Right now that promise is only half-true:
the permission *engine* is solid but an admin **cannot actually add or manage a
teammate from the UI**. This is the single biggest gap for real-world use.

Almost all of it is **buildable now with no paid credentials** (SMTP for invite emails
is already set up). Only the HR-style pieces (attendance/leave/holiday) are optional/larger.

### Recommended phased plan (each phase = one build + verify batch)

1. ✅ **DONE — Invite + membership core** — invite by email (signed token + `/auth/invite`
   accept page + welcome email via SMTP), bulk/CSV, role-on-invite, pending/expired/
   resend/cancel, invite audit + notification, auto account creation + sign-in.
2. ✅ **DONE — Member management UI** — `/directory` is now a full people admin: change
   role, owner-only promote/demote admin, suspend/reactivate (revokes sessions),
   delete/restore, guards (no owner delete, no last-admin delete/suspend/demote),
   transfer ownership.
3. ✅ **DONE — Departments / Teams / Offices CRUD** — `/structure` page (Offices/Departments/Teams
   tabs): create/rename/delete each, department office+manager, team lead + add/remove members,
   invite dialog department+team pickers (applied on accept).
4. ✅ **DONE — Custom roles + permission matrix** — `/roles` page: resource×action grid editor,
   per-role data scope (org/dept/own), create/edit/clone/delete custom roles, assign any role
   (system or custom) to members via the directory dropdown.
5. ✅ **DONE — Employee profile + productivity + user report** — "Manage profile" dialog
   (designation/employee-ID/joining-date/reporting-manager + department/office/teams + productivity
   stats), team CSV export. _Org-wide productivity/attendance reports = later._

**Auth fix (2026-07-30):** JwtAuthGuard now loads **live roles + status from the DB every request**
(token roles could be stale after an ownership transfer → "only owner can demote admin" until
re-login). Role changes, suspend, and delete now take effect immediately, no re-login.

6. ✅ **DONE — HR add-ons** — `/hr` page: attendance (clock in/out + history), leave requests
   (submit + HR/admin approve/reject + cancel), holiday calendar (HR-managed). Profile page (`/profile`)
   rebuilt with dynamic employment details (designation / employee-ID / joining date / reporting manager /
   department / office / teams) + productivity stats.

**All 6 phases of the Workspace User Management System are complete** + the polish pass:
avatar upload (1 MB limit), CSV/Excel/PDF user export, HR people-analytics dashboard, and a
configurable session idle-timeout. Remaining are only genuine nice-to-haves: dedicated login/attendance
history reports, record-level ACLs, and paid integrations (SSO/SCIM). — API + UI to create/rename/delete, assign
   manager + members, assign employees to dept/team; wire scopes.
4. **Custom roles + permission matrix UI** — build on `Role`/`role_permissions` tables:
   create/clone role, toggle resource×action grid.
5. **Employee profile + productivity** — designation/employee-id/joining-date/reporting-
   manager fields, per-employee productivity dashboard; user reports (CSV/Excel/PDF).
6. **HR add-ons (optional)** — attendance, leave requests, holiday calendar.

Phase 1 + 2 together deliver the core "manage employees & admins" capability the
workspace is missing today.
