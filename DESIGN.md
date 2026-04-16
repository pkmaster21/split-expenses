# Design System — Tabby

Tabby is a casual expense-splitting PWA for friends. The design should feel like something a clever friend built — not a fintech product, not a startup landing page. Friendly, clean, playful. Every screen should feel immediately usable on mobile without training.

---

## 1. Visual Theme & Atmosphere

Tabby's design is deliberately un-corporate. Where Splitwise looks like a business tool and Venmo looks like a payment processor, Tabby looks like something your friend made — in the best possible way. The visual language is warm and minimal: generous whitespace, a single bold accent color, and a running cat motif that earns its place without being kitschy.

The signature is the **brand orange** (`#F97316`) — warm, energetic, distinctly cat-colored. It appears exactly where you need to act: primary buttons, active states, the logo. Everywhere else, the palette is warm stone neutrals on a barely-there cream background. Nothing competes with the orange.

The logo is the cleverest part: a rounded rectangle with two triangular peaks at the top corners — simultaneously a receipt (tab) and cat ears. It works at 20px or 200px. It never needs a wordmark next to it.

**Key Characteristics:**
- Warm cream canvas (`#FAFAF8`) — not pure white, not gray-50. Slightly warm.
- **Plus Jakarta Sans** — slightly rounded, clean, modern-casual. Friendly without novelty.
- Brand orange (`#F97316`) as the single accent — used for CTAs and active states only.
- Warm stone neutrals everywhere else — `#1C1917`, `#78716C`, `#A8A29E`, `#E7E5E4`.
- Paw print background pattern in orange at 6% opacity on auth/landing screens.
- Cards are white with a subtle warm ring (`ring-1 ring-black/[0.06]`) — no flat gray borders.
- `rounded-2xl` (16px) for cards and major containers. `rounded-xl` (12px) for buttons and inputs.

---

## 2. Color Palette & Roles

### Brand
- **Orange** (`#F97316`): The only chromatic color. Primary CTA buttons, active tab indicators, logo fill, focus rings. Never use for decorative purpose.
- **Orange Dark** (`#EA580C`): Hover/pressed state for primary orange elements.
- **Orange Surface** (`#FFF7ED`): Tinted background for orange-adjacent UI (e.g., badges, subtle call-outs).

### Page Surfaces
- **Warm Cream** (`#FAFAF8`): Primary page background. Slightly warmer than pure white.
- **Card White** (`#FFFFFF`): Card and elevated surface background. Contrasts with the cream canvas.

### Text
- **Charcoal** (`#1C1917`): Primary text. Warm near-black, never pure `#000000`.
- **Stone** (`#78716C`): Secondary / muted text. Labels, metadata, placeholder contexts.
- **Muted** (`#A8A29E`): Tertiary text. Empty states, helper text, timestamps.

### Semantic
- **Green** (`#16A34A`): Positive balances, "settled up" states.
- **Red** (`#DC2626`): Negative balances, destructive actions, error states.
- **Border** (`#E7E5E4`): Subtle dividers and structural borders. Used sparingly.

### Neutrals
All neutrals use Tailwind's `stone` scale — every gray has a warm undertone. Never use `gray`, `slate`, or `zinc` scales.

| Token | Hex | Tailwind |
|-------|-----|----------|
| Charcoal | `#1C1917` | `stone-900` |
| Stone | `#78716C` | `stone-500` |
| Muted | `#A8A29E` | `stone-400` |
| Border | `#E7E5E4` | `stone-200` |
| Warm Cream | `#FAFAF8` | `stone-50` (approx) |

---

## 3. Typography Rules

### Font Family
- **UI Font**: `Plus Jakarta Sans` — loaded from Google Fonts. Used for everything.
- **Fallback**: `system-ui, -apple-system, sans-serif`
- No serif fonts. No monospace outside of code contexts.

### Hierarchy

| Role | Size | Weight | Line Height | Notes |
|------|------|--------|-------------|-------|
| Hero / App Name | 40px (2.5rem) | 800 | 1.1 | Landing page "Tabby" title |
| Page Title | 24px (1.5rem) | 700 | 1.2 | Section headings, group names |
| Card Title | 18px (1.125rem) | 600 | 1.3 | Expense description, group name in list |
| Body | 16px (1rem) | 400 | 1.5 | Standard body text |
| Body Medium | 16px (1rem) | 500 | 1.5 | Button text, interactive labels |
| Small | 14px (0.875rem) | 400–500 | 1.4 | Member count, metadata, secondary labels |
| Caption | 12px (0.75rem) | 400–500 | 1.3 | Timestamps, section headers (all-caps) |

### Principles
- **All-caps section labels**: Small labels above content sections (e.g., "YOUR GROUPS", "NET BALANCES") use 11–12px, weight 500, `tracking-wider`, stone-500. These create hierarchy without size.
- **No italics** in the UI.
- **Amounts are always bold**: Dollar figures use `font-semibold` (600) to visually pop.
- **Never truncate important text**: Group names and expense descriptions get `truncate` only when inside constrained card widths.

