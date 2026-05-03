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