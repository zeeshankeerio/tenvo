# Analytics & Reports hub — wiring, audit, roadmap

This document describes how **Analytics & Reports** (`DashboardTabs` → `reports` tab) is wired, what was wrong with the first tab’s charts, and how the other tabs relate to backend code.

## Tab → component → server actions

| Sub-tab | Component | Primary data source |
|--------|-----------|---------------------|
| **Analytics** | `components/AdvancedAnalytics.jsx` | `getAnalyticsBundleAction` (single round-trip) — internally same SQL as the individual actions, scoped by the **dashboard header date range** |
| **Demand Forecast** | `components/DemandForecast.tsx` | `getDemandForecastAction` (+ `AIOrderForecaster` when enabled) |
| **AI Insights** | `components/intelligence/AIInsightsPanel.jsx` | `getAnalyticsBundleAction` + `getDemandForecastAction` (with range) + promos + restock suggestions |
| **Report Builder** | `components/reports/ReportBuilder.jsx` | Canvas widgets remain **layout/demo**; **live snapshot** uses `getAnalyticsBundleAction` with **`mergeReportWindowFilter`**: default **Match header** uses the dashboard range; other presets re-anchor `{ from, to }` on the header **`to`** date. **Save layout / load / export JSON / top-products CSV** persist layouts in **localStorage** (per `business_id`, max 20) until a DB-backed model exists. |

All analytics actions go through `withGuard(..., 'ai_analytics')` and `analytics.basic` permission.

### Date range behaviour

- `resolveAnalyticsRange` / `toAnalyticsIsoDate` in `lib/utils/analyticsRange.js` normalize `{ from, to }` from the dashboard (ISO strings after server-action serialization). Server actions in `lib/actions/premium/ai/analytics.js` import them so the `'use server'` file only exports async actions (Next.js requirement).
- **Top products**, **KPI growth** (current window vs equal-length prior window), and **expense breakdown** use that inclusive range. **Growth** and **top products** sums include **paid, non-cancelled `storefront_orders`** (plus invoices) where applicable.
- **6‑month trend chart** anchors its month buckets on **`to`** (capped in SQL by invoice / storefront / GL row filters), so the chart stays comparable while KPIs respect the filter. Trend **revenue** and **orderCount** combine **invoices** and **paid storefront** orders.

## Root cause: “revenue spikes, sales flat” (fixed)

`getSalesTrendAction` returned:

- `revenue` = sum of invoice `grand_total` (money) — correct.
- `sales` = **invoice count** for the month — correct in SQL, but the **line chart** plotted `sales` on the **same Y-axis as revenue**, so counts looked like **zero** next to thousands of PKR.

**Changes:**

- API now exposes **`orderCount`** explicitly (and no longer mislabels count as “sales” for charting).
- `SalesChart` plots **combined revenue** (invoices + paid storefront) and **GL net profit** on the **left** axis (currency), and **order count** (invoices + paid storefront orders) on the **right** axis when volume is present.
- `RevenueBarChart` uses **`date`** on the X-axis (it previously used `name`, which did not exist on trend rows).
- `TopProductsChart` uses **`value`** (revenue) instead of a non-existent `sales` key; tooltips show **units** when `volume` is present.

## Retention at 0% (clarified, not “broken”)

KPI **retention** = share of **distinct customers with invoices** who have **more than one** invoice. Walk-in / guest checkouts without `customer_id`, or one-off customers, yield **0%** legitimately.

**Changes:** `getKPIMetricsAction` now returns `retentionDetail` (`repeatCustomers`, `invoicedCustomers`). **Analytics** and **AI Insights** show a short explanation under the metric.

## Demand forecast & AI

- **Demand forecast** combines **invoice_items** and **paid storefront_order_items** (last six months, anchored to filter `to`) with **WMA** or **`AIOrderForecaster.forecastDemand`** when `useAI` is true and history exists. Lead time / seasonality come from `domainKnowledge.intelligence` when passed from `DemandForecast` (the AI tab calls the action without that object — optional improvement: pass the same intelligence object).
- **AI Insights** uses `getAnalyticsBundleAction` for the shared analytics block, then loads forecast, promotions, and restock data in parallel.

## Report Builder vs Zoho / Shopify

Current state:

- **Templates + drag metaphors** are UI scaffolding; export/save are not wired to persisted report definitions or scheduled email.
- **Live snapshot** is a first step toward “real data on this page.”

Roadmap (high level):

1. Persist report definitions (`business_id`, JSON layout, date preset) in Postgres + CRUD API.
2. Bind widget types to **named queries** (sales, inventory, customers) with parameters from global date range (wire header date picker into these tabs).
3. Export: CSV/PDF generation from the same query layer.
4. ~~Optional: include **storefront_orders** / POS streams in `getSalesTrendAction` for omnichannel revenue~~ **Done for trend, KPI growth, top products, and bundle** (`storefront_orders` + `storefront_order_items` with `payment_status = paid`, non-cancelled). POS / other channels remain future work.

## Files touched in the accuracy / UX fix

- `lib/actions/premium/ai/analytics.js` — trend row shape + `retentionDetail`; `AIOrderForecaster` import moved to top.
- `components/AdvancedCharts.jsx` — charts aligned to data semantics + currency tooltips.
- `components/AdvancedAnalytics.jsx` — currency from dashboard, KPI footnote, chart titles, `useCallback`/`useEffect` hygiene.
- `app/business/[category]/components/DashboardTabs.jsx` — pass `currency` into `AdvancedAnalytics`.
- `components/SalesManager.jsx` — pass `currency` into charts.
- `lib/utils/analytics.js` — `orderCount` alias for client-side monthly aggregates.
- `components/reports/ReportBuilder.jsx` — live snapshot card; effect structured for lint rules.
- `components/intelligence/AIInsightsPanel.jsx` — retention hint on `MetricCard`.
