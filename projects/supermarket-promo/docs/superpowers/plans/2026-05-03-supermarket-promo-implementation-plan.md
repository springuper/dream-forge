# supermarket-promo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a React + Express application that generates supermarket promotion pages from CSV files with configurable layout and image export via html2canvas.

**Architecture:** Single-page React app with Express backend. Mantine UI for configuration interface. html2canvas for image export. State persisted on backend with SQLite (lightweight for this use case).

**Tech Stack:** React 19, Vite, Mantine UI, Express, Prisma (SQLite), html2canvas

---

## File Structure

```
supermarket-promo/
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── pages/
│   │   │   └── PromoEditor.tsx      # Main editor page
│   │   ├── components/
│   │   │   ├── ProductGrid.tsx      # Product display grid
│   │   │   ├── HeaderConfig.tsx     # Header image config
│   │   │   ├── FooterConfig.tsx     # Footer image config
│   │   │   ├── BackgroundConfig.tsx # Background config
│   │   │   └── ExportButton.tsx     # Export to image
│   │   ├── lib/
│   │   │   ├── api.ts               # API client
│   │   │   └── csvParser.ts         # CSV parsing utility
│   │   └── types/
│   │       └── index.ts             # TypeScript types
│   ├── package.json
│   └── vite.config.ts
├── backend/
│   ├── prisma/
│   │   └── schema.prisma           # SQLite schema
│   ├── src/
│   │   ├── index.ts                # Express entry
│   │   ├── routes/
│   │   │   └── promo.ts            # Promo CRUD routes
│   │   └── lib/
│   │       └── prisma.ts           # Prisma client
│   └── package.json
└── docs/
```

---

## Database Schema (Prisma)

**Model: PromoProject**
- `id`: String (uuid, primary key)
- `name`: String
- `config`: Json (layout columns, header/footer/background settings)
- `products`: Json (array of {name, price, image_path})
- `createdAt`: DateTime
- `updatedAt`: DateTime

---

## Task Breakdown

### Task 1: Project Scaffolding

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/tsconfig.json`
- Create: `frontend/index.html`
- Create: `frontend/.gitignore`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx`
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/prisma/schema.prisma`
- Create: `backend/src/index.ts`
- Create: `backend/.gitignore`

- [ ] **Step 1: Create frontend package.json**

```json
{
  "name": "frontend",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@mantine/core": "^8.3.9",
    "@mantine/hooks": "^8.3.9",
    "html2canvas": "^1.4.1",
    "react": "^19.2.0",
    "react-dom": "^19.2.0"
  },
  "devDependencies": {
    "@types/react": "^19.2.5",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^5.1.1",
    "typescript": "~5.9.3",
    "vite": "^7.2.4"
  }
}
```

- [ ] **Step 2: Create frontend vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
```

- [ ] **Step 3: Create frontend tsconfig.json**

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

- [ ] **Step 4: Create frontend tsconfig.app.json**

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

- [ ] **Step 5: Create frontend tsconfig.node.json**

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 6: Create frontend index.html**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Supermarket Promo</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 7: Create frontend .gitignore**

```
node_modules/
dist/
*.local
```

- [ ] **Step 8: Create frontend/src/main.tsx**

```typescript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MantineProvider } from '@mantine/core'
import '@mantine/core/styles.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider>
      <App />
    </MantineProvider>
  </StrictMode>,
)
```

- [ ] **Step 9: Create frontend/src/App.tsx (placeholder)**

```typescript
export default function App() {
  return <div>Supermarket Promo Editor</div>
}
```

- [ ] **Step 10: Create backend package.json**

```json
{
  "name": "backend",
  "version": "1.0.0",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "db:generate": "prisma generate",
    "db:push": "prisma db push"
  },
  "dependencies": {
    "@prisma/client": "^6.19.0",
    "cors": "^2.8.5",
    "express": "^5.1.0"
  },
  "devDependencies": {
    "@types/node": "^24.10.1",
    "prisma": "^6.19.0",
    "tsx": "^4.20.6",
    "typescript": "^5.9.3"
  }
}
```

- [ ] **Step 11: Create backend tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 12: Create backend prisma/schema.prisma**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

