export default function InvoicePage() {
  return (
    <main style={{ padding: 40, maxWidth: 1100, margin: '0 auto' }}>
      <h1>New Invoice</h1>
      <p>Invoice workspace foundation.</p>
      <section style={{ marginTop: 24, padding: 24, border: '1px solid #ddd', borderRadius: 12 }}>
        <h2>Customer</h2>
        <label>Search customer</label>
        <input style={{ display: 'block', width: '100%', padding: 14, marginTop: 8 }} placeholder="Name, code, phone or GSTIN" />
      </section>
    </main>
  )
}
