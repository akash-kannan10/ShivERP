# 🚀 ShivERP: Presentation & Demo Guide

This document is your A-to-Z playbook for presenting **ShivERP** to the hackathon judges. It covers the technical architecture, business logic, and a step-by-step walkthrough of every screen and button to ensure a flawless pitch.

---

## 🏗️ 1. The Tech Stack & Architecture

Start your presentation by explaining the robust, modern technology stack used to build ShivERP.

### **Frontend (Client-Side)**
*   **Core Framework**: React 18 with TypeScript, powered by Vite for lightning-fast HMR and builds.
*   **Styling & UI**: Tailwind CSS for a highly customized, premium, glassmorphic dark-theme design.
*   **State Management**: Zustand for global state (managing sessions, permissions, and active alarms).
*   **Data Visualization**: Recharts for rendering real-time KPI graphs and sales trends.
*   **Icons**: Lucide-React for crisp, professional iconography.

### **Backend (Server-Side)**
*   **Core Engine**: Node.js & Express.js.
*   **Database & ORM**: Prisma ORM with SQLite (configured for seamless one-click local execution, fully scalable to PostgreSQL/Supabase for production).
*   **Security & Auth**: JWT (JSON Web Tokens) and bcryptjs. We implemented a custom middleware that performs live, dynamic Role-Based Access Control (RBAC).
*   **AI Integration**: Anthropic API (Claude) powers the AI Business Copilot, giving it real-time database context to answer executive questions.

---

## 🧠 2. Core Business Engines (The "Secret Sauce")

Explain to the judges that ShivERP isn't just a UI—it contains deep, transaction-safe business logic:

1.  **Immutable Stock Ledger**: Inventory isn't just a static number. Every change (sales, manufacturing, manual adjustments) is logged in a double-entry ledger ensuring 100% traceability. We track *On-Hand* (physical) vs *Reserved* (allocated) vs *Free-to-Use* stock.
2.  **Procurement Automation (MTO)**: When a Sales Order is confirmed, the system evaluates available stock. If there is a shortage, it recursively explodes the Bill of Materials and **automatically triggers Manufacturing Orders (MOs) and Purchase Orders (POs)**.
3.  **Dynamic RBAC**: Permissions aren't hardcoded. Administrators can dynamically check/uncheck access to modules via a UI grid, instantly restricting what different employees can see or do.

---

## 🎬 3. Step-by-Step Demo Walkthrough (Button by Button)

Follow this sequence during your live demo to show off every feature smoothly.

### **Step 1: Authentication & Roles**
*   **Screen**: Login Page.
*   **Action**: Show the beautiful glassmorphic UI. Point out the **Quick Login Scenarios** at the bottom.
*   **Script**: *"To make testing easy, we built quick-login buttons. I'll log in as the Admin Owner first to have full access."*
*   **Action**: Click `👑 Admin Owner`.

### **Step 2: The Executive Dashboard**
*   **Screen**: Dashboard.
*   **Explain**: Highlight the Top KPI cards and the Recharts (Sales Trend & Mfg Progress).
*   **Action**: Scroll down to **Low Stock Intelligence**. 
*   **Explain**: *"The system monitors raw materials. If something falls below safety levels, it shows up here."*
*   **Action (The "Order Stock" Button)**: Explain that clicking this button instantly generates a Draft Purchase Order for the exact shortage quantity directly to the default vendor.
*   **Action**: Point out the **Live Workshop Activity Feed** on the right, showing a timeline of who did what.

### **Step 3: Product Catalog & BoMs**
*   **Screen**: Product Catalog.
*   **Action**: Show the filters (All, Finished Goods, Raw Materials).
*   **Explain**: Notice the stock levels (On Hand vs Reserved vs Available).
*   **Action (The "Check Buildable" Button)**: Click it on a finished good (like Dining Table). 
*   **Script**: *"This button recursively calculates how many units of this finished good we can build right now based on the raw materials currently sitting in our warehouse."*
*   **Screen**: Bills of Materials (BoMs).
*   **Explain**: Show how a BoM explodes a finished good into Raw Materials AND defines the step-by-step Workshop Routing (e.g., Step 1: Assembly, Step 2: Painting).