model PromoProject {
  id        String   @id @default(uuid())
  name      String
  config    String   @default("{}")   // JSON string: {columns, headerConfig, footerConfig, backgroundConfig}
  products  String   @default("[]")    // JSON string: [{name, price, imagePath}]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

- [ ] **Step 13: Create backend .gitignore**

```
node_modules/
dist/
prisma/dev.db
```

- [ ] **Step 14: Create backend/src/index.ts (basic Express server)**

```typescript
import express from 'express'
import cors from 'cors'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const app = express()

app.use(cors())
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.post('/api/promos', async (req, res) => {
  const { name, config, products } = req.body
  const promo = await prisma.promoProject.create({
    data: {
      name,
      config: JSON.stringify(config || {}),
      products: JSON.stringify(products || []),
    },
  })
  res.json({ ...promo, config: JSON.parse(promo.config), products: JSON.parse(promo.products) })
})

app.get('/api/promos', async (_req, res) => {
  const promos = await prisma.promoProject.findMany({ orderBy: { updatedAt: 'desc' } })
  res.json(promos.map(p => ({ ...p, config: JSON.parse(p.config), products: JSON.parse(p.products) })))
})

app.get('/api/promos/:id', async (req, res) => {
  const promo = await prisma.promoProject.findUnique({ where: { id: req.params.id } })
  if (!promo) return res.status(404).json({ error: 'Not found' })
  res.json({ ...promo, config: JSON.parse(promo.config), products: JSON.parse(promo.products) })
})

app.put('/api/promos/:id', async (req, res) => {
  const { name, config, products } = req.body
  const promo = await prisma.promoProject.update({
    where: { id: req.params.id },
    data: {
      name,
      config: config ? JSON.stringify(config) : undefined,
      products: products ? JSON.stringify(products) : undefined,
    },
  })
  res.json({ ...promo, config: JSON.parse(promo.config), products: JSON.parse(promo.products) })
})

app.delete('/api/promos/:id', async (req, res) => {
  await prisma.promoProject.delete({ where: { id: req.params.id } })
  res.json({ success: true })
})

const PORT = 3001
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
```

- [ ] **Step 15: Commit**

```bash
cd ~/Repo/dream-forge/projects/supermarket-promo
git add -A
git commit -m "feat: scaffold frontend and backend structure

- Frontend: React + Vite + Mantine UI
- Backend: Express + Prisma + SQLite
- Basic API: health check, CRUD for promo projects"
```

---

### Task 2: Frontend Types and API Client

**Files:**
- Create: `frontend/src/types/index.ts`
- Create: `frontend/src/lib/api.ts`
- Create: `frontend/src/lib/csvParser.ts`

- [ ] **Step 1: Create frontend/src/types/index.ts**

```typescript
export interface Product {
  name: string
  price: number
  imagePath: string
}

export interface ThemeConfig {
  imagePath: string
  height: number // in pixels
}

export interface LayoutConfig {
  columns: 2 | 3 | 4
}

export interface PromoConfig {
  layout: LayoutConfig
  header: ThemeConfig
  footer: ThemeConfig
  background: ThemeConfig
}

export interface PromoProject {
  id: string
  name: string
  config: PromoConfig
  products: Product[]
  createdAt: string
  updatedAt: string
}
```

- [ ] **Step 2: Create frontend/src/lib/api.ts**

```typescript
import type { PromoProject, PromoConfig, Product } from '../types'

const API_BASE = '/api'

export async function getPromos(): Promise<PromoProject[]> {
  const res = await fetch(`${API_BASE}/promos`)
  return res.json()
}

export async function getPromo(id: string): Promise<PromoProject> {
  const res = await fetch(`${API_BASE}/promos/${id}`)
  return res.json()
}

export async function createPromo(name: string, config: PromoConfig, products: Product[]): Promise<PromoProject> {
  const res = await fetch(`${API_BASE}/promos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, config, products }),
  })
  return res.json()
}

