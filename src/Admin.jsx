import { useState, useEffect, useRef } from 'react'
import { api, priceText } from './lib'
import './admin.css'

const BLANK = { title: '', category: 'House', mode: 'buy', status: 'available', published: true, featured: false, location: '', address: '', price: '', bedrooms: '', bathrooms: '', size: '', description: '', features: [], plots: [], promoEnds: '', images: [] }

// Shrinks big phone photos before upload (max 2000px, JPEG). Falls back to the original file.
async function shrink(file) {
  try {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file
    const bmp = await createImageBitmap(file), k = Math.min(1, 2000 / Math.max(bmp.width, bmp.height))
    if (k === 1 && file.size < 1.5e6) return file
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k)
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height)
    return await new Promise((ok) => c.toBlob((b) => ok(b || file), 'image/jpeg', 0.86))
  } catch { return file }
}

export default function Admin() {
  const [auth, setAuth] = useState(null)
  useEffect(() => { api('/admin/me').then(() => setAuth(true)).catch(() => setAuth(false)) }, [])
  if (auth === null) return null
  return auth ? <Panel out={() => api('/admin/logout', { method: 'POST' }).finally(() => setAuth(false))} /> : <Login ok={() => setAuth(true)} />
}

function Login({ ok }) {
  const [pw, setPw] = useState(''), [err, setErr] = useState(''), [busy, setBusy] = useState(false), [show, setShow] = useState(false)
  const go = async (e) => { e.preventDefault(); setBusy(true); setErr(''); try { await api('/admin/login', { method: 'POST', body: JSON.stringify({ password: pw }) }); ok() } catch (x) { setErr(x.message) } setBusy(false) }
  return (
    <div className="ad login">
      <section className="login-visual" aria-label="Oklad Property">
        <img src="/hero.jpg" alt="Contemporary Lagos residence" />
        <div className="login-visual-shade" />
        <a className="login-brand" href="/">OKLAD <i>PROPERTY</i></a>
        <div className="login-message"><span>PROPERTY, THOUGHTFULLY FOUND</span><h1>Make room for<br />what comes next.</h1><i className="login-rule" /></div>
      </section>
      <section className="login-side">
        <div className="login-panel">
          <a className="login-back" href="/">← Back to the public site</a>
          <span className="eyebrow">Oklad staff workspace</span>
          <h2>Welcome back.</h2>
          <p className="login-intro">Sign in to manage the property collection and enquiries.</p>
          <form onSubmit={go}>
            <label htmlFor="admin-password">Admin password</label>
            <div className="login-password"><input id="admin-password" autoFocus type={show ? 'text' : 'password'} placeholder="Enter your password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" /><button type="button" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow(!show)}>{show ? 'Hide' : 'Show'}</button></div>
            {err && <p className="err" role="alert">{err}</p>}
            <button className="b pri login-submit" disabled={busy || !pw}>{busy ? 'Signing in…' : 'Sign in to dashboard'} <span aria-hidden="true">↗</span></button>
          </form>
          <div className="login-foot"><span className="login-dot" />Private access for Oklad Property staff</div>
        </div>
      </section>
    </div>
  )
}

function Panel({ out }) {
  const [tab, setTab] = useState('overview')
  const [props, setProps] = useState(null), [enq, setEnq] = useState([]), [edit, setEdit] = useState(null)
  const loadP = () => api('/admin/properties').then(setProps).catch(() => out())
  const loadE = () => api('/admin/enquiries').then(setEnq).catch(() => {})
  useEffect(() => { loadP(); loadE() }, [])
  const unread = enq.filter((e) => !e.read).length
  return (
    <div className="ad">
      <header><b>Oklad Property <span>Admin</span></b>
        <nav>
          <button className={tab === 'overview' ? 'on' : ''} onClick={() => setTab('overview')}>Overview</button>
          <button className={tab === 'listings' ? 'on' : ''} onClick={() => setTab('listings')}>Listings</button>
          <button className={tab === 'enq' ? 'on' : ''} onClick={() => { setTab('enq'); loadE() }}>Enquiries{unread > 0 && <i>{unread}</i>}</button>
          <button className={tab === 'set' ? 'on' : ''} onClick={() => setTab('set')}>Settings</button>
        </nav>
        <span><a href="/" target="_blank">View site</a><button onClick={out}>Sign out</button></span>
      </header>
      <main>
        {tab === 'overview' && <Overview props={props} enquiries={enq} openListings={() => setTab('listings')} openEnquiries={() => { setTab('enq'); loadE() }} openSettings={() => setTab('set')} addListing={() => { setTab('listings'); setEdit({ ...BLANK }) }} />}
        {tab === 'listings' && (edit ? <Editor init={edit} done={(r) => { setEdit(null); if (r) loadP() }} /> : <Listings props={props} edit={setEdit} reload={loadP} />)}
        {tab === 'enq' && <Enquiries list={enq} reload={loadE} />}
        {tab === 'set' && <Settings />}
      </main>
    </div>
  )
}

