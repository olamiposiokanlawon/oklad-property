export default function Ph({ src, alt = '' }) {
  return <div className="ph" style={{ background: 'linear-gradient(150deg,#8a7a63,#3f3a30)' }}>{src && <img src={src} alt={alt} loading="lazy" />}</div>
}