---

## 4. Component Stylings

### Buttons

**Primary (Orange)**
- Background: Orange (`#F97316`)
- Text: white
- Hover: Orange Dark (`#EA580C`)
- Radius: `rounded-xl` (12px)
- Padding: `px-5 py-2.5` (md), `px-6 py-3` (lg), `px-3 py-1.5` (sm)
- Font: medium (500), 14–16px
- No border, no shadow — the color carries all the weight
- Disabled: 50% opacity

**Secondary**
- Background: white
- Text: Charcoal (`#1C1917`)
- Border: `ring-1 ring-stone-200`
- Hover: `bg-stone-50`
- Same radius and padding as primary

**Ghost**
- Background: transparent
- Text: Stone (`#78716C`)
- Hover: `bg-stone-100` text Charcoal
- No border

**Danger**
- Background: Red (`#DC2626`)
- Text: white
- Hover: `#B91C1C`
- Same radius as primary

### Cards & Containers
- Background: white (`#FFFFFF`)
- Ring: `ring-1 ring-black/[0.06]` — a subtle warm halo, not a flat border
- Radius: `rounded-2xl` (16px) for main cards, `rounded-xl` for smaller panels
- Padding: `p-4` standard, `p-5` for settings sections
- No drop shadows — ring is sufficient

### Inputs
- Border: `border border-stone-200`
- Focus: `focus:ring-2 focus:ring-orange-500 focus:border-transparent`
- Radius: `rounded-xl` (12px)
- Padding: `px-3.5 py-2.5`
- Font: 14–15px
- Disabled: `bg-stone-50 text-stone-400`
- Error state: `border-red-400 focus:ring-red-400`

### Navigation / Header
- Background: white
- Bottom border: `border-b border-stone-100`
- Sticky top, `z-10`
- Logo left, actions right
- Max width: `max-w-2xl mx-auto` for content centering on wide screens

### Tabs
- Pill style (not underline)
- Active: `bg-orange-500 text-white`
- Inactive: `text-stone-500 hover:text-stone-700`
- Container: `bg-stone-100 rounded-xl p-1`
- Individual tab: `rounded-lg px-4 py-1.5 text-sm font-medium transition-colors`

### Badges
- Roles (owner, admin): `bg-orange-100 text-orange-700` — warm, branded
- Split type (equal, exact, percentage): `bg-stone-100 text-stone-600`
- Positive state: `bg-green-100 text-green-700`
- Negative state: `bg-red-100 text-red-700`
- Shape: `rounded-full` pill
- Size: `text-xs px-2 py-0.5`

### Avatars
- Shape: `rounded-full`
- Color: deterministic from name hash — use the warm color pool (amber, orange, rose, teal, violet, etc.)
- Sizes: sm=28px, md=36px, lg=48px
- Text: white initials, `font-semibold`

### Loading Spinner
- `border-orange-500` (not indigo)
- 4px border, border-t transparent
- `rounded-full animate-spin`

### Modals
- Backdrop: `bg-black/40`
- Panel: white, `rounded-t-2xl sm:rounded-2xl`, `shadow-xl`
- Slides up from bottom on mobile (`items-end`), centered on desktop (`sm:items-center`)
- Max width: `sm:max-w-lg`
- Header: title left (`font-semibold text-stone-900`), close button right

---

## 5. Layout Principles

### Spacing System
- Base unit: 4px
- Component gaps: `gap-2` (8px), `gap-3` (12px), `gap-4` (16px)
- Section spacing: `space-y-6` (24px) between major sections
- Card padding: `p-4` standard
- Page horizontal padding: `px-4`
- Max content width: `max-w-2xl` (672px) — comfortable single-column for a mobile-first app

### Page Structure
```
<header sticky>     — logo, back link or username, action
<main max-w-2xl>    — scrollable content, px-4 py-6
  <section>         — labeled with all-caps overline
    <cards>         — white, rounded-2xl, ring
```

### Mobile-First
- All layouts are single-column mobile-first
- No horizontal scrolling
- Touch targets minimum 44×44px
- Bottom sheet modals on mobile
- Sticky header never disappears (z-10)

### Whitespace Philosophy
- **Give things room**. Empty states should have generous `py-12` padding.
- **Don't pack sections**. `space-y-6` between sections, `space-y-3` between cards.
- **Let the page breathe**. A simple app with 5 expenses should not feel dense.

---

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| Canvas | `bg-[#FAFAF8]` warm cream | Page background |
| Raised | white + `ring-1 ring-black/[0.06]` | Cards, panels, modals |
| Interactive | + `hover:ring-orange-200` on hover | Clickable cards |
| Overlay | `bg-black/40` backdrop | Modal backdrop |

**No drop shadows** on cards. The white-on-cream contrast plus the subtle ring creates sufficient elevation. Drop shadows are reserved for the modal panel only (`shadow-xl`).

---

## 7. Do's and Don'ts

