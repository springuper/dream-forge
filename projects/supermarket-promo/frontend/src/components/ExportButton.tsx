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