export async function updatePromo(id: string, data: { name?: string; config?: PromoConfig; products?: Product[] }): Promise<PromoProject> {
  const res = await fetch(`${API_BASE}/promos/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function deletePromo(id: string): Promise<void> {
  await fetch(`${API_BASE}/promos/${id}`, { method: 'DELETE' })
}
```

- [ ] **Step 3: Create frontend/src/lib/csvParser.ts**

```typescript
import type { Product } from '../types'

export function parseCSV(csvText: string): Product[] {
  const lines = csvText.trim().split('\n')
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
  const nameIdx = headers.findIndex(h => h === 'name')
  const priceIdx = headers.findIndex(h => h === 'price')
  const imagePathIdx = headers.findIndex(h => h === 'image_path' || h === 'imagepath')

  if (nameIdx === -1 || priceIdx === -1) {
    throw new Error('CSV must contain "name" and "price" columns')
  }

  return lines.slice(1).map(line => {
    const cols = line.split(',')
    return {
      name: cols[nameIdx]?.trim() || '',
      price: parseFloat(cols[priceIdx]?.trim() || '0'),
      imagePath: imagePathIdx >= 0 ? cols[imagePathIdx]?.trim() || '' : '',
    }
  }).filter(p => p.name)
}
```

- [ ] **Step 4: Commit**

```bash
cd ~/Repo/dream-forge/projects/supermarket-promo
git add -A
git commit -m "feat: add frontend types, API client, and CSV parser"
```

---

### Task 3: ProductGrid Component

**Files:**
- Create: `frontend/src/components/ProductGrid.tsx`

- [ ] **Step 1: Create frontend/src/components/ProductGrid.tsx**

```typescript
import type { Product } from '../types'

interface ProductGridProps {
  products: Product[]
  columns: 2 | 3 | 4
}

export default function ProductGrid({ products, columns }: ProductGridProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: '12px',
        padding: '16px',
      }}
    >
      {products.map((product, idx) => (
        <div
          key={idx}
          style={{
            border: '1px solid #eee',
            borderRadius: '8px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100px',
              background: '#f5f5f5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#999',
              fontSize: '12px',
            }}
          >
            {product.imagePath ? (
              <img
                src={product.imagePath}
                alt={product.name}
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none'
                }}
              />
            ) : (
              'No Image'
            )}
          </div>
          <div style={{ padding: '8px' }}>
            <p style={{ margin: 0, fontSize: '12px', color: '#333' }}>{product.name}</p>
            <p style={{ margin: '4px 0 0', fontSize: '14px', fontWeight: 'bold', color: '#e63946' }}>
              ${product.price.toFixed(2)}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd ~/Repo/dream-forge/projects/supermarket-promo
git add -A
git commit -m "feat: add ProductGrid component"
```

---

### Task 4: Config Components (Header, Footer, Background)

**Files:**
- Create: `frontend/src/components/HeaderConfig.tsx`
- Create: `frontend/src/components/FooterConfig.tsx`
- Create: `frontend/src/components/BackgroundConfig.tsx`

- [ ] **Step 1: Create frontend/src/components/HeaderConfig.tsx**

```typescript
import { NumberInput, TextInput } from '@mantine/core'
import type { ThemeConfig } from '../types'

interface HeaderConfigProps {
  config: ThemeConfig
  onChange: (config: ThemeConfig) => void
}

export default function HeaderConfig({ config, onChange }: HeaderConfigProps) {
  return (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
      <TextInput
        label="Image URL"
        value={config.imagePath}
        onChange={(e) => onChange({ ...config, imagePath: e.target.value })}
        style={{ flex: 1 }}
      />
      <NumberInput
        label="Height (px)"
        value={config.height}
        min={50}
        max={500}
        onChange={(val) => onChange({ ...config, height: Number(val) })}
        style={{ width: 100 }}
      />
    </div>
  )
}
```

- [ ] **Step 2: Create frontend/src/components/FooterConfig.tsx**

```typescript
import { NumberInput, TextInput } from '@mantine/core'
import type { ThemeConfig } from '../types'

interface FooterConfigProps {
  config: ThemeConfig
  onChange: (config: ThemeConfig) => void
}

export default function FooterConfig({ config, onChange }: FooterConfigProps) {
  return (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
      <TextInput
        label="Image URL"
        value={config.imagePath}
        onChange={(e) => onChange({ ...config, imagePath: e.target.value })}
        style={{ flex: 1 }}
      />
      <NumberInput
        label="Height (px)"
        value={config.height}
        min={50}
        max={500}
        onChange={(val) => onChange({ ...config, height: Number(val) })}
        style={{ width: 100 }}
      />
    </div>
  )
}
```

- [ ] **Step 3: Create frontend/src/components/BackgroundConfig.tsx**

```typescript
import { NumberInput, TextInput } from '@mantine/core'
import type { ThemeConfig } from '../types'

interface BackgroundConfigProps {
  config: ThemeConfig
  onChange: (config: ThemeConfig) => void
}

export default function BackgroundConfig({ config, onChange }: BackgroundConfigProps) {
  return (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
      <TextInput
        label="Image URL"
        value={config.imagePath}
        onChange={(e) => onChange({ ...config, imagePath: e.target.value })}
        style={{ flex: 1 }}
      />
      <NumberInput
        label="Height (px)"
        value={config.height}
        min={100}
        max={2000}
        onChange={(val) => onChange({ ...config, height: Number(val) })}
        style={{ width: 100 }}
      />
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
cd ~/Repo/dream-forge/projects/supermarket-promo
git add -A
git commit -m "feat: add Header, Footer, Background config components"
```

---

### Task 5: ExportButton Component

**Files:**
- Create: `frontend/src/components/ExportButton.tsx`

- [ ] **Step 1: Create frontend/src/components/ExportButton.tsx**

```typescript
import { Button } from '@mantine/core'
import html2canvas from 'html2canvas'

interface ExportButtonProps {
  targetRef: React.RefObject<HTMLDivElement | null>
}

export default function ExportButton({ targetRef }: ExportButtonProps) {
  async function handleExport() {
    if (!targetRef.current) return
    try {
      const canvas = await html2canvas(targetRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
      })
      const link = document.createElement('a')
      link.download = 'promo-page.png'
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (err) {
      console.error('Export failed:', err)
    }
  }

  return <Button onClick={handleExport}>Export as PNG</Button>
}
```

- [ ] **Step 2: Commit**

```bash
cd ~/Repo/dream-forge/projects/supermarket-promo
git add -A
git commit -m "feat: add ExportButton with html2canvas"
```

---

### Task 6: PromoEditor Page

**Files:**
- Create: `frontend/src/pages/PromoEditor.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Create frontend/src/pages/PromoEditor.tsx**

```typescript
import { useState, useRef } from 'react'
import { SegmentedControl, NumberInput, FileInput, Stack, Group, Paper, Text, TextInput } from '@mantine/core'
import ProductGrid from '../components/ProductGrid'
import HeaderConfig from '../components/HeaderConfig'
import FooterConfig from '../components/FooterConfig'
import BackgroundConfig from '../components/BackgroundConfig'
import ExportButton from '../components/ExportButton'
import { parseCSV } from '../lib/csvParser'
import type { Product, PromoConfig } from '../types'

const defaultConfig: PromoConfig = {
  layout: { columns: 2 },
  header: { imagePath: '', height: 120 },
  footer: { imagePath: '', height: 80 },
  background: { imagePath: '', height: 800 },
}

export default function PromoEditor() {
  const [products, setProducts] = useState<Product[]>([])
  const [config, setConfig] = useState<PromoConfig>(defaultConfig)
  const previewRef = useRef<HTMLDivElement>(null)

  function handleCSVUpload(file: File | null) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const parsed = parseCSV(e.target?.result as string)
        setProducts(parsed)
      } catch (err) {
        console.error('CSV parse error:', err)
      }
    }
    reader.readAsText(file)
  }

  return (
    <div style={{ display: 'flex', gap: '24px', padding: '24px' }}>
      {/* Config Panel */}
      <div style={{ width: 320, flexShrink: 0 }}>
        <Stack>
          <Text size="xl" fw={700}>Promo Editor</Text>

          <TextInput label="Project Name" placeholder="My Promo" />

          <FileInput
            label="Upload CSV"
            placeholder="Select CSV file..."
            accept=".csv"
            onChange={handleCSVUpload}
          />

          <Paper withBorder p="md">
            <Text size="sm" fw={500} mb="xs">Layout</Text>
            <SegmentedControl
              value={String(config.layout.columns)}
              onChange={(val) => setConfig({
                ...config,
                layout: { columns: parseInt(val) as 2 | 3 | 4 }
              })}
              data={[
                { label: '2 Col', value: '2' },
                { label: '3 Col', value: '3' },
                { label: '4 Col', value: '4' },
              ]}
            />
          </Paper>

          <Paper withBorder p="md">
            <Text size="sm" fw={500} mb="xs">Header</Text>
            <HeaderConfig
              config={config.header}
              onChange={(header) => setConfig({ ...config, header })}
            />
          </Paper>

          <Paper withBorder p="md">
            <Text size="sm" fw={500} mb="xs">Background</Text>
            <BackgroundConfig
              config={config.background}
              onChange={(background) => setConfig({ ...config, background })}
            />
          </Paper>

          <Paper withBorder p="md">
            <Text size="sm" fw={500} mb="xs">Footer</Text>
            <FooterConfig
              config={config.footer}
              onChange={(footer) => setConfig({ ...config, footer })}
            />
          </Paper>

          <Group>
            <ExportButton targetRef={previewRef} />
          </Group>
        </Stack>
      </div>

      {/* Preview Panel */}
      <div style={{ flex: 1, overflow: 'auto', background: '#f0f0f0', padding: '16px' }}>
        <div
          ref={previewRef}
          style={{
            background: config.background.imagePath
              ? `url(${config.background.imagePath}) center/cover`
              : '#fff',
            minHeight: config.background.height,
            width: '100%',
            maxWidth: 600,
            margin: '0 auto',
          }}
        >
          {config.header.imagePath && (
            <img
              src={config.header.imagePath}
              alt="Header"
              style={{ width: '100%', height: config.header.height, objectFit: 'cover' }}
            />
          )}
          <ProductGrid products={products} columns={config.layout.columns} />
          {config.footer.imagePath && (
            <img
              src={config.footer.imagePath}
              alt="Footer"
              style={{ width: '100%', height: config.footer.height, objectFit: 'cover' }}
            />
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update frontend/src/App.tsx**

```typescript
import PromoEditor from './pages/PromoEditor'

export default function App() {
  return <PromoEditor />
}
```

- [ ] **Step 3: Commit**

```bash
cd ~/Repo/dream-forge/projects/supermarket-promo
git add -A
git commit -m "feat: add PromoEditor page with full config UI"
```

---

### Task 7: Sample CSV and README

**Files:**
- Create: `frontend/sample.csv`
- Create: `frontend/README.md`

- [ ] **Step 1: Create frontend/sample.csv**

```csv
name,price,image_path
Organic Milk 1L,3.99,https://example.com/milk.png
Fresh Eggs 12pk,4.49,https://example.com/eggs.png
Whole Wheat Bread,2.99,https://example.com/bread.png
Orange Juice 1L,3.29,https://example.com/oj.png
Greek Yogurt,5.49,https://example.com/yogurt.png
Cheddar Cheese,6.99,https://example.com/cheese.png
Chicken Breast,8.99,https://example.com/chicken.png
Basmati Rice 2kg,7.49,https://example.com/rice.png
```

- [ ] **Step 2: Create frontend/README.md**

```markdown
# Supermarket Promo Frontend

## Setup

```bash
npm install
npm run dev
```

## Usage

1. Upload a CSV file with columns: `name`, `price`, `image_path`
2. Configure layout columns (2, 3, or 4)
3. Set header, footer, and background images with dimensions
4. Click "Export as PNG" to download the promo page
```

- [ ] **Step 3: Commit**

```bash
cd ~/Repo/dream-forge/projects/supermarket-promo
git add -A
git commit -m "docs: add sample.csv and README"
```

---

## Self-Review Checklist

- **Spec coverage:** All spec features covered (CSV parsing, configurable layout, header/footer/background with scalable images, html2canvas export)
- **No placeholders:** All code is complete, no TBD/TODO
- **Type consistency:** Product, ThemeConfig, PromoConfig types used consistently across files

---

**Plan complete and saved to `projects/supermarket-promo/docs/superpowers/plans/2026-05-03-supermarket-promo-implementation-plan.md`**

Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session, batch execution with checkpoints

Which approach?
