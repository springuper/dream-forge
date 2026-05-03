# supermarket-promo Design

## Overview

Generate supermarket promotion pages from CSV files containing product name, price, and image path. Supports configurable layout (columns) and customizable header/footer/background with scalable images.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19 + Vite |
| UI Library | Mantine UI |
| Backend | Node.js + Express |
| State Persistence | Backend storage (multiple draft support) |
| Image Export | html2canvas + canvas download |

## Directory Structure

```
supermarket-promo/
├── frontend/           # React SPA
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
├── backend/            # Express API
│   ├── src/
│   └── package.json
└── docs/
```

## Features

### CSV Parsing
- Read columns: `name`, `price`, `image_path`
- Display products in configurable grid

### Configurable Layout
- Column options: 2, 3, or 4 columns
- Grid auto-adjusts based on column setting

### Header / Footer / Background
- Configurable image paths
- Scalable width and height for each element

### State Persistence
- Backend saves project state
- Support multiple promo drafts

### Image Export
- Render page to canvas via html2canvas
- Download directly as PNG/JPG

### Post-Export Editing
- "Hot price" / special offer annotations supported
- Edit in browser before final export

## Workflow

```
CSV + Config → Generate Preview → Edit (optional) → html2canvas Export → Final Image Download
```

## Initial Scope

- Full-stack React + Express application
- Mantine UI for configuration interface
- CSV parsing with basic validation
- Config-driven layout (column count) and theme (header/footer/background images with scalable dimensions)
- html2canvas-based image export with direct download