function Overview({ props, enquiries, openListings, openEnquiries, openSettings, addListing }) {
  const live = (props || []).filter((p) => p.published).length
  const unread = enquiries.filter((e) => !e.read).length
  const recent = [...(props || [])].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 4)
  return <section className="dashboard">
    <div className="dash-heading"><div><span className="eyebrow">Your workspace</span><h1>Overview</h1><p>Manage the Oklad Property website and respond to new enquiries.</p></div><button className="b pri" onClick={addListing}>+ Add a property</button></div>
    <div className="dash-metrics"><article><span>All properties</span><b>{props ? props.length : '—'}</b><small>Listings in your portfolio</small></article><article><span>Published</span><b>{props ? live : '—'}</b><small>Visible on the website</small></article><article><span>Enquiries</span><b>{enquiries.length}</b><small>{unread} unread</small></article></div>
    <div className="dash-lower"><section className="dash-card"><div className="dash-card-head"><div><span className="eyebrow">Recently updated</span><h2>Your properties</h2></div><button className="dash-link" onClick={openListings}>View all →</button></div>{recent.length ? recent.map((p) => <div className="dash-property" key={p.id}><img src={p.images[0] || ''} alt=""/><div><b>{p.title}</b><small>{p.location} · {p.category}</small></div><span className={p.published ? 'status-live' : 'status-hidden'}>{p.published ? 'Published' : 'Hidden'}</span></div>) : <p className="dash-empty">Your properties will appear here after you add them.</p>}</section>
      <section className="dash-card dash-inbox"><span className="eyebrow">Inbox</span><h2>Enquiries</h2><p>{unread ? `You have ${unread} new ${unread === 1 ? 'enquiry' : 'enquiries'} to review.` : 'You’re up to date. New website enquiries will appear here.'}</p><button className="b" onClick={openEnquiries}>Open inbox {unread > 0 && <i>{unread}</i>}</button></section></div>
    <div className="dash-help"><span>Need to update phone, WhatsApp, email or social links?</span><button className="dash-link" onClick={openSettings}>Open site settings →</button></div>
  </section>
}

function Listings({ props, edit, reload }) {
  const [query, setQuery] = useState('')
  if (!props) return <p>Loading…</p>
  const filtered = props.filter((p) => `${p.title} ${p.location} ${p.category}`.toLowerCase().includes(query.toLowerCase()))
  const del = async (p) => { if (confirm(`Delete “${p.title}” and its photos? This can’t be undone.`)) { await api('/admin/properties/' + p.id, { method: 'DELETE' }); reload() } }
  const toggle = async (p, k) => { await api('/admin/properties/' + p.id, { method: 'PUT', body: JSON.stringify({ ...p, [k]: !p[k] }) }); reload() }
  return (<>
    <div className="bar listing-bar"><div><span className="eyebrow">Portfolio</span><h2>{props.length} {props.length === 1 ? 'property' : 'properties'}</h2></div><div className="listing-tools"><input aria-label="Search listings" placeholder="Search properties" value={query} onChange={(e) => setQuery(e.target.value)} /><button className="b pri" onClick={() => edit({ ...BLANK })}>+ Add property</button></div></div>
    {!props.length && <p>No listings yet. Add your first one.</p>}
    {props.length > 0 && !filtered.length && <p>No properties match “{query}”.</p>}
    <div className="rows">{filtered.map((p) => (
      <div className="row" key={p.id}>
        <img src={p.images[0] || ''} alt="" />
        <div className="grow"><b>{p.title}</b><small>{p.location} · {p.category} · {p.mode === 'buy' ? 'For sale' : 'To rent'} · {priceText(p)}</small>
          <small>{p.images.length} photo{p.images.length === 1 ? '' : 's'}{p.status !== 'available' ? ' · ' + p.status : ''}</small></div>
        <button className={'chip' + (p.published ? ' on' : '')} onClick={() => toggle(p, 'published')}>{p.published ? 'Live' : 'Hidden'}</button>
        <button className={'chip' + (p.featured ? ' on' : '')} onClick={() => toggle(p, 'featured')}>{p.featured ? 'Featured' : 'Feature'}</button>
        <button className="b" onClick={() => edit({ ...BLANK, ...p })}>Edit</button>
        <button className="b dng" onClick={() => del(p)}>Delete</button>
      </div>))}</div>
  </>)
}

