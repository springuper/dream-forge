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