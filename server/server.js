// Oklad Property — zero-dependency Node server: public API, admin API, uploads, static site.
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '..')
try { // tiny .env loader
  for (const l of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/)
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
} catch {}
const PORT = +process.env.PORT || 3000
const DATA = process.env.DATA_DIR || path.join(ROOT, 'data')
const UP = path.join(DATA, 'uploads')
const DBF = path.join(DATA, 'db.json')
const DIST = path.join(ROOT, 'dist')
fs.mkdirSync(UP, { recursive: true })

/* ---------- storage (JSON file, atomic writes) ---------- */
const hash = (pw, salt) => crypto.scryptSync(pw, salt, 64).toString('hex')
const rid = (n = 8) => crypto.randomBytes(n).toString('hex')
const sniff = (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff ? 'jpg'
  : b.slice(0, 4).toString('hex') === '89504e47' ? 'png'
  : b.slice(0, 4).toString() === 'RIFF' && b.slice(8, 12).toString() === 'WEBP' ? 'webp' : null
const slug = (s) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'listing'

let db
function save() { fs.writeFileSync(DBF + '.tmp', JSON.stringify(db)); fs.renameSync(DBF + '.tmp', DBF) }
function init() {
  if (fs.existsSync(DBF)) { db = JSON.parse(fs.readFileSync(DBF, 'utf8')); return }
  let pw = process.env.ADMIN_PASSWORD
  if (!pw) { pw = rid(6); console.log(`\n  No ADMIN_PASSWORD set. Generated admin password: ${pw}\n  (change it in Admin > Settings)\n`) }
  const salt = rid(16)
  db = { secret: rid(32), admin: { salt, hash: hash(pw, salt) }, properties: [], enquiries: [],
    settings: { phone: process.env.PHONE || '', whatsapp: process.env.WHATSAPP || '', email: process.env.EMAIL || '', address: '', hours: 'Mon–Sat, 9am–6pm', instagram: '', facebook: '' } }
  const sd = path.join(HERE, 'seed')
  const seed = JSON.parse(fs.readFileSync(path.join(sd, 'seed.json'), 'utf8'))
  seed.forEach((s, i) => {
    const images = []
    for (const f of s.img || []) {
      const buf = fs.readFileSync(path.join(sd, 'images', f)); const ext = sniff(buf)
      if (ext) { const n = rid(10) + '.' + ext; fs.writeFileSync(path.join(UP, n), buf); images.push('/uploads/' + n) }
    }
    const { img, ...rest } = s
    db.properties.push({ id: slug(s.title), status: 'available', published: true, featured: false, address: '', price: 0, bedrooms: 0, bathrooms: 0, size: 0, features: [], plots: [], promoEnds: '', ...rest, images, createdAt: Date.now() - i * 1000, updatedAt: Date.now() })
  })
  save()
}
init()
// remove uploads that were never attached to a listing (older than a day)
for (const f of fs.readdirSync(UP)) {
  const used = db.properties.some((p) => p.images.includes('/uploads/' + f)), st = fs.statSync(path.join(UP, f))
  if (!used && Date.now() - st.mtimeMs > 864e5) fs.rmSync(path.join(UP, f), { force: true })
}

/* ---------- helpers ---------- */
const json = (res, code, o, h = {}) => { const b = JSON.stringify(o); res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...h }); res.end(b) }
const fail = (code, msg) => Object.assign(new Error(msg), { code })
const readBody = (req, max) => new Promise((ok, no) => {
  const c = []; let n = 0
  req.on('data', (d) => { n += d.length; if (n > max) { no(fail(413, 'File or request too large')); req.destroy() } else c.push(d) })
  req.on('end', () => ok(Buffer.concat(c))); req.on('error', no)
})
const readJson = async (req) => { try { return JSON.parse((await readBody(req, 200e3)).toString() || '{}') } catch (e) { throw e.code ? e : fail(400, 'Invalid request') } }
const hits = new Map()
function limit(key, max, ms) {
  const now = Date.now(), a = (hits.get(key) || []).filter((t) => now - t < ms)
  if (a.length >= max) { hits.set(key, a); return false }
  a.push(now); hits.set(key, a); return true
}
setInterval(() => { const now = Date.now(); for (const [k, a] of hits) if (!a.some((t) => now - t < 3600e3)) hits.delete(k) }, 600e3).unref()
const ip = (req) => (process.env.TRUST_PROXY ? String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() : '') || req.socket.remoteAddress
const sign = (v) => crypto.createHmac('sha256', db.secret).update(v).digest('hex')
const cookies = (req) => Object.fromEntries((req.headers.cookie || '').split(';').map((c) => c.trim().split('=')).filter((p) => p[0]))
const authed = (req) => { const t = cookies(req).oklad_sid; if (!t) return false; const [exp, sig] = t.split('.'); return !!sig && +exp > Date.now() && sig.length === 64 && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(sign(exp))) }
const isHttps = (req) => req.socket.encrypted || req.headers['x-forwarded-proto'] === 'https'

