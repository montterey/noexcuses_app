# NoExcuses — Dark Red Redesign Specification

## Direction

Rebuild the visual system around a strict, premium athletic style inspired by the selected concept:

- matte near-black background
- deep red primary accent
- restrained ember/red glow, never bright orange
- compact, sharp cards with thin borders
- condensed/strong display typography for headings
- large numeric emphasis for XP, level, streak and progress
- functional, mobile-first layout for Telegram Mini App
- serious discipline/productivity tone rather than a generic SaaS dashboard

## Design tokens

### Colors

- app background: `#070707`
- elevated background: `#0D0D0E`
- surface: `#121214`
- surface elevated: `#18181B`
- border subtle: `rgba(255,255,255,0.07)`
- border strong: `rgba(220,38,38,0.30)`
- primary red: `#E12D2D`
- primary red hover/pressed: `#B91C1C`
- primary red soft: `rgba(225,45,45,0.12)`
- text primary: `#F5F5F5`
- text secondary: `#A1A1AA`
- text muted: `#71717A`
- success: `#22C55E`
- warning: `#F59E0B`
- freeze/info: `#38BDF8`

Do not use the current orange `#FF6B35` as the main accent after the redesign.

### Shape and spacing

- card radius: 10–14px; avoid overly soft 20–24px cards
- button radius: 8–10px
- section spacing: 20–24px
- thin separators and borders instead of heavy shadows
- subtle red glow only for primary/high-priority elements

### Typography

- body: Inter/system fallback
- strong uppercase or condensed-looking headings using available web-safe/system fonts where practical
- avoid adding a large UI framework
- headings should feel athletic/editorial, but Russian text must remain readable

## UX principles

- preserve all current logic and flows
- no backend, database, Supabase RPC or API contract changes
- no changes to XP, streak, goals, programs or challenge calculations
- do not alter the content or execution logic of the completed `fitness` 30-day program
- keep Telegram safe-area behavior
- all screens must work from 320px width upward
- visible focus states and adequate text contrast
- animations: short, purposeful, reduced-motion safe

## Screen direction

### App shell and navigation

- fixed bottom navigation with black translucent/elevated bar
- five or six current tabs must remain accessible
- active tab uses red icon/text and a subtle red top indicator
- inactive tabs use muted gray
- compact labels must remain legible

### Dashboard

- top brand/user row
- hero stats composition with Level, Total XP, Streak and Daily Progress
- XP progress line
- daily goal list with compact completion controls
- discipline-focused motivational panel
- retain freeze controls and goal actions

### Goals

- strong list hierarchy
- status/filter tabs redesigned as compact segmented controls
- compact goal cards with clear progress and action states
- preserve complete/skip/freeze/postpone/add behavior

### Programs

- premium program cards with bold progress percentage and clear current-day CTA
- preserve all workout/program execution behavior
- do not modify program data or timers unnecessarily

### Competitions

- catalog, mine and create remain available
- challenge cards use red-accented status, participant count and primary CTA
- creation form uses the same visual system
- preserve typed challenge API integration

### Stats and Profile

- use the same cards, typography and token system
- emphasize numbers and achievements
- no logic rewrites

## Implementation strategy

Prefer reusable primitives/tokens rather than repeatedly hardcoding class strings:

- shared design tokens in Tailwind config and global CSS
- reusable `AppCard`, `SectionHeader`, `StatCard`, `PrimaryButton`, `SegmentedControl`, `StatusBadge`, `ProgressBar` only where they reduce duplication
- avoid an over-engineered component library

## Validation

- `npm run typecheck`
- lint changed files
- `npm test`
- `npm run build` where environment allows
- Vercel Preview must be Ready
- inspect at 320px, 375px and 430px widths
- verify no horizontal scrolling
- verify all existing tabs and actions still work
