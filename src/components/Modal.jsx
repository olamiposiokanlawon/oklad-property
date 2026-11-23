import { useState } from 'react'
import Ph from './Ph'
import Enquire from './Enquire'
import { fmt, priceText, sizeText, promoOn, dateText, wa } from '../lib'

export default function Modal({ p, site, close }) {
  const [i, setI] = useState(0)
  const [form, setForm] = useState(false)
  const promo = promoOn(p), link = typeof location !== 'undefined' ? location.origin + '/#/p/' + p.id : ''
  const msg = `Hello Oklad Property, I’m interested in ${p.title} (${p.location}). ${link}`
  const share = async () => { try { navigator.share ? await navigator.share({ title: p.title, url: link }) : await navigator.clipboard.writeText(link) } catch {} }
  return (
    <div className="mod" onClick={(e) => e.target === e.currentTarget && close()} role="dialog" aria-modal="true" aria-label={p.title}>
      <div className="mb">
        <button className="x" aria-label="Close" onClick={close}>×</button>
        <div className="img">
          <Ph src={p.images[i]} alt={p.title} />
          {p.images.length > 1 && <div className="thumbs">{p.images.map((u, k) => <button key={u} className={k === i ? 'on' : ''} onClick={() => setI(k)} aria-label={'Photo ' + (k + 1)}><img src={u} alt="" /></button>)}</div>}
        </div>
        <div className="tx">
          <span className="eyebrow">{p.location} · {p.category}{p.status !== 'available' && ' · ' + (p.status === 'sold' ? 'Sold' : 'Under offer')}</span>
          <h3>{p.title}</h3>
          {p.address && <p className="addr">{p.address}</p>}
          <div className="price">{priceText(p)}{p.mode === 'rent' && p.price > 0 && <small> / year</small>}</div>
          {p.plots?.length > 0 && (
            <table className="plots"><tbody>
              {p.plots.map((x) => <tr key={x.size}><td>{x.size} sqm</td><td>{fmt(x.price)}</td><td>{promo && x.was > x.price ? <s>{fmt(x.was)}</s> : ''}</td></tr>)}
            </tbody></table>
          )}
          {promo && <p className="promo">Promo price valid until {dateText(p.promoEnds)}</p>}
          <div className="spec">
            {p.bedrooms > 0 && <span><b>{p.bedrooms}</b> bed</span>}
            {p.bathrooms > 0 && <span><b>{p.bathrooms}</b> bath</span>}
            {p.size > 0 && <span><b>{sizeText(p)}</b></span>}
          </div>
          {p.description && <p className="desc">{p.description}</p>}
          {p.features.length > 0 && <ul className="feat">{p.features.map((f) => <li key={f}>{f}</li>)}</ul>}
          <div className="acts">
            {site.whatsapp && <a className="btn dark" href={wa(site.whatsapp, msg)} target="_blank" rel="noopener">Chat on WhatsApp</a>}
            {site.phone && <a className="btn" href={'tel:' + site.phone.replace(/[^\d+]/g, '')}>Call</a>}
            {!form && <button className="btn" onClick={() => setForm(true)}>Send enquiry</button>}
            <button className="btn" onClick={share}>Share</button>
          </div>
          {form && <Enquire property={p} />}
        </div>
      </div>
    </div>
  )
}