const str = (v, n) => String(v ?? '').trim().slice(0, n)
const num = (v, max = 1e13) => { const n = Number(String(v ?? '').replace(/,/g, '')); return Number.isFinite(n) && n > 0 && n <= max ? n : 0 }
function clean(b) {
  const o = {
    title: str(b.title, 120), category: ['House', 'Apartment', 'Duplex', 'Land'].includes(b.category) ? b.category : 'House',
    mode: b.mode === 'rent' ? 'rent' : 'buy', status: ['available', 'under-offer', 'sold'].includes(b.status) ? b.status : 'available',
    published: b.published !== false, featured: !!b.featured, location: str(b.location, 60), address: str(b.address, 120),
    price: num(b.price), bedrooms: Math.floor(num(b.bedrooms, 99)), bathrooms: Math.floor(num(b.bathrooms, 99)), size: num(b.size, 1e7),
    description: str(b.description, 4000),
    features: (Array.isArray(b.features) ? b.features : []).map((x) => str(x, 60)).filter(Boolean).slice(0, 30),
    plots: (Array.isArray(b.plots) ? b.plots : []).map((x) => ({ size: num(x.size, 1e7), price: num(x.price), was: num(x.was) })).filter((x) => x.size && x.price).slice(0, 10),
    promoEnds: /^\d{4}-\d{2}-\d{2}$/.test(b.promoEnds) ? b.promoEnds : '',
    images: (Array.isArray(b.images) ? b.images : []).filter((u) => /^\/uploads\/[a-f0-9]{16,}\.(jpg|png|webp)$/.test(u)).slice(0, 30)
  }
  if (!o.title) throw fail(400, 'Please add a title')
  if (!o.location) throw fail(400, 'Please add a location')
  return o
}
const dropFiles = (urls) => { for (const u of urls) { const f = path.join(UP, path.basename(u)); if (!db.properties.some((p) => p.images.includes(u))) fs.rm(f, () => {}) } }

