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