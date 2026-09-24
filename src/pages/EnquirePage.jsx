import { useLayoutEffect, useRef, useState } from 'react'
import { gsap } from '../app/reveal.js'
import { useShell } from '../app/ShellContext.js'
import { ArrowIcon, BrandLockup } from '../components/Brand.jsx'
import { PageHeading, TemplateNote } from '../components/PageKit.jsx'
import { submitEnquiry } from '../content/enquiry.js'
import { units } from '../content/project.js'
import { prefersReducedMotion } from '../hooks/useMediaQuery.js'

const interests = [...new Set(units.map(unit => unit.configuration)), 'Not sure yet']
const visits = ['Weekday', 'Weekend', 'Call me first']
const empty = { name: '', phone: '', email: '', interest: interests[0], visit: visits[1], message: '', consent: false }

export default function EnquirePage() {
  const { go } = useShell()
  const [form, setForm] = useState(empty)
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState({ state: 'idle' })
  const done = useRef(null)
  const set = (key, value) => { setForm(current => ({ ...current, [key]: value })); setErrors(current => ({ ...current, [key]: undefined })) }

  const validate = () => {
    const next = {}
    if (form.name.trim().length < 2) next.name = 'Please enter your name.'
    if (!/^[+\d][\d\s-]{7,15}$/.test(form.phone.trim())) next.phone = 'Please enter a valid mobile number.'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Please check the email address.'
    if (!form.consent) next.consent = 'Please confirm we may contact you.'
    setErrors(next)
    return next
  }
  const submit = async event => {
    event.preventDefault()
    const problems = validate()
    const first = Object.keys(problems)[0]
    if (first) { document.getElementById(`enquire-${first}`)?.focus(); return }
    setStatus({ state: 'sending' })
    try {
      const result = await submitEnquiry(form)
      setStatus({ state: 'done', delivered: result.delivered })
    } catch (error) {
      setStatus({ state: 'error', message: error.message })
    }
  }

  useLayoutEffect(() => {
    if (status.state !== 'done') return
    done.current?.querySelector('h2')?.focus({ preventScroll: true })
    if (prefersReducedMotion()) return
    const context = gsap.context(() => {
      gsap.timeline({ defaults: { ease: 'silk' } })
        .from('[data-check-ring]', { strokeDashoffset: 190, duration: 1.2, ease: 'expo.out' })
        .from('[data-check-mark]', { strokeDashoffset: 40, duration: 0.7 }, 0.5)
        .from('[data-done]', { autoAlpha: 0, y: 18, filter: 'blur(6px)', stagger: 0.08, duration: 1 }, 0.3)
    }, done)
    return () => context.revert()
  }, [status.state])

  return <section className="page page-scroll grid content-start gap-10 split:grid-cols-[minmax(0,34rem)_minmax(0,1fr)] split:[align-content:safe_center] split:gap-x-[6vw] 3xl:grid-cols-[minmax(0,40rem)_minmax(0,1fr)]">
    <div>
      <PageHeading id="enquire" title="Enquire" subtitle="Make Ascend your address" />
      {status.state === 'done'
        ? <div ref={done} className="mt-10 max-w-md" role="status">
            <svg viewBox="0 0 64 64" className="size-16 fill-none stroke-gold-300" strokeWidth="1.2" aria-hidden="true">
              <circle data-check-ring cx="32" cy="32" r="30" strokeDasharray="190" />
              <path data-check-mark d="m21 33 8 8 15-17" strokeDasharray="40" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <h2 data-done tabIndex={-1} className="display mt-6 text-4xl text-fg outline-none">Thank you, {form.name.split(' ')[0]}</h2>
            <p data-done className="body-copy mt-4">
              {status.delivered
                ? 'Your enquiry has been received. A relationship manager from Arkade Developers will be in touch.'
                : 'Your enquiry has been saved on this device for the sales team.'}
            </p>
            <div data-done className="mt-8 flex flex-wrap gap-3">
              <button type="button" className="btn-lux" onClick={() => { setForm(empty); setStatus({ state: 'idle' }) }}>New enquiry</button>
              <button type="button" className="btn-lux" onClick={() => go('/')}>Home<ArrowIcon /></button>
            </div>
          </div>
        : <form noValidate onSubmit={submit} className="mt-[clamp(1.25rem,4vh,2.5rem)] grid gap-x-6 gap-y-[clamp(0.9rem,2.6vh,1.6rem)] sm:grid-cols-2" aria-describedby="enquire-note">
            <Field id="name" label="Full name" value={form.name} onChange={value => set('name', value)} error={errors.name} autoComplete="name" required />
            <Field id="phone" label="Mobile number" type="tel" value={form.phone} onChange={value => set('phone', value)} error={errors.phone} autoComplete="tel" inputMode="tel" required />
            <Field id="email" label="Email (optional)" type="email" value={form.email} onChange={value => set('email', value)} error={errors.email} autoComplete="email" className="sm:col-span-2" />
            <Choice label="Interested in" options={interests} value={form.interest} onChange={value => set('interest', value)} />
            <Choice label="Preferred visit" options={visits} value={form.visit} onChange={value => set('visit', value)} />
            <Field id="message" label="Message (optional)" value={form.message} onChange={value => set('message', value)} multiline className="sm:col-span-2" />
            <div data-reveal className="sm:col-span-2">
              <label className="flex min-h-11 cursor-pointer items-start gap-3 text-[0.74rem] leading-relaxed text-muted">
                <input id="enquire-consent" type="checkbox" checked={form.consent} onChange={event => set('consent', event.target.checked)}
                  aria-invalid={!!errors.consent} aria-describedby={errors.consent ? 'enquire-consent-error' : undefined}
                  className="mt-1 size-4 shrink-0 accent-gold-500" />
                I agree to be contacted by Arkade Developers about Arkade Ascend.
              </label>
              {errors.consent && <p id="enquire-consent-error" className="mt-1 text-[0.7rem] text-gold-200">{errors.consent}</p>}
            </div>
            <div data-reveal className="flex flex-wrap items-center gap-4 sm:col-span-2">
              <button type="submit" className="btn-lux" disabled={status.state === 'sending'}>{status.state === 'sending' ? 'Sending…' : 'Send enquiry'}<ArrowIcon /></button>
              {status.state === 'error' && <p role="alert" className="text-[0.74rem] text-gold-200">{status.message}</p>}
            </div>
          </form>}
    </div>

    <aside className="flex flex-col items-start justify-center-safe gap-6 split:items-end split:text-right stack:hidden">
      <div data-reveal="scale"><BrandLockup size="lg" /></div>
      <span data-reveal="line" className="hairline block w-48" />
      <p data-reveal className="max-w-xs font-serif text-2xl italic leading-snug text-ivory/85">Malad&rsquo;s Neu Gen life has arrived.</p>
      <p data-reveal className="text-[0.62rem] uppercase leading-[2.2] tracking-[0.34em] text-gold-300/80">Arkade Developers<br />Malad West · Mumbai</p>
      <TemplateNote>Sales gallery address and MahaRERA number to be added</TemplateNote>
      <p id="enquire-note" className="visually-hidden">Fields marked as optional can be left blank.</p>
    </aside>
  </section>
}