/* ---------- API ---------- */
async function api(req, res, url) {
  const m = req.method, p = url.pathname.replace(/^\/api/, '').replace(/\/$/, '') || '/'
  const pub = () => { const { phone, whatsapp, email, address, hours, instagram, facebook } = db.settings; return { phone, whatsapp, email, address, hours, instagram, facebook } }

  if (m === 'GET' && p === '/site') return json(res, 200, pub())
  if (m === 'GET' && p === '/properties') return json(res, 200, db.properties.filter((x) => x.published).sort((a, b) => b.featured - a.featured || b.createdAt - a.createdAt))
  if (m === 'POST' && p === '/enquiries') {
    if (!limit('enq' + ip(req), 5, 600e3)) throw fail(429, 'Too many messages. Please try again in a few minutes.')
    const b = await readJson(req)
    if (b.website) return json(res, 200, { ok: true }) // honeypot
    const e = { id: rid(6), name: str(b.name, 80), phone: str(b.phone, 30), email: str(b.email, 100), message: str(b.message, 1500), date: str(b.date, 10), read: false, createdAt: Date.now() }
    if (!e.name) throw fail(400, 'Please enter your name')
    if (e.phone.replace(/\D/g, '').length < 7) throw fail(400, 'Please enter a valid phone number')
    if (e.email && !/^\S+@\S+\.\S+$/.test(e.email)) throw fail(400, 'That email address looks wrong')
    const pr = db.properties.find((x) => x.id === b.propertyId)
    if (pr) { e.propertyId = pr.id; e.propertyTitle = pr.title }
    db.enquiries.unshift(e); db.enquiries = db.enquiries.slice(0, 2000); save()
    return json(res, 201, { ok: true })
  }

  if (m === 'POST' && p === '/admin/login') {
    if (!limit('login' + ip(req), 8, 900e3)) throw fail(429, 'Too many attempts. Try again in 15 minutes.')
    const { password = '' } = await readJson(req)
    const a = Buffer.from(hash(String(password), db.admin.salt), 'hex'), b = Buffer.from(db.admin.hash, 'hex')
    if (!crypto.timingSafeEqual(a, b)) throw fail(401, 'Wrong password')
    const exp = String(Date.now() + 7 * 864e5)
    return json(res, 200, { ok: true }, { 'Set-Cookie': `oklad_sid=${exp}.${sign(exp)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800${isHttps(req) ? '; Secure' : ''}` })
  }
  if (m === 'POST' && p === '/admin/logout') return json(res, 200, { ok: true }, { 'Set-Cookie': 'oklad_sid=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' })
  if (p.startsWith('/admin')) {
    if (!authed(req)) throw fail(401, 'Please sign in')
    if (m !== 'GET' && req.headers['sec-fetch-site'] === 'cross-site') throw fail(403, 'Blocked')
    if (m === 'GET' && p === '/admin/me') return json(res, 200, { ok: true })
    if (m === 'GET' && p === '/admin/properties') return json(res, 200, [...db.properties].sort((a, b) => b.createdAt - a.createdAt))
    if (m === 'POST' && p === '/admin/properties') {
      const o = clean(await readJson(req)); let id = slug(o.title); while (db.properties.some((x) => x.id === id)) id = slug(o.title) + '-' + rid(2)
      const rec = { ...o, id, createdAt: Date.now(), updatedAt: Date.now() }; db.properties.push(rec); save(); return json(res, 201, rec)
    }
    let mt = p.match(/^\/admin\/properties\/([\w-]+)$/)
    if (mt) {
      const i = db.properties.findIndex((x) => x.id === mt[1]); if (i < 0) throw fail(404, 'Listing not found')
      if (m === 'PUT') { const old = db.properties[i], o = clean(await readJson(req)); db.properties[i] = { ...old, ...o, updatedAt: Date.now() }; dropFiles(old.images.filter((u) => !o.images.includes(u))); save(); return json(res, 200, db.properties[i]) }
      if (m === 'DELETE') { const [old] = db.properties.splice(i, 1); dropFiles(old.images); save(); return json(res, 200, { ok: true }) }
    }
    if (m === 'POST' && p === '/admin/upload') {
      const buf = await readBody(req, 12e6), ext = sniff(buf)
      if (!ext) throw fail(400, 'Please upload a JPG, PNG or WebP image')
      const n = rid(10) + '.' + ext; fs.writeFileSync(path.join(UP, n), buf); return json(res, 201, { url: '/uploads/' + n })
    }
    if (m === 'GET' && p === '/admin/enquiries') return json(res, 200, db.enquiries)
    mt = p.match(/^\/admin\/enquiries\/(\w+)$/)
    if (mt) {
      const i = db.enquiries.findIndex((x) => x.id === mt[1]); if (i < 0) throw fail(404, 'Not found')
      if (m === 'PATCH') { db.enquiries[i].read = !!(await readJson(req)).read; save(); return json(res, 200, db.enquiries[i]) }
      if (m === 'DELETE') { db.enquiries.splice(i, 1); save(); return json(res, 200, { ok: true }) }
    }
    if (m === 'GET' && p === '/admin/settings') return json(res, 200, pub())
    if (m === 'PUT' && p === '/admin/settings') {
      const b = await readJson(req); const s = db.settings
      for (const k of ['phone', 'whatsapp', 'email', 'address', 'hours', 'instagram', 'facebook']) if (k in b) s[k] = str(b[k], 160)
      save(); return json(res, 200, pub())
    }
    if (m === 'POST' && p === '/admin/password') {
      const { current = '', next = '' } = await readJson(req)
      if (!crypto.timingSafeEqual(Buffer.from(hash(String(current), db.admin.salt), 'hex'), Buffer.from(db.admin.hash, 'hex'))) throw fail(400, 'Current password is wrong')
      if (String(next).length < 8) throw fail(400, 'New password must be at least 8 characters')
      const salt = rid(16); db.admin = { salt, hash: hash(String(next), salt) }; db.secret = rid(32); save()
      const exp = String(Date.now() + 7 * 864e5)
      return json(res, 200, { ok: true }, { 'Set-Cookie': `oklad_sid=${exp}.${sign(exp)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800${isHttps(req) ? '; Secure' : ''}` })
    }
  }
  throw fail(404, 'Not found')
}

