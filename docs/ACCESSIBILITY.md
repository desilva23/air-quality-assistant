# Accessibility

Target: WCAG 2.2 AA. Checked by axe in component tests and in a real browser on every push.

## What is implemented

| Need | How it is met | Where |
| --- | --- | --- |
| Structure | Header, `main id="main"`, footer; one `h1`, ordered headings; a skip link as the first stop | `src/app/layout.tsx`, `src/components/AssistantApp.tsx` |
| Forms | Every control has a visible label; household choices are grouped in fieldsets with legends | `src/components/HouseholdFieldsets.tsx`, `src/components/fields.tsx` |
| Feedback | `role="status"` for search results, live air, answers and copy confirmations; `role="alert"` for failures; focus moves to a new plan's heading, and a newly picked place's reading scrolls into view | `src/components/PlaceSearch.tsx`, `src/components/PlanPanel.tsx`, `src/components/AirSection.tsx` |
| Keyboard | Everything is reachable and operable, with visible `:focus-visible` rings and no traps | `src/app/styles/base.css` |
| Colour | AQI bands are always named in text; the colour scale and the sky band's tint are decorative; AA contrast in light and dark, checked by axe on every sky colour the tests produce | `src/components/SkyReading.tsx`, `src/app/styles/sky.css`, `src/app/styles/tokens.css` |
| Chart | A text summary as the chart's accessible name, a readout of the hovered hour, and the full values in a table | `src/components/OutlookChart.tsx` |
| Preferences | `prefers-color-scheme`, `prefers-reduced-motion`, `prefers-contrast: more`, `forced-colors` | `src/app/styles/preferences.css` |
| Reflow and targets | No horizontal scroll at 320 px; buttons, chips and inputs at least 44 px | `src/app/styles/forms.css` |
| Language | `lang="en-IN"` on `<html>` | `src/app/layout.tsx` |

## How it is tested

- **Component tests:** axe on every panel in jsdom (`tests/ui`).
- **Browser tests:** axe with every rule, including colour contrast, in light and dark with a plan showing and the table open; reflow at 320 px; skip link focus (`e2e/quality.spec.ts`).
- **Lighthouse:** Accessibility 100 on mobile and desktop, on the live site (26 November 2026).
