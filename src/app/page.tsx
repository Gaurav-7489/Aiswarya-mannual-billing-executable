export default function Home() {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <section style={{ width: '100%', maxWidth: 720, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 32, boxShadow: '0 8px 30px rgba(0,0,0,.06)' }}>
        <p style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }}>
          Aiswarya Food Products
        </p>
        <h1 style={{ margin: '0 0 12px', fontSize: 36, lineHeight: 1.1 }}>Smart Billing</h1>
        <p style={{ margin: 0, fontSize: 18, lineHeight: 1.6, color: '#4b5563' }}>
          Local-first billing foundation is ready. The next step is the SQLite data layer and the billing workspace.
        </p>
      </section>
    </main>
  )
}
