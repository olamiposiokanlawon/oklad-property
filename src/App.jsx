import { useEffect, useMemo, useRef, useState } from 'react'
import { api, priceText, sizeText, CATS, wa, fmt, promoOn, dateText } from './lib'
import Ph from './components/Ph'
import Card from './components/Card'
import Enquire from './components/Enquire'

const EMPTY = { loc: '', type: '', min: 0, max: 0, bd: 0, ba: 0, mode: '' }
const routeNow = () => {
  const legacy = location.hash.match(/^#\/p\/([\w-]+)/)
  return legacy ? '/property/' + legacy[1] : location.pathname + location.search
}

export default function App() {
  const [route, setRoute] = useState(routeNow)
  const [all, setAll] = useState(null)
  const [site, setSite] = useState({})
  const [loadErr, setLoadErr] = useState(false)
  const [f, setF] = useState(EMPTY)
  const [menu, setMenu] = useState(false)

  useEffect(() => {
    Promise.all([api('/properties'), api('/site')]).then(([p, s]) => {
      if (!Array.isArray(p)) throw new Error('The properties API did not return a list.')
      setAll(p)
      setSite(s && typeof s === 'object' && !Array.isArray(s) ? s : {})
    }).catch(() => setLoadErr(true))
    const pop = () => { setRoute(routeNow()); setMenu(false); window.scrollTo(0, 0) }
    addEventListener('popstate', pop)
    return () => removeEventListener('popstate', pop)
  }, [])
  const navigate = (path) => { location.assign(path) }
  const link = (path) => (e) => { e.preventDefault(); navigate(path) }
  const list = useMemo(() => (all || []).filter((p) =>
    (!f.mode || p.mode === f.mode) && (!f.loc || p.location === f.loc) &&
    (!f.type || p.category === f.type) && (!f.bd || p.bedrooms >= f.bd) &&
    (!f.ba || p.bathrooms >= f.ba)
  ), [all, f])
  const home = route.split('?')[0] === '/' || route.startsWith('/#')
  const properties = route.startsWith('/properties')
  const detailId = route.match(/^\/property\/([\w-]+)/)?.[1]
  const property = detailId && all?.find((p) => p.id === detailId)

  return <>
    <Header menu={menu} setMenu={setMenu} navigate={navigate} link={link} home={home} />
    {home && <Home all={all} site={site} list={list} loadErr={loadErr} setF={setF} navigate={navigate} link={link} />}
    {properties && <Properties all={all} site={site} list={list} loadErr={loadErr} f={f} setF={setF} navigate={navigate} />}
    {detailId && (property ? <Detail p={property} site={site} navigate={navigate} /> : <section className="page-empty wrap"><span className="eyebrow">Property</span><h1>{all ? 'This listing is unavailable.' : 'Loading property…'}</h1><a className="text-link" href="/properties" onClick={link('/properties')}>Return to properties</a></section>)}
    {route === '/about' && <About all={all} site={site} navigate={navigate} />}
    {route === '/services' && <Services navigate={navigate} />}
    {route === '/contact' && <Contact site={site} />}
    {!home && !properties && !detailId && !['/about', '/services', '/contact'].includes(route) && <section className="page-empty wrap"><span className="eyebrow">Oklad Property</span><h1>Page not found.</h1><a className="text-link" href="/" onClick={link('/')}>Return home</a></section>}
    <Footer site={site} navigate={navigate} link={link} />
  </>
}

function Header({ menu, setMenu, navigate, link, home }) {
  const [solid, setSolid] = useState(!home || scrollY > 400)
  useEffect(() => { const onScroll = () => setSolid(!home || scrollY > 400); onScroll(); addEventListener('scroll', onScroll, { passive: true }); return () => removeEventListener('scroll', onScroll) }, [home])
  const items = [['Properties', '/properties'], ['About', '/about'], ['Services', '/services'], ['Contact', '/contact']]
  return <nav className={'site-nav' + (menu ? ' open' : '') + (solid ? ' solid' : '')}>
    <div className="wrap nav-inner"><a href="/" className="logo" onClick={link('/')}>OKLAD <i>PROPERTY</i></a>
      <button className="burger" aria-label="Toggle navigation" aria-expanded={menu} onClick={() => setMenu(!menu)}><span /><span /></button>
      <div className="nav-links">{items.map(([t, u]) => <a key={u} href={u} onClick={link(u)}>{t}</a>)}<a className="btn nav-cta" href="/contact" onClick={link('/contact')}>Arrange a viewing</a></div>
    </div>
  </nav>
}

function Home({ all, site, list, loadErr, setF, navigate, link }) {
  const videoRef = useRef(null)
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { video.pause(); return }
    video.play().catch(() => {})
  }, [])
  const featured = (all || []).filter((p) => p.featured).slice(0, 3)
  const show = featured.length ? featured : (all || []).slice(0, 3)
  return <>
    <header className="hero">
      <video ref={videoRef} autoPlay muted loop playsInline preload="metadata" poster="/hero.jpg" aria-hidden="true"><source src="/hero.mp4" type="video/mp4" /></video>
      <div className="hero-shade" />
      <div className="wrap hero-copy"><span className="hero-kicker">A considered way to find home</span><h1>Find a place<br /><i>to belong.</i></h1><p>Thoughtfully selected homes, residences and land across Lagos. Start with a conversation, then experience a place in person.</p>
        <div className="cta"><a className="btn fill" href="/properties" onClick={link('/properties')}>Explore properties <span>↗</span></a><a className="hero-text-link" href="/about" onClick={link('/about')}>Discover Oklad <span>→</span></a></div>
      </div><div className="hero-index">LAGOS, NIGERIA <span>06° 27′ N · 03° 23′ E</span></div>
    </header>
    <section className="intro-band"><div className="wrap intro-grid"><span className="eyebrow">A place, thoughtfully found</span><p>Real estate is personal. We help you explore exceptional properties with clarity, local knowledge and time to make the right decision.</p><a className="text-link" href="/services" onClick={link('/services')}>How we work <span>→</span></a></div></section>
    <section className="featured-section"><div className="wrap"><div className="section-heading"><div><span className="eyebrow">A selection from our portfolio</span><h2>Places worth<br /><i>coming home to.</i></h2></div><a className="text-link" href="/properties" onClick={link('/properties')}>View all properties <span>→</span></a></div>
      {loadErr ? <p className="empty">Our listings are temporarily unavailable. Please contact us directly.</p> : !all ? <p className="empty">Loading properties…</p> : show.length ? <div className="grid editorial-grid">{show.map((p, i) => <Card key={p.id} p={p} i={i} open={() => navigate('/property/' + p.id)} />)}</div> : <p className="empty">New properties are being prepared. Please check back soon.</p>}
    </div></section>
    <section className="story-section"><div className="wrap story-layout"><div className="story-image"><Ph src={(all || [])[0]?.images?.[0] || '/hero.jpg'} alt="A home in the Oklad portfolio" /><span>01 — A Lagos perspective</span></div><div className="story-copy"><span className="eyebrow">Local insight. Personal service.</span><h2>Good property decisions start with <i>good conversation.</i></h2><p>From the first question to the day you walk through the door, our team helps you understand the details, explore your options and make a decision at your own pace.</p><a className="text-link" href="/about" onClick={link('/about')}>Meet Oklad Property <span>→</span></a></div></div></section>
    <Callout site={site} navigate={navigate} />
  </>
}

