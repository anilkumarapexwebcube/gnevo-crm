# 10 · Design System

> Deliverable 11. The complete visual language: tokens (color, typography, spacing, radius, shadow, motion), component specs, states, and accessibility rules. Bar to beat: HubSpot, Linear, Notion, ClickUp, Monday, Stripe & Vercel dashboards.

---

## 1. Design principles

1. **Fast is a feature.** Keyboard-first, ⌘K everywhere, instant optimistic UI, no spinners where a skeleton or optimistic update works.
2. **Calm density.** Show a lot of data without noise — Linear-level information density with Notion-level breathing room.
3. **One system, two themes.** Light + dark are first-class, defined purely by tokens; no hard-coded colors.
4. **Accessible by default.** WCAG 2.2 AA minimum; keyboard operable; visible focus; reduced-motion respected.
5. **Consistent, not rigid.** A tight primitive set + composable patterns; escape hatches are rare and deliberate.

---

## 2. Design tokens

Tokens are defined as **CSS custom properties** (Tailwind v4 `@theme`) so themes swap at the `:root`/`.dark` level. Semantic tokens map to primitives.

### Color — primitives → semantic
```css
/* Primitive scale (example: brand + neutrals; each has 50–950) */
--brand-500: oklch(0.62 0.19 265);   /* primary indigo/violet */
--neutral-0..1000                     /* gray ramp */
--green/amber/red/blue scales         /* status */

/* Semantic (what components actually use) */
--bg: var(--neutral-0);           --bg-subtle: var(--neutral-50);
--surface: #fff;                  --surface-hover: var(--neutral-50);
--border: var(--neutral-200);     --border-strong: var(--neutral-300);
--text: var(--neutral-900);       --text-muted: var(--neutral-500);
--primary: var(--brand-500);      --primary-fg: #fff;
--ring: var(--brand-500);
--success: var(--green-500); --warning: var(--amber-500);
--danger: var(--red-500);    --info: var(--blue-500);
```
`.dark` remaps the same semantic tokens to dark values. **Components never reference primitives directly — only semantic tokens.** Use **OKLCH** for perceptually uniform ramps and reliable contrast.

### Status colors (semantic meaning is fixed across the app)
| State | Token | Use |
|---|---|---|
| Success / Won / Paid / Active | `--success` | positive terminal states |
| Warning / Due soon / Pending | `--warning` | needs attention |
| Danger / Lost / Overdue / Error | `--danger` | negative/destructive |
| Info / New / In progress | `--info` | neutral-informational |
| Neutral / Draft / Archived | `--text-muted` | inactive |

### Typography
- **Font:** `Inter` (UI) + `Geist Mono` / `JetBrains Mono` (numbers, code, IDs). Variable fonts, `font-feature-settings` for tabular numerals in tables.
- **Type scale (rem):** `xs .75 / sm .875 / base 1 / lg 1.125 / xl 1.25 / 2xl 1.5 / 3xl 1.875 / 4xl 2.25`.
- **Weights:** 400 body, 500 medium (labels), 600 semibold (headings/buttons).
- **Line-height:** 1.5 body, 1.2 headings. **Tabular numerals** enforced in all data tables/metrics.

### Spacing & layout
- **4px base grid:** `0,1(4),2(8),3(12),4(16),6(24),8(32),12(48),16(64)`.
- **Radius:** `sm 6 / md 8 / lg 12 / xl 16 / full`. Cards `lg`, inputs/buttons `md`, pills `full`.
- **Shadows:** subtle, layered — `xs` (hairline), `sm` (cards), `md` (dropdowns/popovers), `lg` (modals). Dark mode uses lighter borders + less shadow.
- **Container widths & 12-col grid** for responsive layouts.

### Motion
- **Durations:** `fast 120ms / base 180ms / slow 260ms`. **Easing:** `ease-out` for enter, `ease-in` for exit, spring for drag.
- **Micro-interactions:** button press, hover elevation, checkbox check, toast slide, row highlight on update, pipeline drag.
- **Respect `prefers-reduced-motion`** → disable non-essential animation.

### Elevation & glass
- **Glassmorphism** used sparingly: command palette, floating toolbars, notification center (`backdrop-blur` + translucent surface). Never on dense data surfaces (hurts legibility).

---

## 3. Component library (specs)

Built on **shadcn/ui + Radix** primitives, themed by our tokens, packaged in `packages/ui`. Every interactive component ships all states: **default / hover / active / focus-visible / disabled / loading / error**.

