import { NumberInput, FileButton, Button, Stack, Text } from '@mantine/core'
import type { ThemeConfig } from '../types'

interface HeaderConfigProps {
  config: ThemeConfig
  onChange: (config: ThemeConfig) => void
}

export default function HeaderConfig({ config, onChange }: HeaderConfigProps) {
  return (
    <Stack gap="xs">
      <FileButton onChange={(file) => {
        if (file) {
          onChange({ ...config, imagePath: URL.createObjectURL(file) })
        }
      }} accept="image/*">
        {(props) => <Button {...props} variant="light" size="xs">Upload Image</Button>}
      </FileButton>
      {config.imagePath && (
        <Text size="xs" c="dimmed" style={{ wordBreak: 'break-all' }}>
          Current: {config.imagePath.substring(0, 50)}...
        </Text>
      )}
      <NumberInput
        label="Height (px)"
        value={config.height}
        min={50}
        max={500}
        onChange={(val) => onChange({ ...config, height: Number(val) })}
        style={{ width: 100 }}
      />
    </Stack>
  )
}
