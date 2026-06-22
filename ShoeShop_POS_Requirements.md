# Shoe Shop POS System — Complete Project Requirements
**All 3 Phases: Discovery → Tech Stack → UI/UX Screens**

---

## PHASE 1 — Client Requirements (Discovery)

### Client
Shoe Shop owner — single location, single device (Windows PC)

### Problem Statement
Client needs a Point-of-Sale desktop application to:
- Manage products (shoes with sizes, colors, brands)
- Generate bills and print receipts on thermal printer
- Check sales reports and business performance

### Constraints
- Windows OS only
- Thermal printer for receipts and barcode labels
- Barcode scanner (keyboard input mode)
- Single device — no network/multi-branch needed
- Data backup must go to Google Drive
- Currency: Pakistani Rupee (Rs. / PKR) — fixed, no other currency

---

## PHASE 2 — Tech Stack

### Frontend
- **Framework:** React (with Vite)
- **UI Library:** Material UI (MUI) or ShadCN + Tailwind
- **Animations:** Framer Motion
- **Theme:** Light and Dark mode both supported
- **Design:** Professional, clean, Material Design inspired

### Desktop Wrapper
- **Electron** — wraps React app as a Windows desktop app

### Database
- **SQLite** — local database
- **Storage path:** `C:\ProgramData\ShoeShopPOS\` (programData folder)
- **ORM:** better-sqlite3 (via Electron main process)

### Backup
- **Google Drive API** — manual backup button + auto-schedule
- On backup: SQLite `.db` file copied/updated to user's Google Drive folder

### Barcode
- **Generation:** `bwip-js` or `JsBarcode` library
- **Reading:** Keyboard input (scanner sends keystrokes like a keyboard)

### Printing
- **Thermal Printer:** via Electron + node printer or escpos library
- **Receipt + Barcode Label** printing supported

### State Management
- **Zustand** or Redux Toolkit

---

## PHASE 3 — UI/UX Screens & Features

> Navigation: Single sidebar (icon-based, collapsible). All screens accessible from sidebar.

---

### SCREEN 1 — Login

- Shop name and logo displayed at top
- Username field
- Password field
- Remember me checkbox
- Light / Dark mode toggle
- Role-based redirect after login:
  - Admin → Dashboard
  - Cashier → POS / Billing Screen

---

### SCREEN 2 — Dashboard

**Stats Cards (top row):**
- Today's sales (Rs.)
- Total bills count today
- Average bill amount
- Low stock alert count (clickable → goes to Inventory)

**Graphs / Charts:**
- Bar graph — weekly or monthly sales (with date range picker)
- Line graph — sales trend over last 30 days
- Ring / Pie chart — top selling categories (Sneakers, Sandals, Formal, etc.)

**Tables / Lists:**
- Top selling products — product image, name, quantity sold
- Recent transactions — last 5 bills with amount and payment type (Cash / Card icon)
- Pending / Held Bills — quick access widget

**Quick Action Buttons:**
- New Sale
- Add Product
- Backup Now

**Date Filter Toggle:**
- Today / This Week / This Month / Custom Range

---

### SCREEN 3 — POS / Billing Screen

**Input Methods:**
- Barcode scanner input — scan barcode, product auto-adds to cart
- Manual search — search by name, gender, brand, or category
  - Results appear below search bar as product cards (not list rows)
  - Each card shows product image, name, price, size

**Cart:**
- Product image in each row
- Product name, size, color
- Quantity controls (+ / - buttons)
- Unit price
- Subtotal per item
- Click on item to edit qty, price, or discount individually

**Discount:**
- Toggle switch — Rs. amount OR percentage (%)
- Applied per item or on total bill

**Customer Info (optional fields):**
- Customer name
- Phone number
- NTN / CNIC (for corporate / tax invoices)

**Payment:**
- Payment method buttons: Cash / Card
- Split payment option — partial Cash + partial Card in one bill
- Change calculator — popup: enter amount received → auto-calculates change

**Receipt:**
- Receipt preview screen before printing
- Print to thermal printer
- Receipt includes: shop info, items, discount, total, payment method, date/time

**Other:**
- Hold bill — save current bill and start new one
- Return / Exchange button (negative sale / refund)
- Keyboard shortcuts:
  - F1 = New Sale
  - F2 = Search / Focus search bar
  - F12 = Hold Bill

---

### SCREEN 4 — Product Management

**Product List View:**
- Table view and Grid view toggle
- Search by name, category, brand, gender
- Filter by category, active/inactive status

**Add / Edit Product Form:**
- Name
- Category (dropdown)
- Gender (Men / Women / Kids / Unisex)
- Brand
- Size
- Color
- Buying price (cost)
- Selling price
- Stock quantity
- Product image upload — thumbnail preview shown
- Barcode — auto-generate or manual entry (duplicate validation)

**Barcode Label Printing:**
- Print barcode label on thermal printer
- Choose number of copies (e.g. 1 product × 10 labels)

**Bulk Actions:**
- Bulk import from Excel file
- Active / Inactive toggle per product

**Product Variations (advanced):**
- Same product with multiple sizes/colors grouped under one parent SKU

---

### SCREEN 5 — Inventory / Stock

**Stock View:**
- Stock level for each product
- Low stock filter — show only items below minimum level

**Stock Adjustment:**
- Manually update quantity
- Reason field required: Damaged / Lost / Physical Count / Return to Supplier

**Stock History Log:**
- Full log of all adjustments: who made it, when, reason, old qty, new qty

**Restock Alert:**
- Set minimum quantity per product
- Alert shown on Dashboard and Inventory screen

**Purchase / Stock Receive Module:**
- Separate section to receive stock from suppliers
- Select supplier name
- Add products with received quantity and updated buying price
- Auto-updates main stock and cost price
- Purchase history tracked for profit calculation

---

### SCREEN 6 — Reports

**Sales Report:**
- Date range filter: Daily / Weekly / Monthly / Custom
- Revenue, cost, and profit margin shown together

**Product Reports:**
- Best selling products — bar chart + table
- Quantity sold + profit margin per product

**Category Reports:**
- Category-wise sales summary

**Bill History:**
- All bills listed with date, amount, payment type
- Reprint option per bill
- Void / Cancel bill (Admin only)

**Supplier Report:**
- Purchases per supplier vs quantity sold

**Tax Report:**
- Separate column for sales tax (future scope, column present but optional)

**Export:**
- Export any report to PDF
- Export to Excel (.xlsx)

---

### SCREEN 7 — Settings

**Shop Information:**
- Shop name
- Address
- Phone number
- These appear in receipt header

**Printer Setup:**
- Select and configure thermal printer

**Receipt Customization:**
- Header text (custom message)
- Footer text (e.g. "Thank you for shopping!")
- Logo upload for receipt

**Backup:**
- "Backup to Google Drive" button
- Last backup time shown
- Local backup — download `.zip` file
- Auto-backup schedule: Daily / Weekly

**Theme:**
- Light / Dark mode global toggle

**User Management:**
- Roles: Admin (full access) and Cashier (POS + sales only)
- Add / Edit / Delete users

**Currency:**
- Fixed: Rs. PKR — no change option needed

**Advanced (Admin only):**
- Database reset / Clear all data (for testing/fresh start)
- SMS / Email receipt gateway — future scope
- Offline mode fallback using IndexedDB (if internet lost during backup)

---

## Must-Have vs Nice-to-Have Summary

| Feature | Priority |
|---|---|
| Login with roles | Must-have |
| Dashboard with stats and graphs | Must-have |
| POS / Billing with barcode scanner | Must-have |
| Receipt print (thermal) | Must-have |
| Product management | Must-have |
| Reports (sales, bill history) | Must-have |
| Google Drive backup | Must-have |
| Light / Dark theme | Must-have |
| Product images | Must-have |
| Barcode label printing | Must-have |
| Inventory / stock management | Must-have |
| Customer name + phone on bill | Must-have |
| Manual search with card suggestions | Must-have |
| Discount in Rs. and % toggle | Must-have |
| Split payment (Cash + Card) | Nice-to-have |
| Hold bill | Nice-to-have |
| Return / Exchange (refund) | Nice-to-have |
| Product variations (parent SKU) | Nice-to-have |
| Bulk Excel import | Nice-to-have |
| Supplier / purchase receive module | Nice-to-have |
| Keyboard shortcuts (F1, F2, F12) | Nice-to-have |
| Export reports to PDF / Excel | Nice-to-have |
| SMS / Email receipt | Future scope |
| Tax report column | Future scope |
| Offline mode fallback | Future scope |

---

## Notes for Developer

- All monetary values in PKR (Rs.) — no decimal needed unless client confirms
- Electron main process handles: SQLite, printing, Google Drive API, file system
- React renderer handles: all UI, state, charts
- IPC (inter-process communication) between Electron main and renderer for DB and print calls
- Barcode scanner sends input as keyboard events — listen on focused input field
- Receipt format must match standard 58mm or 80mm thermal roll width (confirm with client)
- SQLite file location: `C:\ProgramData\ShoeShopPOS\pos.db`
- On first launch: run DB migration / seed with default admin user
