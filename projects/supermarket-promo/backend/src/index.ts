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