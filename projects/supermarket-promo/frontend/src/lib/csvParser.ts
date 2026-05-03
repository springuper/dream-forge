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