function Properties({ all, site, list, loadErr, f, setF, navigate }) {
  const locs = [...new Set((all || []).map((p) => p.location))].sort()
  const change = (k, v) => setF((o) => ({ ...o, [k]: v }))
  return <>
    <PageHero eyebrow="The portfolio" title={<>Find your<br /><i>next address.</i></>} copy="Explore a considered collection of homes, apartments and land across Lagos. When something feels right, speak with our team and arrange a visit." />
    <section className="listing-section"><div className="wrap"><div className="filter-panel"><span className="eyebrow">Refine your search</span><div className="filter-fields">
      <label>Availability<select value={f.mode} onChange={(e) => change('mode', e.target.value)}><option value="">All</option><option value="buy">For sale</option><option value="rent">To rent</option></select></label>
      <label>Location<select value={f.loc} onChange={(e) => change('loc', e.target.value)}><option value="">All Lagos</option>{locs.map((x) => <option key={x}>{x}</option>)}</select></label>
      <label>Property type<select value={f.type} onChange={(e) => change('type', e.target.value)}><option value="">All types</option>{CATS.map(([v, x]) => <option key={v} value={v}>{x}</option>)}</select></label>
      <label>Bedrooms<select value={f.bd} onChange={(e) => change('bd', +e.target.value)}>{[0, 1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n ? `${n}+` : 'Any'}</option>)}</select></label>
      {(f.mode || f.loc || f.type || f.bd) && <button className="clear-filter" onClick={() => setF(EMPTY)}>Clear filters ×</button>}
    </div></div>
      <div className="results-head"><span>{loadErr ? 'Listings unavailable' : !all ? 'Loading collection…' : `${list.length} ${list.length === 1 ? 'property' : 'properties'}`}</span><span>Curated across Lagos</span></div>
      {loadErr ? <p className="empty">We couldn’t load the portfolio. Please refresh or contact our team.</p> : !all ? <p className="empty">Loading properties…</p> : list.length ? <div className="grid">{list.map((p, i) => <Card key={p.id} p={p} i={i} open={() => navigate('/property/' + p.id)} />)}</div> : <p className="empty">No properties match those filters. Try a wider search or get in touch with our team.</p>}
    </div></section><Callout site={site} navigate={navigate} />
  </>
}

