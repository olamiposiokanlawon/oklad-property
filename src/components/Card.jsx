import Ph from './Ph'
import { priceText, sizeText } from '../lib'

export default function Card({ p, i, open }) {
  const done = p.status !== 'available'
  return (
    <button className="card" style={{ animationDelay: (i % 3) * 70 + 'ms' }} onClick={() => open(p)} aria-label={'View ' + p.title}>
      <div className="img">
        <Ph src={p.images[0]} alt={p.title} />
        <span className="tag">{done ? (p.status === 'sold' ? (p.mode === 'rent' ? 'Let' : 'Sold') : 'Under offer') : p.mode === 'buy' ? 'For sale' : 'To let'}</span>
      </div>
      <div className="m"><span>{p.location}</span><span>{p.category}</span></div>
      <h3>{p.title}</h3>
      <div className="price">{priceText(p)}{p.mode === 'rent' && p.price > 0 && <small> / year</small>}</div>
      <div className="spec">
        {p.bedrooms > 0 && <span><b>{p.bedrooms}</b> bed</span>}
        {p.bathrooms > 0 && <span><b>{p.bathrooms}</b> bath</span>}
        {sizeText(p) && <span><b>{sizeText(p)}</b></span>}
        {!p.bedrooms && !p.bathrooms && !sizeText(p) && <span>Message us for details</span>}
      </div>
      <span className="view">View property</span>
    </button>
  )
}
