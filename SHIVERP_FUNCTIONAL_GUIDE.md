# ShivERP — Smart Manufacturing & Logistics Platform
## Page-by-Page Functional & Architectural Guide

ShivERP is a modern, high-fidelity Enterprise Resource Planning (ERP) application designed specifically for custom-order smart manufacturing. The platform integrates sales, purchase procurement, inventory management, Bills of Materials (BOM), and manufacturing operations into a unified reactive workspace. 

Here is a detailed functional explanation of each page and its operational workflow:

---

## 1. Executive Control Dashboard (`Dashboard.tsx`)
The dashboard is the central operations hub, providing real-time visibility into the system's overall financial health, production progress, supply chain alerts, and activity ledger.

### A. Core Metrics (KPI Cards)
- **Today's Revenue:** Total monetary value of all confirmed and delivered Sales Orders.
- **Active Production:** Count of Manufacturing Orders currently in the queue or in progress.
- **Low Stock Alerts:** Number of raw materials whose current on-hand quantity falls below their predefined safety reorder point.
- **Procurement POs:** Count of active Purchase Orders raised to replenish stock from suppliers.

### B. Revenue Flow (Trend) Chart
- **Visualization:** A multi-layered, smooth Area Chart plotting daily financial flow over a rolling 10-day period.
- **Details Mode:**
  - **Revenue (Indigo Area):** Daily sales turnover from confirmed customer orders.
  - **Expenses (Rose Area):** Daily procurement expenses from raw material Purchase Orders.
  - **Net Profit (Emerald Area):** Calculated daily profit margins ($Revenue - Expenses$).
- **Business Purpose:** Allows management to immediately monitor cash flow trends and identify capital expenditures against sales spikes.

### C. Manufacturing Progress Chart
- **Visualization:** An interactive donut (Pie) chart representing the distribution of all active Manufacturing Orders across their 5 lifecycle statuses:
  1. `Draft` (Production planned)
  2. `Components Reserved` (Allocated raw material stock)
  3. `In Progress` (Currently on the factory floor)
  4. `Completed` (Finished goods ready for delivery)
  5. `Cancelled` (Aborted manufacturing runs)
- **Interaction:** Hovering over any slice reveals the exact count in a clear, high-contrast Slate Tooltip.

### D. Low Stock Intelligence
- **Workflow:** An automated sweep checks raw material stocks against their `reorderPoint`. If a shortage is detected, a critical card is displayed indicating:
  - Current On-Hand vs. Reorder Point.
  - The exact shortage quantity needed to meet safety levels.
  - **One-Click Replenishment:** Clicking **"Trigger PO"** automatically initiates a Purchase Order draft with the default vendor for the required quantity, preventing production bottlenecks.

### E. Live Workshop Activity Feed
- **Workflow:** A live audit trail of recent operational events on the factory floor (such as logins, order confirmations, completed operations, and deliveries). Each log displays relative timestamps and operator details.

---

## 2. Products & Inventory Management (`Products.tsx`)
Acts as the master database for all material items circulating through the system.

### A. Product Types
- **Finished Goods (FG):** High-value products (e.g., *Ergonomic Chairs*, *Conference Tables*, *Compact Desks*) assembled on-site and sold to customers.
- **Raw Materials (RM):** Component inventory (e.g., *Wooden Legs*, *Wooden Tops*, *Metal Screws*, *Paint & Varnish*) purchased from vendors to feed manufacturing processes.

### B. Smart Inventory Rules
- **On-Hand Qty:** Current physical stock available.
- **Reserved Qty:** Stock allocated to confirmed Sales Orders (MTS) or active Manufacturing Orders, preventing double-selling.
- **Available Qty:** Calculated as $On-Hand - Reserved$.
- **Reorder Point:** The minimum stock threshold. If Available Quantity falls below this, the system flags the item as low stock.
- **Safety Stock Level:** The buffer quantity kept to mitigate supply chain disruptions.

---

## 3. Bills of Materials (BOM) Studio (`Boms.tsx`)
The Bills of Materials (BOM) page defines the recipe for every finished product.

### A. Functionality
- **Recipes:** Map a finished good to the exact list of raw materials and quantities required to produce a single unit (e.g., 1 Table requires 4 Wooden Legs, 1 Wooden Top, 8 Screws, and 0.5 Liters of Paint).
- **MTO/MTS Impact:** During order confirmation, the system uses the active BOM recipe to calculate material requirements and automatically reserves those components from raw material inventory.

---

## 4. Sales & Customer Orders (`Sales.tsx`)
Coordinates customer interactions and handles the lifecycle of Sales Orders (SO).

### A. Lifecycle States
- `Draft` $\rightarrow$ `Confirmed` $\rightarrow$ `Fully Delivered` (or `Cancelled`).

### B. Validation & Constraint Controls
- **Duplicate Line Consolidation:** The interface strictly prevents selecting the same product on multiple lines. A validation system disables already-selected items in secondary dropdowns, and frontend/backend alerts block submission if duplicates are detected. Users must increment the quantity of the existing line instead, safeguarding order clarity.
- **MTS (Make-to-Stock) vs. MTO (Make-to-Order) Decisions:**
  - When an SO is **confirmed**, the system evaluates on-hand inventory.
  - If finished stock is available, it is **reserved** (Make-to-Stock workflow).
  - If finished stock is insufficient, the system explodes the product's BOM and automatically spawns a **Manufacturing Order (MO)** for the deficit quantity (Make-to-Order workflow).

---

## 5. Purchase & Procurement (`Purchases.tsx`)
Coordinates raw material supply lines to prevent production outages.

### A. Lifecycle States
- `Draft` $\rightarrow$ `Confirmed` $\rightarrow$ `Fully Received` (or `Cancelled`).

### B. Operational Flow
- When a Purchase Order (PO) is **confirmed**, raw material quantities are marked as expected.
- Upon clicking **"Receive Materials"**, the system:
  1. Increments the physical `onHandQty` of the raw materials in the database.
  2. Updates the product stock ledgers.
  3. Records the operator action in the activity feed.

---

## 6. Manufacturing Operations (`Manufacturing.tsx`)
Manages the shop floor and coordinates actual production runs.

### A. Lifecycle States
- `Draft` $\rightarrow$ `Components Reserved` $\rightarrow$ `In Progress` $\rightarrow$ `Completed` (or `Cancelled`).

### B. Smart Material Reservation
- Before production can start, the operator clicks **"Reserve Components"**. The system checks if enough raw materials are available.
- If components are sufficient, they are locked (`reservedQty` increased), shifting the MO to `Components Reserved`.
- If components are lacking, the system warns the operator and refuses to start, prompting procurement.

### C. Sequential Work Orders
- Each MO contains a series of sequential operations (e.g., *Assembly* $\rightarrow$ *Painting* $\rightarrow$ *Packaging*).
- Operators mark each work center operation as `In Progress` and then `Completed` sequentially.
- Once the final operation is completed, the system:
  - Deducts the reserved raw materials from stock.
  - Increments the finished good's `onHandQty`.
  - Shifts the MO to `Completed`.

---

## 7. Security Audit Ledger & Chain of Custody (`Audit.tsx`)
An immutable security register logging all critical actions.

### A. Monitored Events
- **Authentication events** (User log-in / log-out).
- **Sales confirmations and deliveries**.
- **Material procurement events**.
- **Production completion steps**.

### B. Functional Benefit
- Provides a searchable, chronologically ordered timeline complete with **Timestamp**, **Operator User**, **Security Role**, **Event Type**, **Reference ID**, and a descriptive **Narrative Narrative** outlining the changes made.
