# supermarket-promo Enhancement Design

## Overview

Enhancements to support image cropping, CSV+image upload workflow, and configurable canvas size.

## Tech Stack

- React 19, Mantine UI (unchanged)
- Backend: Express + Prisma + SQLite (unchanged)

---

## Feature 1: Image Cropping Control

### Interaction

When a user selects (clicks on) a Header / Footer / Background image, that image becomes editable:

- **Drag** — adjusts `background-position` (pan around within the display area)
- **Scale/Zoom** — adjusts `background-size` (zoom in/out)
- Each region stores its own `positionX`, `positionY`, `scale` values independently

### UI Design

- Preview area shows each image region as an interactive box
- When a region is selected:
  - Visual indicator (border/highlight) shows it's active
  - Controls appear: drag handle, zoom slider or +/- buttons
- Image is rendered using CSS `background-image` with `background-size` and `background-position`

### Data Model

```typescript
interface ThemeConfig {
  imagePath: string
  height: number
  // Cropping control
  positionX: number  // percentage 0-100
  positionY: number  // percentage 0-100
  scale: number      // 1 = original size, >1 = zoomed in
}
```

### Implementation Approach

- Use CSS `background` properties for image rendering
- Add mouse drag handlers for panning
- Add scale control (pinch gesture or buttons)
- Store position/scale in component state, save to backend on change

---

## Feature 2: CSV + Image Upload Workflow

### Interaction Flow

1. **Upload CSV** — user selects `.csv` file
2. **Parse & Detect** — extract `name`, `price`, `image_path` columns
3. **Show Missing Images** — for each `image_path` value, show upload UI if image can't be loaded
4. **Batch Upload** — user can select multiple images at once
5. **Auto-Mapping** — replace `image_path` with blob URLs after upload

### UI Design

```
[Upload CSV Button]

↓ CSV uploaded

[Product List] - shows N products detected
  - Product 1: image [Upload] [status: missing/ready]
  - Product 2: image [Upload] [status: ready]
  ...

[Batch Upload Button] - "Select N images to upload"
```

### Image Path Resolution

- After CSV upload, check if each `image_path` is a valid URL or local file
- If path looks like a filename (no extension or doesn't start with http), show as "missing"
- After user uploads matching image file, replace blob URL into the product's image field

### Data Model

```typescript
interface Product {
  name: string
  price: number
  imagePath: string  // URL or blob URL after upload
  imageStatus: 'missing' | 'ready'
}
```

---

## Feature 3: Canvas Size Configuration

### Presets

| Name | Dimensions (px) | Aspect |
|------|-----------------|--------|
| Portrait A4 | 1080 × 3000 | ~9:25 |
| Instagram | 1080 × 1080 | 1:1 |
| Letter | 2550 × 3300 | ~17:22 |
| A4 | 2480 × 3508 | ~1:1.4 |

### UI

- Dropdown or segmented control for preset selection
- "Custom" option reveals width × height number inputs (px)
- Default: 1080 × 3000

### Data Model

```typescript
interface CanvasConfig {
  width: number
  height: number
}
```

---

## File Changes

### Modified Files

- `frontend/src/components/HeaderConfig.tsx` — add crop controls
- `frontend/src/components/FooterConfig.tsx` — add crop controls
- `frontend/src/components/BackgroundConfig.tsx` — add crop controls
- `frontend/src/components/ProductGrid.tsx` — add per-product image upload
- `frontend/src/pages/PromoEditor.tsx` — integrate all new features
- `frontend/src/types/index.ts` — extend types

### New Files

- (none)

---

## Implementation Order

1. Canvas size config (simplest, no dependencies)
2. Image crop controls for Header/Footer/Background (isolated)
3. CSV + image upload workflow (integrates with ProductGrid)
