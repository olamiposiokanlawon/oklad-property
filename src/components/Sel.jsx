export default function Sel({ label, value, onChange, children }) {
  return (
    <div className="fld">
      <label>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>{children}</select>
    </div>
  )
}