function Editor({ init, done }) {
  const [d, setD] = useState({ ...init, features: init.features.join('\n'), price: init.price || '', bedrooms: init.bedrooms || '', bathrooms: init.bathrooms || '', size: init.size || '' })
  const [err, setErr] = useState(''), [busy, setBusy] = useState(false), [up, setUp] = useState(0)
  const file = useRef(null)
  const set = (k) => (e) => setD((o) => ({ ...o, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  const upload = async (files) => {
    setErr('')
    for (const f of [...files]) {
      setUp((n) => n + 1)
      try { const blob = await shrink(f); const r = await api('/admin/upload', { method: 'POST', body: blob, headers: { 'Content-Type': 'application/octet-stream' } }); setD((o) => ({ ...o, images: [...o.images, r.url] })) }
      catch (x) { setErr(f.name + ': ' + x.message) }
      setUp((n) => n - 1)
    }
  }
  const move = (i, j) => setD((o) => { const a = [...o.images]; if (j < 0 || j >= a.length) return o; [a[i], a[j]] = [a[j], a[i]]; return { ...o, images: a } })
  const plot = (i, k, v) => setD((o) => ({ ...o, plots: o.plots.map((p, n) => (n === i ? { ...p, [k]: v } : p)) }))
  const save = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true)
    const body = { ...d, features: d.features.split('\n').map((s) => s.trim()).filter(Boolean) }
    try { await api('/admin/properties' + (d.id ? '/' + d.id : ''), { method: d.id ? 'PUT' : 'POST', body: JSON.stringify(body) }); done(true) }
    catch (x) { setErr(x.message); scrollTo({ top: 0 }) }
    setBusy(false)
  }
  const land = d.category === 'Land'
  return (
    <form className="ed" onSubmit={save}>
      <div className="bar"><h2>{d.id ? 'Edit listing' : 'New listing'}</h2><span><button type="button" className="b" onClick={() => done(false)}>Cancel</button> <button className="b pri" disabled={busy || up > 0}>{busy ? 'Saving…' : 'Save listing'}</button></span></div>
      {err && <p className="err">{err}</p>}
      <div className="g2">
        <label>Title<input required value={d.title} onChange={set('title')} maxLength={120} placeholder="e.g. 4-bedroom duplex, Lekki" /></label>
        <label>Location (area)<input required value={d.location} onChange={set('location')} maxLength={60} placeholder="e.g. Lekki Phase 1" /></label>
        <label>Type<select value={d.category} onChange={set('category')}><option>House</option><option>Apartment</option><option>Duplex</option><option>Land</option></select></label>
        <label>For<select value={d.mode} onChange={set('mode')}><option value="buy">Sale</option><option value="rent">Rent</option></select></label>
        <label>Street / estate (optional)<input value={d.address} onChange={set('address')} maxLength={120} /></label>
        <label>Status<select value={d.status} onChange={set('status')}><option value="available">Available</option><option value="under-offer">Under offer</option><option value="sold">Sold / let</option></select></label>
        <label>Price in ₦ {d.mode === 'rent' && '(per year)'}<input inputMode="numeric" value={d.price} onChange={set('price')} placeholder="Leave empty for “Price on request”" /></label>
        <label>Size (sqm)<input inputMode="numeric" value={d.size} onChange={set('size')} /></label>
        <label>Bedrooms<input inputMode="numeric" value={d.bedrooms} onChange={set('bedrooms')} /></label>
        <label>Bathrooms<input inputMode="numeric" value={d.bathrooms} onChange={set('bathrooms')} /></label>
      </div>
      {land && (<fieldset><legend>Plot sizes &amp; prices (optional)</legend>
        {d.plots.map((p, i) => (<div className="g4" key={i}>
          <label>Size (sqm)<input inputMode="numeric" value={p.size || ''} onChange={(e) => plot(i, 'size', e.target.value)} /></label>
          <label>Price ₦<input inputMode="numeric" value={p.price || ''} onChange={(e) => plot(i, 'price', e.target.value)} /></label>
          <label>Old price ₦ (optional)<input inputMode="numeric" value={p.was || ''} onChange={(e) => plot(i, 'was', e.target.value)} /></label>
          <button type="button" className="b dng" onClick={() => setD((o) => ({ ...o, plots: o.plots.filter((_, n) => n !== i) }))}>Remove</button>
        </div>))}
        <button type="button" className="b" onClick={() => setD((o) => ({ ...o, plots: [...o.plots, { size: '', price: '', was: '' }] }))}>+ Add plot size</button>
        <label>Promo ends (optional)<input type="date" value={d.promoEnds} onChange={set('promoEnds')} /></label>
      </fieldset>)}
      <label>Description<textarea rows={5} value={d.description} onChange={set('description')} maxLength={4000} /></label>
      <label>Features / documents (one per line)<textarea rows={4} value={d.features} onChange={set('features')} placeholder={'Certificate of Occupancy\nGated estate\nBoys’ quarters'} /></label>
      <fieldset><legend>Photos — the first one is the cover</legend>
        <div className="imgs">
          {d.images.map((u, i) => (<div key={u} className="im"><img src={u} alt="" />{i === 0 && <em>Cover</em>}
            <div><button type="button" onClick={() => move(i, i - 1)} disabled={!i} aria-label="Move earlier">←</button><button type="button" onClick={() => move(i, i + 1)} disabled={i === d.images.length - 1} aria-label="Move later">→</button><button type="button" onClick={() => setD((o) => ({ ...o, images: o.images.filter((x) => x !== u) }))} aria-label="Remove">×</button></div></div>))}
          <button type="button" className="add" onClick={() => file.current.click()}>{up ? `Uploading ${up}…` : '+ Add photos'}</button>
        </div>
        <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => { upload(e.target.files); e.target.value = '' }} />
      </fieldset>
      <div className="g2"><label className="ck"><input type="checkbox" checked={d.published} onChange={set('published')} /> Show on the website</label>
        <label className="ck"><input type="checkbox" checked={d.featured} onChange={set('featured')} /> Feature (shown first)</label></div>
    </form>
  )
}