function Detail({ p, site, navigate }) {
  const [image, setImage] = useState(0)
  const photo = p.images?.[image]
  const promo = promoOn(p)
  const msg = `Hello Oklad Property, I’d like to arrange a viewing for ${p.title} in ${p.location}.`
  return <>
    <div className="detail-top wrap"><a className="text-link" href="/properties" onClick={(e) => { e.preventDefault(); navigate('/properties') }}>← Back to properties</a><span>PROPERTY NO. {String(p.id).toUpperCase()}</span></div>
    <section className="property-detail wrap"><div className="detail-gallery"><div className="detail-main-photo"><Ph src={photo} alt={p.title} />{p.status !== 'available' && <span className="tag detail-tag">{p.status === 'sold' ? (p.mode === 'rent' ? 'Let' : 'Sold') : 'Under offer'}</span>}</div>
      {p.images?.length > 1 && <div className="detail-thumbs">{p.images.map((u, i) => <button key={u} className={i === image ? 'selected' : ''} onClick={() => setImage(i)} aria-label={`View photo ${i + 1}`}><img src={u} alt="" /></button>)}</div>}
    </div><div className="detail-info"><span className="eyebrow">{p.location} · {p.category} · {p.mode === 'rent' ? 'To rent' : 'For sale'}</span><h1>{p.title}</h1>{p.address && <p className="detail-address">{p.address}</p>}
      <p className="detail-price">{priceText(p)}{p.mode === 'rent' && p.price > 0 && <small> / year</small>}</p>
      {promo && <p className="promo">Promotional price until {dateText(p.promoEnds)}</p>}
      <div className="detail-specs">{p.bedrooms > 0 && <span><b>{p.bedrooms}</b> bedrooms</span>}{p.bathrooms > 0 && <span><b>{p.bathrooms}</b> bathrooms</span>}{sizeText(p) && <span><b>{sizeText(p)}</b></span>}</div>
      {p.plots?.length > 0 && <div className="plot-list"><span className="eyebrow">Available plot sizes</span>{p.plots.map((x) => <div key={x.size}><b>{x.size} sqm</b><span>{fmt(x.price)}{promo && x.was > x.price && <s>{fmt(x.was)}</s>}</span></div>)}</div>}
      {p.description && <p className="detail-description">{p.description}</p>}
      {p.features?.length > 0 && <div className="feature-list"><span className="eyebrow">Property details</span><ul>{p.features.map((x) => <li key={x}>{x}</li>)}</ul></div>}
      <div className="detail-actions">{site.whatsapp && <a className="btn dark" href={wa(site.whatsapp, msg)} target="_blank" rel="noopener">Enquire on WhatsApp ↗</a>}{site.phone && <a className="btn" href={'tel:' + site.phone.replace(/[^\d+]/g, '')}>Call our team</a>}</div><p className="detail-note">All enquiries are handled personally by our Lagos team. Viewings are arranged by appointment.</p>
    </div></section><section className="detail-enquiry"><div className="wrap detail-enquiry-grid"><div><span className="eyebrow">Interested in this property?</span><h2>Let’s arrange a<br /><i>closer look.</i></h2><p>Share a few details and our team will be in touch to answer your questions and arrange a private viewing.</p></div><Enquire property={p} dark /></div></section>
  </>
}

