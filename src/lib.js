export async function api(path, opt = {}) {
  const r = await fetch('/api' + path, {
    credentials: 'same-origin', ...opt,
    headers: { ...(typeof opt.body === 'string' ? { 'Content-Type': 'application/json' } : {}), ...opt.headers }
  })
  const contentType = r.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    throw Object.assign(new Error('The site API is unavailable or returned an invalid response.'), { status: r.status })
  }
  const j = await r.json().catch(() => { throw Object.assign(new Error('The site API returned invalid JSON.'), { status: r.status }) })
  if (!r.ok) throw Object.assign(new Error(j.error || 'Something went wrong. Please try again.'), { status: r.status })
  return j
}
export const fmt = (n) => '₦' + (n >= 1e9 ? +(n / 1e9).toFixed(2) + 'B' : n >= 1e6 ? +(n / 1e6).toFixed(2) + 'M' : n.toLocaleString('en-NG'))
export const priceOf = (p) => (p.plots?.length ? Math.min(...p.plots.map((x) => x.price)) : p.price || 0)
export const priceText = (p) => { const v = priceOf(p); return !v ? 'Price on request' : (p.plots?.length > 1 ? 'From ' : '') + fmt(v) }
export const sizeText = (p) => (p.plots?.length ? p.plots.map((x) => x.size).join(' · ') + ' sqm' : p.size ? p.size.toLocaleString('en-NG') + ' sqm' : '')
export const promoOn = (p) => !!p.promoEnds && p.promoEnds >= new Date().toISOString().slice(0, 10)
export const dateText = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
export const wa = (num, text) => `https://wa.me/${String(num).replace(/\D/g, '')}?text=${encodeURIComponent(text)}`
export const PR = {
  buy: [[0, 'Any'], [10e6, '₦10M'], [25e6, '₦25M'], [100e6, '₦100M'], [250e6, '₦250M'], [500e6, '₦500M'], [1e9, '₦1B']],
  rent: [[0, 'Any'], [2e6, '₦2M'], [5e6, '₦5M'], [10e6, '₦10M'], [20e6, '₦20M'], [40e6, '₦40M']]
}
export const CATS = [['House', 'Houses'], ['Apartment', 'Apartments'], ['Duplex', 'Duplexes'], ['Land', 'Land']]
