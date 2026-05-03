# supermarket-promo Design

## Overview

Generate supermarket promotion pages from CSV files containing product name, price, and image path. Supports configurable layout (columns) and customizable header/footer/background with scalable images.

## Tech Stack

- **Single HTML page** — plain HTML, CSS, JavaScript (no framework)
- **Browser-based export** — generate preview in browser, then export as image via browser screenshot/capture

## Directory Structure

```
supermarket-promo/
├── index.html          # Main page
├── styles.css          # Styles
├── script.js           # Logic
├── config.json         # Layout & theme config
├── sample.csv          # Sample data
└── README.md
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

### Post-Export Editing
- "Hot price" / special offer annotations can be added after initial export
- Browser-based二次加工 before final image export

## Workflow

```
CSV + Config → Generate Preview → Browser Export → Post-edit (optional) → Final Image
```

## Initial Scope

- Single HTML output with CSS grid layout
- CSV parsing with basic validation
- Config-driven layout (column count) and theme (header/footer/background images)
- No server-side generation — all client-side