### Do
- Use `stone-*` for all neutrals — every gray must have a warm undertone
- Use orange (`#F97316`) only where the user needs to act
- Use `ring-1 ring-black/[0.06]` for card depth instead of borders or shadows
- Use `rounded-2xl` for cards, `rounded-xl` for buttons and inputs
- Use Plus Jakarta Sans for all text
- Show dollar amounts in `font-semibold` so they visually pop
- Keep all pages `max-w-2xl` centered
- Use pill-style tabs (not underline tabs)
- Format the group name in the dashboard header, not "Group Dashboard"
- Use all-caps `tracking-wider` for section labels

### Don't
- Don't use `gray-*`, `slate-*`, or `zinc-*` — always `stone-*`
- Don't use `indigo-*` anywhere — that's the old palette, fully replaced
- Don't add drop shadows to cards
- Don't use underline-style tabs
- Don't write "Group Dashboard" as a page title — use the actual group name
- Don't use emoji as UI icons (decorative ok, functional never)
- Don't use the paw print background on app pages — only on landing/auth screens
- Don't stack more than 3 actions in a card row
- Don't use `bg-gray-50` — the page background is `bg-[#FAFAF8]`

---

## 8. Responsive Behavior

### Breakpoints (Tailwind defaults)
| Name | Width | Strategy |
|------|-------|----------|
| Mobile (default) | <640px | Single column, bottom-sheet modals, full-width buttons |
| sm | 640px+ | Modals center (not bottom sheet), side-by-side form buttons |
| md | 768px+ | Max-width container centers with padding |

### Touch Targets
- All interactive elements: minimum 44×44px effective touch area
- Buttons use generous padding to achieve this
- Delete/edit icons on expense cards: `p-2` wrapper around small icons

### Collapsing Strategy
- Navigation: never collapses — header stays simple enough for mobile
- Cards: always full width single column
- Modals: bottom sheet on mobile, centered on sm+
- Member avatars: horizontal scrolling `flex overflow-x-auto` if many members
- Tab bar: always visible, pills never wrap

### PWA Install
- `theme-color` meta = orange (`#F97316`)
- Standalone display mode: hide browser chrome, app feels native
- Safe area insets: `pb-safe` on sticky footers if added
- Touch callout disabled on interactive elements via `-webkit-touch-callout: none`

---

## 9. Agent Prompt Guide

### Quick Color Reference
- Brand CTA: Orange (`#F97316`)
- Brand Hover: Orange Dark (`#EA580C`)
- Page background: Warm Cream (`#FAFAF8`)
- Card surface: white (`#FFFFFF`)
- Primary text: Charcoal (`#1C1917`)
- Muted text: Stone (`#78716C`)
- Tertiary text: Muted (`#A8A29E`)
- Positive: Green (`#16A34A`)
- Negative: Red (`#DC2626`)
- Card ring: `ring-1 ring-black/[0.06]`

### Tailwind Shorthand
- Page bg: `bg-[#FAFAF8]` or `bg-stone-50`
- Card: `bg-white rounded-2xl ring-1 ring-black/[0.06] p-4`
- Primary button: `bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium`
- Section label: `text-xs font-semibold text-stone-500 uppercase tracking-wider`
- Muted text: `text-stone-500`
- Positive amount: `text-green-600 font-semibold`
- Negative amount: `text-red-600 font-semibold`
- Orange badge: `bg-orange-100 text-orange-700 rounded-full text-xs px-2 py-0.5`
- Active pill tab: `bg-orange-500 text-white rounded-lg px-4 py-1.5 text-sm font-medium`

### Example Component Prompts
- "Create an expense card on a white `rounded-2xl ring-1 ring-black/[0.06] p-4` surface. Description in Charcoal (#1C1917) at 15px weight 500. Payer + date in Stone (#78716C) at 13px. Amount in Charcoal at 15px font-semibold. Edit/delete icon buttons as ghost actions in Muted (#A8A29E)."
- "Build a balance row: Avatar left, display name in Charcoal 15px, net amount right in Green (#16A34A) or Red (#DC2626) font-semibold. White card, rounded-2xl, ring."
- "Design the landing page: Warm Cream (#FAFAF8) background with subtle paw print pattern at 6% opacity in orange. Center the Tabby logo (48px), 'Tabby' in 40px 800-weight Charcoal, tagline in Stone. Orange primary CTA full-width, secondary CTA with ring-1 ring-stone-200."
- "Style the dashboard header: sticky white bar, border-b border-stone-100. Left: Tabby logo 24px + group name in Charcoal 17px font-semibold. Right: settings gear icon ghost button."

### Iteration Guide
1. Always reference color by hex or Tailwind name — "orange-500" not "orange"
2. Use `stone-*` for all gray/neutral needs — never `gray-*`
3. Cards use `ring-1 ring-black/[0.06]` — not `border border-gray-200`
4. Tabs are always pill style — never underline
5. The page title in dashboard is the group name — never "Group Dashboard"
6. When in doubt, add more whitespace — this app's personality is spacious
