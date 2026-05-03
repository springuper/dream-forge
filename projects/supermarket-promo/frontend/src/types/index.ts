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