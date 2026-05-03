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

## Feature 2: Folder Upload (CSV + Images)

### Interaction Flow

1. **Upload Folder** — user selects a folder containing CSV + images
2. **Auto-Detect CSV** — scan folder for `.csv` file
3. **Auto-Match Images** — match `image_path` filenames to files in folder
4. **Show Results** — display matched products with status

### UI Design

```
[Upload Folder Button] — "Select folder with CSV and images"

↓ Folder selected

[Processing indicator]

[Product List] - shows N products detected
  - Product 1: ✅ matched
  - Product 2: ✅ matched
  ...

If any files can't be matched:
  [Warning] N images not found in folder
```

### Image Path Resolution

- Parse CSV to get `name`, `price`, `image_path`
- For each `image_path` value:
  - Check if a file with that exact filename exists in the uploaded folder
  - If found: create blob URL and mark as ready
  - If not found: show as missing with manual upload option

### Data Model

```typescript
interface Product {
  name: string
  price: number
  imagePath: string  // URL or blob URL after upload
  imageStatus: 'missing' | 'ready'
}
```

### Technical Implementation

- Use `<input type="file" webkitdirectory multiple>` to select folder
- File API: `entry.file()` to read files from DirectoryEntry
- Match by exact filename (case-insensitive for robustness)

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
- `frontend/src/components/ProductGrid.tsx` — show image match status
- `frontend/src/pages/PromoEditor.tsx` — integrate all new features
- `frontend/src/types/index.ts` — extend types

### New Files

- (none)

---

## Implementation Order

1. Canvas size config (simplest, no dependencies)
2. Folder upload (CSV + images auto-match) — replaces CSV-only upload
3. Image crop controls for Header/Footer/Background (isolated)
4. CSV + image upload workflow (integrates with ProductGrid)
