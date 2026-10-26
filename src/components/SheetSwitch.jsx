// Each plan comes two ways: the drawing alone (the sheet's cut-out), and the
// whole sheet it was cut from, with the key plans and the area table, for
// when a buyer asks where the home sits and what it measures. The switch
// names what each shows; `plain` is the drawing's name (unit or floor plan).
// `deck` adds the eco deck (the amenities image), offered on the typical floor.
export default function SheetSwitch({ value, onChange, plain = 'Unit plan', deck = false, className = '' }) {
  return <div role="group" aria-label="Plan view" className={`flex flex-wrap gap-2 ${className}`}>
    {[['plan', plain], ['sheet', 'Key plan & areas'], ...(deck ? [['deck', 'Eco deck']] : [])].map(([id, label]) =>
      <button key={id} type="button" className="chip" aria-pressed={value === id} onClick={() => onChange(id)}>{label}</button>)}
  </div>
}
