# NoExcuses Dark Red — remaining screen specification

This document defines the second phase of the Dark Red redesign. It builds on `codex/dark-red-redesign-foundation` and must preserve all existing behavior.

## Shared visual language

- matte black app background
- deep red primary accent
- compact 10–14px cards
- thin borders and restrained glow
- strong condensed headings
- large numeric emphasis
- mobile-first spacing
- semantic cyan for freezes, green for success and amber for warnings

## Goals

- redesign list hierarchy and filters
- keep all existing complete, skip, freeze, postpone, edit and create actions
- use compact cards with clear status badges
- prevent action buttons from becoming unreadable at 320px
- make primary action full-width where needed

## Programs

- preserve every existing program flow and all current program data
- do not alter fitness logic, timers, exercise order or completion behavior
- redesign program cards, progress, day state and CTA
- visually distinguish active, locked and completed days
- keep video, description and timer behavior intact

## Competitions

- preserve Catalog / Mine / Create flows and typed API integration
- redesign filters and segmented tabs
- improve challenge cards, participant information and CTA hierarchy
- use compact responsive layouts
- preserve Join, Accept, Decline, Cancel and Create behavior

## Stats

- use the Dark Red foundation primitives
- keep all existing calculations and chart data
- emphasize weekly XP, success rate, streaks and totals
- keep chart readable on 320px

## Profile

- redesign user header, XP, level, subscription/account and achievements
- preserve all current actions and navigation
- avoid fake data

## Forms, modals and states

- consistent field labels, controls and validation states
- consistent loading, empty, error and success states
- safe-area aware bottom sheets
- no content hidden behind floating buttons or bottom navigation

## Navigation and responsive QA

- test at 320px, 375px and 430px
- no horizontal scrolling
- six bottom tabs remain readable and tappable
- minimum practical touch targets
- support reduced motion

## Validation

- `npm run typecheck`
- lint changed files
- `npm test`
- `npm run build` where possible
- Vercel Preview Ready
- manual screenshots for Dashboard, Goals, Programs, Competitions, Stats and Profile
