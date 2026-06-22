<div align="center">

# 👟 Shoe Shop POS

**A full-featured desktop Point-of-Sale system built for shoe retail stores.**

[![Electron](https://img.shields.io/badge/Electron-39+-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://reactjs.org/)
[![SQLite](https://img.shields.io/badge/SQLite-003B57?logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

</div>

---

## 📋 Overview

Shoe Shop POS is a **desktop Point-of-Sale application** specifically designed for shoe retail operations. Built with **Electron**, **React**, and **SQLite**, it runs entirely offline on Windows — no internet required for daily operations. It supports barcode scanning, thermal receipt printing, inventory tracking, sales reporting, and role-based user management.

---

## ✨ Features

### 🛒 POS / Billing
- **Barcode scanning** — add products instantly with a USB scanner
- **Product search** — search by name, category, brand, or barcode
- **Variant support** — handle products with multiple sizes and colors
- **Discounts** — fixed amount (Rs.) or percentage (%) discounts
- **Payment methods** — Cash, Card, or Split (cash + card)
- **Hold bills** — save incomplete orders and restore them later
- **Refund / Return** — process item-level refunds with stock restoration
- **Receipt printing** — thermal receipt printer integration
- **Auto bill numbering** — sequential bills with date prefix

### 📦 Product Management
- **Full CRUD** — add, edit, activate/deactivate, and delete products
- **Product variants** — auto-detect variants from comma-separated sizes/colors
- **Barcode management** — manual entry or auto-generation with preview
- **Bulk import/export** — import/export products via Excel (.xlsx)
- **Product images** — upload and embed images directly
- **Filters** — filter by category, gender, status, and search

### 📊 Inventory & Stock
- **Real-time stock tracking** — per-product stock quantities
- **Low stock alerts** — color-coded status (green/orange/red)
- **Stock adjustments** — with reason types (Damaged, Lost, Physical Count, etc.)
- **Stock history** — complete audit log of all adjustments
- **Supplier management** — register and manage suppliers
- **Purchase orders** — record stock receipts from suppliers

### 📈 Reports & Analytics
- **Dashboard** — sales overview, 30-day trends, top products, category breakdown
- **Sales report** — daily/weekly/monthly revenue and discounts
- **Profit report** — revenue, cost, and profit calculations
- **Bill history** — complete list with reprint and void actions
- **Export to Excel** — download reports as .xlsx files

### ⚙️ Administration
- **Role-based access** — Admin (full) and Cashier (sales only)
- **User management** — create, edit, and deactivate users
- **Shop configuration** — customize shop name, address, receipt header/footer
- **Printer setup** — auto-detect Windows printers with test print
- **Database backup** — one-click backup to Documents folder
- **Light / Dark theme** — toggle and persist preference

### 🖨️ Hardware Support
- **Thermal receipt printers** (80mm) — Epson, Star, and compatible
- **Barcode scanners** — USB keyboard-emulation mode
- **Barcode label printing** — print individual barcode labels

---

## 🖥️ Screenshots

| Dashboard | POS / Billing |
|:---:|:---:|
| ![Dashboard](https://via.placeholder.com/400x250?text=Dashboard) | ![POS](https://via.placeholder.com/400x250?text=POS+Screen) |

| Products | Inventory |
|:---:|:---:|
| ![Products](https://via.placeholder.com/400x250?text=Products) | ![Inventory](https://via.placeholder.com/400x250?text=Inventory) |

| Reports | Settings |
|:---:|:---:|
| ![Reports](https://via.placeholder.com/400x250?text=Reports) | ![Settings](https://via.placeholder.com/400x250?text=Settings) |

---

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **Electron** | Desktop application framework |
| **React 19** | UI library |
| **Vite** | Build tool & dev server |
| **Tailwind CSS 4** | Utility-first styling |
| **better-sqlite3** | Local SQLite database |
| **Zustand** | State management |
| **Recharts** | Charts & data visualization |
| **Lucide React** | Icons |
| **Framer Motion** | Animations |
| **Radix UI** | Accessible UI primitives |
| **node-thermal-printer** | Thermal receipt printing |
| **bwip-js / jsbarcode** | Barcode generation |
| **xlsx** | Excel import/export |
| **electron-builder** | App packaging & distribution |

---

## 🚀 Getting Started

### Prerequisites

- **Windows 10/11** (64-bit)
- **[Node.js](https://nodejs.org/)** 18 or later
- **npm** (comes with Node.js)
- **Git**

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/shoe-shop-pos.git
cd shoe-shop-pos

# Install dependencies
npm install

# Rebuild native modules for Electron
npx electron-rebuild -f -w better-sqlite3
```

> ⚠️ **Note for Windows:** The `npm install` step may take a few minutes due to native module compilation. If `better-sqlite3` fails to compile, run `npm install` again or install [Windows Build Tools](https://github.com/felixrieseberg/windows-build-tools).

### Development

Start the app in development mode with hot-reload:

```bash
npm run dev
```

### Seed Test Data

To populate the database with sample products, sales, and users for testing:

```bash
npm run seed
```

This creates:
- 4 brands (Nike, Adidas, Bata, Service)
- 12 products across all categories
- 2 suppliers
- 2 purchase orders
- 5 days of sales data with active, void, and held bills
- Stock adjustments
- Cashier users (`cashier1` / `cashier123`)

---

## 🔐 Default Credentials

| Role | Username | Password |
|:---|:---|:---|
| **Admin** (full access) | `admin` | `admin` |
| **Cashier** (sales only) | `cashier1` | `cashier123` |
| **Cashier** (sales only) | `cashier2` | `cashier123` |

> ⚠️ **Change the default admin password immediately after first login!**

### Master Password

An emergency master password is available to bypass authentication. Contact the system administrator for details.

---

## 📁 Project Structure

```
shoe-shop-pos/
├── build/                    # Build resources (icons, entitlements)
├── docs/                     # Documentation
│   └── User-Manual.md        # Complete user manual
├── scripts/
│   └── seed.cjs              # Database seed script
├── src/
│   ├── main/                 # Electron main process
│   │   ├── index.js          # App entry, window creation
│   │   ├── database.js       # SQLite database initialization & schema
│   │   ├── ipc-handlers.js   # All IPC handlers (CRUD, reports, etc.)
│   │   └── printer.js        # Thermal printer integration
│   ├── preload/
│   │   └── index.js          # Context bridge (secure API exposure)
│   └── renderer/             # React frontend
│       ├── index.html
│       └── src/
│           ├── main.jsx      # React entry point
│           ├── App.jsx       # Root component with routing
│           ├── index.css     # Tailwind imports & theme
│           ├── lib/
│           │   └── utils.js  # Utility functions (cn, formatCurrency, etc.)
│           ├── store/
│           │   ├── authStore.js    # Authentication state (Zustand)
│           │   ├── cartStore.js    # POS cart state (Zustand)
│           │   └── uiStore.js      # UI state (theme, sidebar, etc.)
│           ├── components/
│           │   ├── Layout.jsx      # App shell with sidebar
│           │   └── Versions.jsx
│           └── pages/
│               ├── Dashboard.jsx   # Analytics overview
│               ├── POS.jsx         # Point-of-sale / billing
│               ├── Products.jsx    # Product management
│               ├── Inventory.jsx   # Stock management
│               ├── Reports.jsx     # Sales reports
│               ├── Settings.jsx    # System configuration
│               └── Login.jsx       # Authentication
├── electron-builder.yml       # Electron Builder configuration
├── electron.vite.config.mjs   # Vite configuration
├── eslint.config.mjs          # ESLint configuration
└── package.json
```

---

## 🏗️ Building for Distribution

Build packaged installers for your platform:

```bash
# Windows installer (.exe)
npm run build:win

# macOS (.dmg)
npm run build:mac

# Linux (AppImage, snap, deb)
npm run build:linux

# Unpacked build (for testing)
npm run build:unpack
```

The built artifacts will be in the `dist/` directory.

---

## ⌨️ Keyboard Shortcuts

Available on the POS / Billing screen:

| Key | Action |
|:---|:---|
| **F1** | New Sale (clear cart) |
| **F2** | Focus search bar |
| **F12** | Hold current bill |

---

## 📦 Database

The application uses a **local SQLite database** stored at:

```
C:\ProgramData\ShoeShopPOS\pos.db
```

### Key Tables

| Table | Description |
|-------|-------------|
| `users` | Authenticated users with role-based access |
| `products` | Product catalog with variants, pricing, and stock |
| `categories` | Product categories (Sneakers, Sandals, etc.) |
| `brands` | Product brands |
| `suppliers` | Supplier contact information |
| `sales` | Completed and held bills |
| `sale_items` | Individual items within a sale |
| `purchases` | Purchase orders from suppliers |
| `purchase_items` | Items within a purchase order |
| `stock_adjustments` | Stock change audit log |
| `shop_info` | Shop name, address, receipt customization |
| `settings` | Key-value store for system settings |

### Database Reset

To completely reset the database:

1. Close the application
2. Delete the database files:
   ```
   C:\ProgramData\ShoeShopPOS\pos.db
   C:\ProgramData\ShoeShopPOS\pos.db-wal
   C:\ProgramData\ShoeShopPOS\pos.db-shm
   ```
3. Restart the app — a fresh database is created automatically

---

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

---

## 🤝 Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

<div align="center">
  <sub>Built with ❤️ for shoe retailers</sub>
</div>
