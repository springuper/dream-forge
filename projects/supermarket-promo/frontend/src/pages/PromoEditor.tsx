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