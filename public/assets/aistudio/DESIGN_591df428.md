---
name: Petrochemical IMS Material
colors:
  surface: '#f4faff'
  surface-dim: '#d5dbe0'
  surface-bright: '#f4faff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eef4f9'
  surface-container: '#e9eff4'
  surface-container-high: '#e3e9ee'
  surface-container-highest: '#dde3e8'
  on-surface: '#161c20'
  on-surface-variant: '#43474d'
  inverse-surface: '#2b3135'
  inverse-on-surface: '#ebf1f6'
  outline: '#74777d'
  outline-variant: '#c3c6cd'
  surface-tint: '#4a607a'
  primary: '#00172c'
  on-primary: '#ffffff'
  primary-container: '#142c43'
  on-primary-container: '#7d94af'
  inverse-primary: '#b1c9e6'
  secondary: '#29628e'
  on-secondary: '#ffffff'
  secondary-container: '#9bceff'
  on-secondary-container: '#1b5883'
  tertiary: '#001a13'
  on-tertiary: '#ffffff'
  tertiary-container: '#003126'
  on-tertiary-container: '#3fa187'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d0e4ff'
  primary-fixed-dim: '#b1c9e6'
  on-primary-fixed: '#021d33'
  on-primary-fixed-variant: '#324861'
  secondary-fixed: '#cde5ff'
  secondary-fixed-dim: '#97ccfd'
  on-secondary-fixed: '#001d32'
  on-secondary-fixed-variant: '#004a75'
  tertiary-fixed: '#95f5d6'
  tertiary-fixed-dim: '#78d8bb'
  on-tertiary-fixed: '#002018'
  on-tertiary-fixed-variant: '#005140'
  background: '#f4faff'
  on-background: '#161c20'
  surface-variant: '#dde3e8'
  surface-canvas: '#eaf0f5'
  surface-card: '#ffffff'
  success-iso: '#16846b'
  warning-capa: '#d97706'
  critical-hse: '#dc2626'
  border-hairline: '#d1dce5'
typography:
  headline-xl:
    fontFamily: Vazirmatn
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 54px
  headline-xl-mobile:
    fontFamily: Vazirmatn
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 42px
  headline-lg:
    fontFamily: Vazirmatn
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 46px
  headline-lg-mobile:
    fontFamily: Vazirmatn
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 36px
  headline-md:
    fontFamily: Vazirmatn
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Vazirmatn
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 28px
  title-md:
    fontFamily: Vazirmatn
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Vazirmatn
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Vazirmatn
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
  body-sm:
    fontFamily: Vazirmatn
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: Vazirmatn
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 20px
  label-md:
    fontFamily: Vazirmatn
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  label-code:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-sm: 1rem
  margin: 1.5rem
  margin-mobile: 0.75rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

The design system establishes the visual and structural grammar for an enterprise-grade Integrated Management System (IMS) deployed in petrochemical refining environments. Designed natively for Persian (RTL) workflows, the interface projects industrial precision, rigorous compliance governance, and calm operational focus under heavy telemetry loads.

The visual style blends Material Design architecture with clean corporate minimalism:
- Structured white surface modules elevated above a cool slate-tinted canvas.
- Crisp, high-contrast hierarchical chrome framed in commanding navy and authoritative blue tones.
- Utilitarian data density balancing international petrochemical management standards (ISO 9001, ISO 14001, ISO 45001, ISO 50001).
- Tactile, modern affordances with refined geometry and ambient elevation tiers.

## Colors

The palette establishes an executive enterprise presence rooted in deep maritime blues and mineral slates:

- **Primary Navy (`#142C43`)**: Anchors global headers, core navigation frames, structural highlights, and primary typography.
- **Secondary Blue (`#1E5A85`)**: Directs interactive focus, active navigation states, telemetry selection, and high-frequency operational controls.
- **Tertiary Success Emerald (`#16846B`)**: Dedicated to ISO certification badges, compliant operational states, passing KPIs, and safe incident thresholds.
- **Neutral Surface (`#EAF0F5`)**: Forms the calm, anti-glare foundational canvas behind all floating panels.
- **Pure White (`#FFFFFF`)**: Strictly reserved for primary data cards, dialog surfaces, table rows, and input panel backdrops.

## Typography

The typographic system utilizes a dual-font strategy tailored for bilingual Persian-Latin industrial platforms:

- **Primary Persian Typeface (Vazirmatn)**: Serves all UI controls, long-form compliance reports, headings, and metadata. Features optimized shaping and clear diacritical separation for Persian text.
- **Technical Latin Typeface (Inter)**: Handles tabular data, numerical readouts, ISO code references (e.g., `ISO 45001`), equipment tags, and audit timestamps.
- **RTL Legibility Rules**: Letter spacing is strictly set to `0px` across both scripts to prevent Persian ligature disconnects. Text transform rules (`text-transform: uppercase`) are prohibited across all Persian UI labels.