### **Step 4: The Sales & Automation Flow (The Masterpiece)**
*   **Screen**: Sales Orders.
*   **Action (The "Feasibility Checker" Button)**: Click it. Select a product and quantity. 
*   **Script**: *"Before taking an order, a sales rep can check if it's instantly feasible from stock, feasible via production, or if we are missing raw materials."*
*   **Action**: Close the checker. Click `Create Sales Order`. Draft a new order for a product that is OUT OF STOCK.
*   **Action (The "Confirm" Button)**: Click Confirm on the draft order.
*   **The Magic**: Point out the **MTO Procurement Exploded Logs** banner that appears.
*   **Script**: *"Because we didn't have stock, our Procurement Engine automatically generated a Manufacturing Order to build the product, AND generated Draft Purchase Orders to buy the missing raw materials from suppliers! Zero manual planning required."*

### **Step 5: Purchasing & Receiving**
*   **Screen**: Procurement (POs).
*   **Explain**: Show the draft PO that was just auto-generated.
*   **Action (The "Confirm" Button)**: Click it to finalize the supplier RFQ.
*   **Action (The "Receive Stocks" Button)**: Click it. A modal pops up. 
*   **Script**: *"When the truck arrives, the stock planner inputs what they received. Hitting 'Receive' immediately updates our physical inventory and logs it in the immutable ledger."*

### **Step 6: Manufacturing Floor Operations**
*   **Screen**: Manufacturing.
*   **Explain**: Find the auto-generated Manufacturing Order (MO).
*   **Action (The "Shopping List" Button)**: Click it. Show the checklist of required raw materials vs what is available.
*   **Action (The "Reserve Components" Button)**: Click it. This locks the raw materials so sales can't accidentally sell them.
*   **Action**: Click the Chevron (Down arrow) to expand the Work Order checklist.
*   **Action (Start Step / Finish Step)**: Click through the workshop floor operations. Show how operators check off assembly stages.
*   **Action (The "Complete Mfg" Button)**: Click it. 
*   **Script**: *"This officially consumes the raw materials from our warehouse and yields finished products ready for delivery."*

### **Step 7: Dispatching the Sale**
*   **Screen**: Go back to **Sales Orders**.
*   **Action (The "Dispatch Deliver" Button)**: Now that the goods are manufactured, click Dispatch. The status becomes **Fully Delivered**, and revenue is realized.

### **Step 8: Inventory & Immutable Ledger**
*   **Screen**: Inventory & Ledger.
*   **Action**: Click `Manual Adjustment` to show how warehouse managers can perform cycle counts (e.g., adding +2 units because they found extra stock).
*   **Action (Tab: Immutable Stock Ledger)**: Click this tab.
*   **Script**: *"Every action we just did—receiving POs, reserving components, manufacturing, and adjustments—is permanently logged here with a timestamp, operator name, and the exact positive/negative delta. This guarantees financial compliance."*

### **Step 9: Interactive RBAC (Users & Permissions)**
*   **Screen**: Users & Permissions.
*   **Explain**: This is the heart of security.
*   **Action**: Show the interactive checkbox grid. Uncheck the "View" permission for the `Sales` module under the `manufacture` role.
*   **Script**: *"We built a live Permissions Matrix. If I uncheck a box, that role instantly loses access to that module. The sidebar dynamically hides the tab for them. It's completely flexible."*

### **Step 10: The Finale - AI Business Copilot**
*   **Screen**: AI Business Copilot.
*   **Explain**: *"We integrated Claude AI directly into the ERP to act as a 24/7 Chief Operations Officer."*
*   **Action**: Click the `CEO Biggest Problem` template button at the bottom. Wait 5-10 seconds.
*   **Explain**: Walk through the highly structured Markdown output:
    1.  **What Happened**
    2.  **Why It Happened**
    3.  **Business Impact**
    4.  **Recommended Action**
*   **Action (The "Inspect Query Context Details" Button)**: Click this link at the bottom of the AI's answer.
*   **Script**: *"The AI isn't just hallucinating. It's reading our live database. This JSON inspector shows the exact real-time SQL data the AI used to generate its analysis. Absolute transparency."*

---

## 🏆 Presentation Tips for the Hackathon

1.  **Pacing**: Keep it moving. Don't spend too long filling out forms. Pre-fill the forms or use simple test data (`test`, `123`, etc.) to keep the momentum going.
2.  **Storytelling**: Frame the demo around a day in the life of **Shiv Furniture Works**—"A customer orders a table, we check feasibility, we order wood, we manufacture it, and we deliver it."
3.  **Emphasize "Automation"**: Judges love things that save time. Heavily emphasize the **MTO auto-triggering** feature and the **One-Click Replenishment** on the dashboard.
4.  **Security**: Mention the **Immutable Ledger** and the **Interactive RBAC matrix**. These are enterprise-grade features that elevate this beyond a simple CRUD app.

**Good luck! You've built an incredibly powerful and beautiful system!**
