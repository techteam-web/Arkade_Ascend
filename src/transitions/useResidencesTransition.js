import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

// One reversible sequence owns the transition; the shared canvas never remounts.
export default function useResidencesTransition({ root, motion, intro, setPage, setEntered, setBusy }) {
  const context = useRef(null)
  const timeline = useRef(null)
  const locked = useRef(false)
  const home = useRef(false)
  const focusFrame = useRef(null)
  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)')
    const finish = () => {
      if (preference.matches && timeline.current?.isActive()) {
        const tl = timeline.current
        tl.totalTime(tl.reversed() ? 0 : tl.duration()).pause()
      }
    }
    preference.addEventListener('change', finish)
    return () => {
      preference.removeEventListener('change', finish)
      cancelAnimationFrame(focusFrame.current)
      context.current?.revert()
    }
  }, [])

  const focusAfterRender = selector => {
    cancelAnimationFrame(focusFrame.current)
    focusFrame.current = requestAnimationFrame(() => root.current?.querySelector(selector)?.focus({ preventScroll: true }))
  }

  const openResidences = () => {
    if (locked.current) return
    locked.current = true
    home.current = false
    motion.current.navigating = true
    setBusy(true)
    intro.current?.progress(1).pause()
    context.current?.revert()
    root.current.classList.remove('is-residence-return')
    motion.current.residenceReturning = false
    Object.assign(motion.current, { residenceSweep: 0, residenceWrap: 0, residenceWrapPhase: 0, residenceDepth: 0 })
    const element = root.current
    const select = selector => element.querySelector(selector)
    context.current = gsap.context(() => {
      const selected = select('[data-route="residences"]')
      const departing = [...element.querySelectorAll('.menu-item')].filter(row => row !== selected)
      const copy = select('.corner-copy--top')
      const destination = select('.residence-manifesto')
      const from = copy.getBoundingClientRect()
      const to = destination.getBoundingClientRect()
      const targetStyle = getComputedStyle(destination)
      const canMoveCopy = to.width > 0 && from.width > 0 && Number(gsap.getProperty(copy, 'opacity')) > 0
      const copyX = Number(gsap.getProperty(copy, 'x')) || 0
      const copyY = Number(gsap.getProperty(copy, 'y')) || 0

      gsap.set('.residences-page', { autoAlpha: 1 })
      gsap.set('.residence-logo, .residence-explore, .residence-heading > *, .residence-lead, .residence-action, .tower-callout, .residence-manifesto, .residence-footer, .residence-tower', { autoAlpha: 0 })
      gsap.set('.residence-background, .unit-finder', { opacity: 0 })
      gsap.set('.tower-callout-line', { scaleY: 0, transformOrigin: 'top center' })
      const tl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' },
        onComplete: () => {
          locked.current = false
          motion.current.navigating = false
          setPage('residences'); setBusy(false)
          focusAfterRender(select('.residences-page').dataset.stage === 'unit-finder' ? '.finder-heading h1' : '.residence-heading h1')
        },
        onReverseComplete: () => {
          context.current?.revert(); context.current = null; timeline.current = null
          Object.assign(motion.current, { residences: 0, residenceSweep: 0, residenceWrap: 0, residenceWrapPhase: 0, residenceDepth: 0, residenceReturning: false, energy: 0, residenceLight: 0, navigating: false })
          // Explicitly restore shared layers after reversing temporary depth
          // promotion; never leave the menu dependent on cached set() values.
          gsap.set('.ribbon-scene', { clearProps: 'zIndex' })
          gsap.set('.residence-tower img', { clearProps: 'visibility' })
          gsap.set('.menu-panel', { '--panel-reveal': '100%', '--panel-opacity': 1, '--panel-softness': '0px' })
          element.classList.remove('is-residence-return')
          element.dispatchEvent(new Event('intro:refresh'))
          locked.current = false
          setPage('home'); setBusy(false); setEntered(!home.current)
          if (!home.current) focusAfterRender('[data-route="residences"]')
        },
      })
      timeline.current = tl
      tl.addLabel('acknowledge', 0)
        .to(selected, { scale: 1.01, '--arrival-accent': 1, duration: .11 }, 0)
        .to(selected, { scale: 1, duration: .11 }, .11)
        .to(selected.querySelector('.menu-label'), { color: '#f5dbb7', duration: .2 }, 0)
        .to(selected.querySelector('.menu-divider'), { backgroundColor: '#ead0a7aa', duration: .2 }, 0)
        .addLabel('release', .18)
        .to(departing, { x: -22, autoAlpha: 0, filter: 'blur(4px)', stagger: .035, duration: .28 }, .18)
        .to(selected, { x: -22, autoAlpha: 0, filter: 'blur(4px)', duration: .25 }, .45)
        .to('.menu-panel .menu-logo', { autoAlpha: 0, y: -6, duration: .25 }, .55)
        .to('.menu-signoff', { autoAlpha: 0, y: 4, duration: .4 }, .6)
        .to('.menu-footer', { autoAlpha: 0, duration: .35 }, .7)
        .addLabel('recompose', .3)
        .to('.menu-panel', { '--panel-softness': '65px', '--panel-opacity': 0, '--panel-reveal': '78%', duration: .75, ease: 'expo.inOut' }, .3)
        .to('.menu-art', { left: '0%', duration: .75, ease: 'expo.inOut' }, .3)
        .to('.menu-art', { autoAlpha: 0, duration: .65, ease: 'power2.inOut' }, .65)
        .to('.residence-background', { opacity: 1, duration: .8, ease: 'power2.inOut' }, .45)
        .to(motion.current, { residences: 1, duration: 1.12, ease: 'expo.inOut' }, .3)
        .to(motion.current, { residenceSweep: 1, energy: .6, duration: .4, ease: 'power2.inOut' }, .3)
        .to(motion.current, { residenceSweep: 0, energy: 0, duration: .72, ease: 'power2.inOut' }, .7)
        .addLabel('ribbon-settled', 1.52)
        .addLabel('editorial', 1.54)
        .to('.unit-finder', { opacity: 1, duration: .4 }, 1.54)
        .fromTo('.residence-logo', { y: -10 }, { y: 0, autoAlpha: 1, duration: .24 }, 1.54)
        .to('.residence-index', { autoAlpha: 1, duration: .2 }, 1.59)
        .fromTo('.residence-heading h1', { y: 24, filter: 'blur(10px)' }, { y: 0, filter: 'blur(0px)', autoAlpha: 1, duration: .32 }, 1.63)
        .fromTo('.residence-subtitle', { y: 8, letterSpacing: '.48em' }, { y: 0, letterSpacing: getComputedStyle(select('.residence-subtitle')).letterSpacing, autoAlpha: 1, duration: .25 }, 1.69)
        .fromTo('.residence-lead', { y: 6, letterSpacing: '.46em' }, { y: 0, letterSpacing: getComputedStyle(select('.residence-lead')).letterSpacing, autoAlpha: 1, duration: .22 }, 1.75)
        .fromTo('.residence-action', { y: 14 }, { y: 0, autoAlpha: 1, stagger: .06, duration: .24 }, 1.79)
        .addLabel('architecture', .55)
        .fromTo('.residence-tower', { y: 30, scale: .96, filter: 'blur(10px)' }, { y: 0, scale: 1, autoAlpha: 1, filter: 'blur(0px)', stagger: .08, duration: .75 }, .55)
        .fromTo('.tower-callout', { y: 10 }, { y: 0, autoAlpha: 1, stagger: .06, duration: .22 }, 1.8)
        .to('.tower-callout-line', { scaleY: 1, stagger: .06, duration: .22, ease: 'power2.inOut' }, 1.82)
        .to('.menu-close', { autoAlpha: 0, y: -8, duration: .22 }, .93)
        .fromTo('.residence-explore', { x: 12 }, { x: 0, autoAlpha: 1, duration: .24 }, 1.78)
        .fromTo('.residence-footer', { y: 6 }, { y: 0, autoAlpha: 1, duration: .28 }, 1.78)

      // Use real silhouette depth only once the matching texture is ready.
      // The canvas stays mounted. Layer elevation is confined to the wrap;
      // the existing DOM controls resume after the texture/DOM handoff.
      if (motion.current.residenceDepthReady && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
        tl.set(motion.current, { residenceDepth: 1 }, .3)
          .set('.ribbon-scene', { zIndex: 10 }, .3)
          .set('.residence-tower img', { visibility: 'hidden' }, .3)
          .to(motion.current, { residenceWrap: 1, duration: .4, ease: 'power2.inOut' }, .36)
          .to(motion.current, { residenceWrapPhase: 1, duration: .92, ease: 'power2.inOut' }, .4)
          .to(motion.current, { residenceWrap: 0, duration: .42, ease: 'power3.inOut' }, 1.02)
          .set(motion.current, { residenceDepth: 0 }, 1.52)
          .set('.residence-tower img', { visibility: 'visible' }, 1.52)
          .set('.ribbon-scene', { zIndex: 1 }, 1.52)
      }

      if (canMoveCopy) {
        // Travel with the existing visible copy, then hand off at identical
        // coordinates. The destination remains responsive after the handoff.
        tl.to(copy, {
          x: copyX + to.left - from.left, y: copyY + to.top - from.top,
          width: to.width, height: to.height, fontSize: targetStyle.fontSize,
          fontFamily: targetStyle.fontFamily, letterSpacing: targetStyle.letterSpacing,
          lineHeight: targetStyle.lineHeight, gap: targetStyle.gap,
          paddingLeft: targetStyle.paddingLeft, color: targetStyle.color,
          autoAlpha: .8, duration: .7, ease: 'power2.inOut',
        }, .45)
          .set(copy, { autoAlpha: 0 }, 1.15)
          .set(destination, { autoAlpha: .8 }, 1.15)
          .to(destination, { autoAlpha: 1, duration: .35 }, 1.15)
      } else {
        tl.to(copy, { autoAlpha: 0, duration: .4 }, .45)
          .to(destination, { autoAlpha: 1, duration: .35 }, 1.15)
      }
      tl.set('.menu-page--cinematic', { autoAlpha: 0 }, 1.6)
        // Release hover opacity and responsive typography to the stylesheet.
        .set('.residence-tower', { clearProps: 'opacity,visibility,filter,transform' }, 2.1)
        .set('.residence-subtitle, .residence-lead', { clearProps: 'letterSpacing' }, 2.1)
        .addLabel('settled', 2.1)
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) tl.progress(1)
      // Preserve the choreography, but let the silk travel at an unhurried pace.
      // 2.1 timeline seconds / .6 = 3.5 seconds of actual entrance playback.
      else tl.timeScale(.6).play()
    }, element)
  }
  const returnResidenceMenu = (goHome = false) => {
    if (locked.current || !timeline.current) return
    locked.current = true; home.current = goHome; setBusy(true); motion.current.navigating = true
    // Explore restores the menu behind its own opaque panel. Replaying the
    // foreground wrapping pass backwards lets silk cover the returning rows.
    motion.current.residenceReturning = true
    root.current.classList.add('is-residence-return')
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) timeline.current.reverse().totalTime(0)
    else timeline.current.timeScale(.9).reverse()
  }
  return { openResidences, returnResidenceMenu }
}