function Enquiries({ list, reload }) {
  const mark = async (e) => { await api('/admin/enquiries/' + e.id, { method: 'PATCH', body: JSON.stringify({ read: !e.read }) }); reload() }
  const del = async (e) => { if (confirm('Delete this enquiry?')) { await api('/admin/enquiries/' + e.id, { method: 'DELETE' }); reload() } }
  if (!list.length) return <p>No enquiries yet. They’ll appear here when someone fills in a form on the site.</p>
  return (<><div className="bar"><h2>{list.length} enquiries</h2></div><div className="rows">{list.map((e) => (
    <div className={'row col' + (e.read ? '' : ' new')} key={e.id}>
      <div><b>{e.name}</b> <small>{new Date(e.createdAt).toLocaleString('en-GB')}{e.propertyTitle && ' · ' + e.propertyTitle}</small></div>
      {e.message && <p>{e.message}</p>}
      <div className="acts"><a className="b" href={'tel:' + e.phone.replace(/[^\d+]/g, '')}>Call {e.phone}</a>
        <a className="b" target="_blank" rel="noopener" href={'https://wa.me/' + e.phone.replace(/\D/g, '').replace(/^0/, '234')}>WhatsApp</a>
        {e.email && <a className="b" href={'mailto:' + e.email}>Email</a>}
        <button className="b" onClick={() => mark(e)}>{e.read ? 'Mark unread' : 'Mark read'}</button><button className="b dng" onClick={() => del(e)}>Delete</button></div>
    </div>))}</div></>)
}

function Settings() {
  const [s, setS] = useState(null), [msg, setMsg] = useState(''), [pw, setPw] = useState({ current: '', next: '' }), [pm, setPm] = useState('')
  useEffect(() => { api('/admin/settings').then(setS) }, [])
  if (!s) return null
  const F = [['whatsapp', 'WhatsApp number', 'e.g. 2348012345678 (with country code)'], ['phone', 'Phone number', 'e.g. +234 801 234 5678'], ['email', 'Email', ''], ['address', 'Office address', ''], ['hours', 'Opening hours', ''], ['instagram', 'Instagram link', 'https://instagram.com/…'], ['facebook', 'Facebook link', 'https://facebook.com/…']]
  const save = async (e) => { e.preventDefault(); try { setS(await api('/admin/settings', { method: 'PUT', body: JSON.stringify(s) })); setMsg('Saved.') } catch (x) { setMsg(x.message) } }
  const chg = async (e) => { e.preventDefault(); try { await api('/admin/password', { method: 'POST', body: JSON.stringify(pw) }); setPm('Password changed.'); setPw({ current: '', next: '' }) } catch (x) { setPm(x.message) } }
  return (<div className="g2 set">
    <form onSubmit={save}><h2>Contact details</h2><p className="hint">These appear on the website. The WhatsApp and Call buttons only show once you add a number.</p>
      {F.map(([k, l, ph]) => <label key={k}>{l}<input value={s[k] || ''} placeholder={ph} onChange={(e) => setS({ ...s, [k]: e.target.value })} /></label>)}
      <button className="b pri">Save settings</button> {msg && <span className="hint">{msg}</span>}</form>
    <form onSubmit={chg}><h2>Change password</h2>
      <label>Current password<input type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} autoComplete="current-password" /></label>
      <label>New password (8+ characters)<input type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} autoComplete="new-password" /></label>
      <button className="b pri">Change password</button> {pm && <span className="hint">{pm}</span>}</form>
  </div>)
}
