import { useState } from 'react'
import { api } from '../lib'

// Enquiry form: saved in the admin inbox. `property` optional.
export default function Enquire({ property, dark, onDone }) {
  const [s, setS] = useState({ name: '', phone: '', email: '', message: '', website: '' })
  const [st, setSt] = useState('idle'), [err, setErr] = useState('')
  const set = (k) => (e) => setS((o) => ({ ...o, [k]: e.target.value }))
  const submit = async (e) => {
    e.preventDefault(); setSt('sending'); setErr('')
    try { await api('/enquiries', { method: 'POST', body: JSON.stringify({ ...s, propertyId: property?.id }) }); setSt('sent'); onDone?.() }
    catch (x) { setErr(x.message); setSt('idle') }
  }
  if (st === 'sent') return <p className={dark ? 'thanks' : 'thanks sm'}>Thank you. We’ll call you back shortly.</p>
  return (
    <form onSubmit={submit} className={dark ? '' : 'lite'}>
      <div className="r">
        <div><label htmlFor={'n' + (property?.id || '')}>Name</label><input id={'n' + (property?.id || '')} required value={s.name} onChange={set('name')} autoComplete="name" maxLength={80} /></div>
        <div><label htmlFor={'p' + (property?.id || '')}>Phone</label><input id={'p' + (property?.id || '')} required type="tel" value={s.phone} onChange={set('phone')} autoComplete="tel" maxLength={30} /></div>
      </div>
      <div><label>Email (optional)</label><input type="email" value={s.email} onChange={set('email')} autoComplete="email" maxLength={100} /></div>
      <div><label>Message</label><input value={s.message} onChange={set('message')} maxLength={1500} placeholder={property ? 'I’d like to view this property' : 'What are you looking for?'} /></div>
      <input className="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" value={s.website} onChange={set('website')} name="website" />
      {err && <p className="err" role="alert">{err}</p>}
      <div><button className={'btn ' + (dark ? 'fill' : 'dark')} disabled={st === 'sending'}>{st === 'sending' ? 'Sending…' : 'Send enquiry'}</button></div>
    </form>
  )
}
