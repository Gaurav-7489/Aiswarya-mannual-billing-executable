'use client'

import { FormEvent, useEffect, useState } from 'react'
import './settings.css'

type Settings = Record<string, string>

const groups = [
  { title: 'Company identity', fields: [['name','Company name'],['tagline','Tagline'],['address','Address'],['gstin','GSTIN'],['fssai','FSSAI / License No.']] },
  { title: 'Contact', fields: [['phone','Phone'],['email','Email'],['website','Website'],['logoUrl','Logo URL']] },
  { title: 'Bank details', fields: [['bankAccountName','Account name'],['bankName','Bank name'],['bankAccountNumber','Account number'],['bankIfsc','IFSC code'],['bankBranch','Branch']] },
  { title: 'Invoice footer', fields: [['authorizedSignatory','Authorized signatory'],['footerMessage','Footer message'],['footerTagline','Footer tagline'],['terms','Terms & conditions']] },
]

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({})
  const [status, setStatus] = useState('')
  useEffect(() => { fetch('/api/settings/company').then(r => r.json()).then(d => setSettings(d.settings ?? {})).catch(() => setStatus('Unable to load settings.')) }, [])
  const update = (key: string, value: string) => setSettings(s => ({ ...s, [key]: value }))
  async function save(e: FormEvent) {
    e.preventDefault(); setStatus('Saving…')
    const res = await fetch('/api/settings/company', { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(settings) })
    const data = await res.json(); setStatus(res.ok ? 'Saved successfully.' : (data.error ?? 'Unable to save settings.'))
    if (res.ok) setSettings(data.settings)
  }
  return <main className="settings-page"><div className="settings-header"><div><p className="eyebrow">SETTINGS</p><h1>Company & Invoice Settings</h1><p>These details appear on every printed A4 invoice. Keep them accurate before production.</p></div><a href="/invoice" className="secondary-button">← Back to Billing</a></div>
    <form onSubmit={save}>
      {groups.map(group => <section className="settings-card" key={group.title}><h2>{group.title}</h2><div className="settings-grid">{group.fields.map(([key,label]) => <label key={key} className={['address','terms'].includes(key) ? 'wide' : ''}>{label}<textarea rows={['address','terms'].includes(key) ? 4 : 1} value={settings[key] ?? ''} onChange={e=>update(key,e.target.value)} placeholder={label}/></label>)}</div></section>)}
      <section className="settings-card"><h2>Tax defaults</h2><label className="select-field">Default GST mode<select value={settings.defaultGstMode ?? 'INTRA'} onChange={e=>update('defaultGstMode',e.target.value)}><option value="INTRA">Intra-state — CGST + SGST</option><option value="INTER">Inter-state — IGST</option></select></label><p className="hint">This is the default for new billing flows. Final GST treatment should be confirmed with the business accountant.</p></section>
      <div className="save-bar"><span className={status.includes('success') ? 'success' : ''}>{status}</span><button type="submit">Save Company Settings</button></div>
    </form>
  </main>
}