function Field({ id, label, value, onChange, error, multiline, className = '', ...input }) {
  const Tag = multiline ? 'textarea' : 'input'
  return <div data-reveal className={`relative ${className}`}>
    <Tag id={`enquire-${id}`} value={value} onChange={event => onChange(event.target.value)} placeholder=" " rows={multiline ? 2 : undefined}
      aria-invalid={!!error} aria-describedby={error ? `enquire-${id}-error` : undefined} {...input}
      className="peer block min-h-12 w-full resize-none border-0 border-b border-line bg-transparent px-0 pb-2 pt-5 text-[0.95rem] text-fg outline-none transition-colors placeholder:text-transparent focus:border-transparent aria-invalid:border-gold-200/70" />
    <label htmlFor={`enquire-${id}`}
      className="pointer-events-none absolute left-0 top-5 origin-left text-[0.72rem] uppercase tracking-[0.2em] text-muted transition-all duration-500 ease-silk peer-focus:-translate-y-4 peer-focus:scale-[0.82] peer-focus:text-gold-300 peer-not-placeholder-shown:-translate-y-4 peer-not-placeholder-shown:scale-[0.82]">
      {label}
    </label>
    <span className="absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-gold-300 transition-transform duration-700 ease-silk peer-focus:scale-x-100" />
    {error && <p id={`enquire-${id}-error`} className="mt-1.5 text-[0.7rem] text-gold-200">{error}</p>}
  </div>
}

function Choice({ label, options, value, onChange }) {
  return <fieldset data-reveal>
    <legend className="mb-2 text-[0.62rem] uppercase tracking-[0.3em] text-muted">{label}</legend>
    <div className="flex flex-wrap gap-2">
      {options.map(option => <button key={option} type="button" className="chip" aria-pressed={value === option} onClick={() => onChange(option)}>{option}</button>)}
    </div>
  </fieldset>
}