/* ---------- static files (with Range support for video) ---------- */
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.mp4': 'video/mp4', '.ico': 'image/x-icon', '.txt': 'text/plain' }
function serve(req, res, file, cache) {
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return json(res, 404, { error: 'Not found' })
    const h = { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Accept-Ranges': 'bytes', 'Cache-Control': cache }
    const r = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '')
    if (r && (r[1] || r[2])) {
      let a = r[1] ? +r[1] : Math.max(0, st.size - +r[2]), z = r[1] && r[2] ? Math.min(+r[2], st.size - 1) : st.size - 1
      if (a > z || a >= st.size) { res.writeHead(416, { 'Content-Range': `bytes */${st.size}` }); return res.end() }
      res.writeHead(206, { ...h, 'Content-Range': `bytes ${a}-${z}/${st.size}`, 'Content-Length': z - a + 1 })
      return req.method === 'HEAD' ? res.end() : fs.createReadStream(file, { start: a, end: z }).pipe(res)
    }
    res.writeHead(200, { ...h, 'Content-Length': st.size })
    req.method === 'HEAD' ? res.end() : fs.createReadStream(file).pipe(res)
  })
}
const inside = (base, rel) => { const f = path.join(base, rel); return f.startsWith(base + path.sep) ? f : null }

http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('X-Frame-Options', 'SAMEORIGIN'); res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  try {
    const url = new URL(req.url, 'http://x'); let rel
    try { rel = decodeURIComponent(url.pathname) } catch { return json(res, 400, { error: 'Bad request' }) }
    if (rel.startsWith('/api/')) return await api(req, res, url)
    if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { error: 'Method not allowed' })
    if (rel.startsWith('/uploads/')) { const f = inside(UP, rel.slice(9)); return f ? serve(req, res, f, 'public, max-age=31536000, immutable') : json(res, 404, { error: 'Not found' }) }
    if (!fs.existsSync(path.join(DIST, 'index.html'))) { res.writeHead(503, { 'Content-Type': 'text/plain' }); return res.end('Site not built yet. Run: npm run build') }
    const f = rel === '/' ? null : inside(DIST, rel.slice(1))
    if (f && fs.existsSync(f) && fs.statSync(f).isFile()) return serve(req, res, f, rel.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'public, max-age=3600')
    if (path.extname(rel)) return json(res, 404, { error: 'Not found' })
    serve(req, res, path.join(DIST, 'index.html'), 'no-cache') // SPA fallback
  } catch (e) {
    if (!e.code) console.error(e)
    if (!res.headersSent) json(res, e.code || 500, { error: e.code ? e.message : 'Something went wrong on our side' })
  }
}).listen(PORT, () => console.log(`Oklad Property running at http://localhost:${PORT}`))