## Layout & Spacing

The layout is built upon a 12-column responsive fluid grid operating in native right-to-left orientation:

- **Desktop (≥ 1280px)**: Persistent primary navigation rail and sidebar positioned along the right viewport boundary (`260px` standard, `72px` collapsed). Main content area fluidly occupies remaining width up to a `1440px` inner constraint with `1.5rem` outer margins.
- **Tablet (768px – 1279px)**: The navigation sidebar transitions into an off-canvas drawer accessed from the header bar. Grid gutters compress to `1rem`.
- **Mobile (< 768px)**: 4-column KPI cards and multi-column telemetry forms reflow into single-column vertical stacks. Screen margins compress to `0.75rem`.
- **Rhythm**: Element padding and margins adhere to an 8px base grid, utilizing `0.25rem` (4px) increments for compact badges and tight tabular metrics.

## Elevation & Depth

Visual hierarchy uses low-contrast ambient shadows paired with subtle structural hairline borders (`#D1DCE5`) over the neutral `#EAF0F5` surface:

- **Level 0 (Canvas Base)**: Flat `#EAF0F5` background across main application shells.
- **Level 1 (Card & Module Containers)**: `#FFFFFF` surface with an ambient diffuse shadow `0px 2px 8px -2px rgba(20, 44, 67, 0.08)` and a `1px solid #D1DCE5` border.
- **Level 2 (Active/Hover States & Menus)**: `0px 8px 20px -4px rgba(20, 44, 67, 0.12)` with refined surface continuity.
- **Level 3 (RTL Navigation & Global Header)**: Direct boundary isolation using `box-shadow: -4px 0 16px 0 rgba(20, 44, 67, 0.06)` for the right sidebar.
- **Level 4 (Modals & Audit Drawers)**: High-prominence modal shadow `0px 24px 40px -10px rgba(20, 44, 67, 0.22)`.

## Shapes

The design system maintains clean, functional geometry balanced between enterprise structure and modern Material curves:

- **Base Radius (`0.5rem` / `8px`)**: Applied to standard form inputs, textareas, table row highlights, and dropdown sheets.
- **Sub-Radius (`0.25rem` / `4px`)**: Applied to data table checkboxes, progress tracks, and inline code tags.
- **Large Radius (`1rem` / `16px`)**: Applied to cards, KPI modules, modal dialogs, and compliance summaries.
- **Pill Radius (`9999px`)**: Reserved for action buttons, filter tags, search bars, and ISO status badges.

## Components

### Buttons
- **Primary**: Background `#142C43`, text `#FFFFFF`, font weight `600`, pill-shaped (`border-radius: 9999px`). Hover state transitions to `#1E5A85`.
- **Secondary / Action**: Background `#1E5A85`, text `#FFFFFF`, pill-shaped. Hover deepens to `#142C43`.
- **Subtle / Tonal**: Background `#EAF0F5`, text `#1E5A85`, pill-shaped. Hover shifts to `#FFFFFF` with a `1px solid #D1DCE5` outline.

### Input Fields & Selects
- Height fixed at `44px` (dense: `36px`). Background `#FFFFFF`, border `1px solid #D1DCE5`, radius `8px`.
- Active focus state applies a crisp `2px solid #1E5A85` outline with no blur glow.
- Labels and trailing helper icons align strictly to the right edge with Persian typography rules.

### Checkboxes & Radios
- Checkboxes: `18px x 18px`, `4px` radius. Active state filled with `#142C43` and a white check icon.
- Radios: `18px x 18px`, concentric circle displaying a `#1E5A85` centered dot when active.

### Cards & Data Panels
- Surface `#FFFFFF`, border radius `16px`, padding `1.5rem`, wrapped in a hairline `#D1DCE5` outline.
- Card headers position the Persian title on the right and operational actions or status chips on the left.

### ISO Badges & Status Chips
- Pill geometry (`9999px`), height `24px`, padding `0.25rem 0.75rem`, font size `12px` Medium.
- **Compliant / Pass (ISO 9001 / 14001 / 45001 / 50001)**: Background `#E6F5F1`, text `#16846B`, border `1px solid #B4E3D8`.
- **Pending / CAPA Notice**: Background `#FEF3C7`, text `#D97706`, border `1px solid #FCD34D`.
- **Non-Conformity / Critical**: Background `#FEE2E2`, text `#DC2626`, border `1px solid #FCA5A5`.

### Data Tables (Audit Logs & KPI Metrics)
- Flush container inside `#FFFFFF` cards. Header cells tinted `#EAF0F5` with `13px` SemiBold Persian labels in `#142C43`.
- Numeric data columns utilize `Inter` font, aligned for tabular comparison. Row borders use `1px solid #D1DCE5` at 50% opacity, transitioning to `#EAF0F5` on hover.