### Core primitives
| Component | Notes / variants |
|---|---|
| **Button** | variants: primary, secondary, outline, ghost, destructive, link; sizes sm/md/lg/icon; loading spinner; leading/trailing icon |
| **Input / Textarea** | label, hint, error, prefix/suffix, char count; invalid state ties to aria |
| **Select / Combobox** | searchable, async, multi-select, grouped, create-new |
| **Checkbox / Radio / Switch** | indeterminate checkbox for tables |
| **Date / Range / Time picker** | timezone-aware |
| **Badge / Tag / Pill** | status-colored, dismissible, count |
| **Avatar** | user, group stack, presence dot, fallback initials |
| **Tooltip / Popover / Hover card** | keyboard accessible |
| **Dialog / Sheet / Drawer** | modal + side-panel (record detail opens in sheet) |
| **Dropdown / Context menu** | keyboard nav, sections, shortcuts shown |
| **Tabs / Segmented control** | |
| **Toast (Sonner)** | success/error/info/loading→resolve, action button, stacking |
| **Progress / Spinner / Skeleton** | skeletons per view shape |

### Patterns (composed)
| Pattern | Purpose |
|---|---|
| **DataTable** | TanStack Table: sort, filter, column visibility/order, pagination (keyset), row selection, bulk actions, sticky header, virtualization, saved views, density toggle, inline edit |
| **Kanban board** | drag-drop pipeline/deals/tasks; WIP counts; column config |
| **PageHeader** | title, breadcrumb, actions, tabs |
| **StatCard / KPI tile** | metric + delta + sparkline (see dataviz rules) |
| **EmptyState** | illustration + explanation + primary CTA (every list has a beautiful one) |
| **FilterBar** | chips, saved views, quick filters |
| **CommandPalette (⌘K)** | global nav + actions + search + AI ask |
| **Timeline / Activity feed** | grouped by day, actor avatars, verbs |
| **DetailPanel (Sheet)** | record 360° view (fields + tabs: activity, notes, files, related) |
| **FormLayout** | RHF + Zod, sectioned, autosave option, dirty-state guard |
| **Notification center** | grouped, read/unread, per-type, mark-all |
| **Charts** | themed Recharts wrappers; follow `dataviz` skill palette rules |

### Navigation
- **Sidebar:** collapsible, sections (Workspace / CRM / Delivery / Marketing / Finance / Reports / Settings), pinned favorites, org/office switcher, presence.
- **Topbar:** global search, ⌘K, notifications, quick-create (+), theme toggle, profile/device menu, AI assistant launcher.
- **Breadcrumbs**, **Tabs**, and **keyboard shortcuts** overlay (`?`).

---

## 4. Charts & data viz

Follow the repo's `dataviz` guidance: one coherent system, accessible in both themes, categorical palette derived from tokens, tabular numerals, no chartjunk. Chart types: line/area (trends), bar (comparison), funnel (pipeline/conversion), donut (share, sparingly), heatmap (activity/rank), sparkline (KPI tiles). Recharts default; switch to ECharts/visx for >10k points.

---

## 5. Accessibility checklist (WCAG 2.2 AA)

- Color contrast ≥ 4.5:1 text / 3:1 large & UI; never color-only signaling (icon+label too).
- Full keyboard operability; logical tab order; visible `focus-visible` ring on every interactive element.
- Radix ensures ARIA roles/labels; forms have associated labels + `aria-invalid`/`aria-describedby`.
- Respect `prefers-reduced-motion` and `prefers-color-scheme`.
- Target sizes ≥ 24px; hit areas padded.
- Screen-reader live regions for toasts, async results, realtime updates.
- Skip-to-content link; landmark regions.

---

## 6. Keyboard shortcuts (Linear-grade)

| Key | Action |
|---|---|
| `⌘K` | Command palette / global search |
| `C` | Create (context-aware: new lead/deal/task) |
| `G then L/D/P` | Go to Leads / Deals / Projects |
| `/` | Focus search |
| `?` | Shortcut cheat sheet |
| `E` `A` `S` | Edit / Assign / Change status on focused record |
| `⌘Enter` | Submit form |
| `[` `]` | Prev/next record in a list |

---

## 7. Theming, tokens delivery & governance

- Tokens live in `packages/ui/src/tokens` + Tailwind preset; consumed by `web` and email templates.
- **Storybook** for every component (states, a11y, dark/light) as living documentation + visual regression (Playwright/Chromatic).
- **Design ↔ code parity:** Figma variables mirror the token names 1:1 (via the `DesignSync` workflow if used).
- Governance: new component requires Storybook story + a11y pass + tokens-only colors before merge (CI-enforced).

Next: [`09-ui-wireframes.md`](09-ui-wireframes.md) and [`11-feature-list.md`](11-feature-list.md).