function About({ all, site, navigate }) { return <><PageHero eyebrow="Who we are" title={<>Property, with<br /><i>perspective.</i></>} copy="Oklad Property is a Lagos real estate company built around clear advice, local understanding and personal service." /><section className="editorial-about"><div className="wrap story-layout"><div className="story-image"><Ph src={(all || [])[0]?.images?.[0] || '/hero.jpg'} alt="Lagos property" /><span>Rooted in Lagos</span></div><div className="story-copy"><span className="eyebrow">Our approach</span><h2>A considered journey, from first question to <i>front door.</i></h2><p>Finding a property is about more than an address. It is about understanding the neighbourhood, the details and how a place could fit the life you are building.</p><p>We bring together a thoughtful portfolio of residences and land across Lagos, with practical guidance at every step. No pressure to decide online: we answer questions directly and arrange viewings so you can experience a property for yourself.</p><a className="text-link" href="/contact" onClick={(e) => { e.preventDefault(); navigate('/contact') }}>Speak with our team <span>→</span></a></div></div></section><Callout site={site} navigate={navigate} /></> }

function Services({ navigate }) { const blocks = [['01', 'Residential sales', 'Explore carefully selected homes and apartments across Lagos, with clear property details and a team ready to answer your questions.'], ['02', 'Lettings', 'Find a place to rent with practical guidance on availability, viewing arrangements and the details that matter before you move.'], ['03', 'Land & estates', 'Discover estate plots and land opportunities with plot information, location details and documentation explained.'], ['04', 'Property viewings', 'See a property in person. We coordinate private viewings and help you understand the setting, layout and next steps.']]; return <><PageHero eyebrow="What we do" title={<>The right guidance<br /><i>at every step.</i></>} copy="A personal approach to finding, renting and exploring property across Lagos." /><section className="services-section"><div className="wrap services-list">{blocks.map(([n, t, d]) => <article key={n}><em>{n}</em><div><h2>{t}</h2><p>{d}</p></div><span>↗</span></article>)}</div></section><Callout navigate={navigate} /></> }

function Contact({ site }) { return <><PageHero eyebrow="Contact Oklad" title={<>Let’s start a<br /><i>conversation.</i></>} copy="Tell us what you are looking for, ask a question or arrange a private viewing. Our Lagos team will be glad to help." /><section className="contact-page"><div className="wrap contact-page-grid"><div className="contact-details"><span className="eyebrow">We’re here to help</span><h2>Talk to a person,<br /><i>not a checkout.</i></h2><p>Every enquiry goes directly to our team. We will get back to you with the information you need.</p><div className="contact-lines">{site.phone && <a href={'tel:' + site.phone.replace(/[^\d+]/g, '')}>{site.phone}</a>}{site.email && <a href={'mailto:' + site.email}>{site.email}</a>}{site.whatsapp && <a href={wa(site.whatsapp, 'Hello Oklad Property, I’d like to make an enquiry.')} target="_blank" rel="noopener">WhatsApp ↗</a>}{site.address && <span>{site.address}</span>}{site.hours && <span>{site.hours}</span>}</div></div><div className="contact-form-box"><span className="eyebrow">Send an enquiry</span><Enquire dark /></div></div></section></> }

function PageHero({ eyebrow, title, copy }) { return <header className="page-hero"><div className="wrap"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{copy}</p></div><div className="page-hero-mark">O</div></header> }
function Callout({ site, navigate }) { return <section className="callout"><div className="wrap callout-inner"><div><span className="eyebrow">Your next chapter starts with a visit</span><h2>See a property<br /><i>in a new light.</i></h2></div><button className="btn fill" onClick={() => navigate('/contact')}>Arrange a private viewing <span>↗</span></button></div></section> }
function Footer({ site, link }) { return <footer className="site-footer"><div className="wrap footer-main"><div><a href="/" className="logo" onClick={link('/')}>OKLAD <i>PROPERTY</i></a><p>Thoughtful property guidance<br />across Lagos, Nigeria.</p></div><div className="footer-nav"><span className="eyebrow">Explore</span><a href="/properties" onClick={link('/properties')}>Properties</a><a href="/about" onClick={link('/about')}>About us</a><a href="/services" onClick={link('/services')}>Services</a><a href="/contact" onClick={link('/contact')}>Contact</a><a href="/admin">Staff sign in ↗</a></div><div className="footer-nav"><span className="eyebrow">Get in touch</span>{site.phone && <a href={'tel:' + site.phone.replace(/[^\d+]/g, '')}>{site.phone}</a>}{site.email && <a href={'mailto:' + site.email}>{site.email}</a>}{site.instagram && <a href={site.instagram} target="_blank" rel="noopener">Instagram ↗</a>}{site.facebook && <a href={site.facebook} target="_blank" rel="noopener">Facebook ↗</a>}</div></div><div className="wrap footer-bottom"><span>© {new Date().getFullYear()} Oklad Property</span><span>Made for finding your place.</span></div></footer> }
