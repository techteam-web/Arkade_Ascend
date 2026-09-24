import { useLayoutEffect, useRef } from 'react'
import { gsap } from 'gsap'

// One reversible timeline owns both DOM choreography and the live R3F pose.
export default function useIntroTransition(root, motion, entered, page, enterRef) {
  const animation = useRef(null)
  const currentPage = useRef(page)
  currentPage.current = page
  const open = useRef(entered)
  open.current = entered

  useLayoutEffect(() => {
    const element = root.current
    const select = selector => element.querySelector(selector)
    const menu = select('.menu-page--cinematic')
    const copy = select('.corner-copy--top')
    const target = select('.menu-manifesto')
    const preference = matchMedia('(prefers-reduced-motion: reduce)')
    let timeline
    let context
    const build = () => {
      context?.revert()
      motion.current.progress = 0
      motion.current.energy = 0
      const from = copy.getBoundingClientRect()
      const to = target.getBoundingClientRect()
      const targetStyle = getComputedStyle(target)
      const compact = to.width === 0
      context = gsap.context(() => {
        gsap.set(copy, { left: from.left - element.getBoundingClientRect().left, right: 'auto', width: from.width, '--copy-rule': 0 })
        gsap.set(menu, { autoAlpha: 0 })
        gsap.set('.menu-panel .menu-logo, .menu-close, .menu-signoff, .menu-footer, .menu-item', { autoAlpha: 0 })
        gsap.set('.menu-divider', { scaleX: 0, transformOrigin: 'left center' })
        gsap.set('.menu-panel', { '--panel-reveal': '0%', '--active-progress': 0, '--hint-alpha': 0 })
        gsap.set('.menu-art', { autoAlpha: 0 })
        timeline = gsap.timeline({ paused: true,
          onComplete: () => { if (open.current) select('.menu-close')?.focus({ preventScroll: true }) },
          onReverseComplete: () => enterRef.current?.focus({ preventScroll: true }),
        })
        timeline.to('.enter-button', { scale: .92, borderColor: '#ffe7bf', duration: .09, ease: 'power2.out' }, 0)
          .to('.enter-button', { scale: 1.02, duration: .09, ease: 'power2.out' }, .09)
          .to('.enter-button svg', { x: 8, duration: .18 }, 0)
          .to('.identity .brand', { autoAlpha: 0, y: -12, duration: .35, ease: 'power3.out' }, .15)
          .to('.identity h1', { scale: 1.04, autoAlpha: 0, filter: 'blur(8px)', duration: .4, ease: 'power2.inOut' }, .15)
          .to('.identity .locality', { autoAlpha: 0, y: 10, duration: .35 }, .2)
          .to('.entry .tagline', { letterSpacing: '.72em', autoAlpha: 0, duration: .35 }, .2)
          .to('.enter-button', { scale: .75, autoAlpha: 0, duration: .32, ease: 'power3.in' }, .23)
          .to('.ascend-mark, .entry-line, .corner-copy--bottom', { autoAlpha: 0, y: -8, duration: .4 }, .2)
          .to(motion.current, { progress: 1, duration: .85, ease: 'power2.inOut' }, .25)
          .to(motion.current, { energy: 1, duration: .25, ease: 'power2.out' }, .25)
          .to(motion.current, { energy: 0, duration: .6, ease: 'power2.inOut' }, .7)
          .set(menu, { autoAlpha: 1 }, .55)
          .to('.menu-panel', { '--panel-reveal': '100%', duration: .7, ease: 'expo.inOut' }, .55)
          .to('.menu-art', { autoAlpha: 1, duration: .65 }, .55)
          .fromTo('.menu-panel .menu-logo', { x: -20, y: -10 }, { x: 0, y: 0, autoAlpha: 1, duration: .55, ease: 'power3.out' }, .7)
          .fromTo('.menu-item', { x: -30 }, { x: 0, autoAlpha: 1, duration: .3, stagger: .05, ease: 'power3.out' }, .85)
          .to('.menu-divider', { scaleX: 1, duration: .4, stagger: .045, ease: 'power2.inOut' }, .9)
          .fromTo('.menu-close', { x: 15 }, { x: 0, autoAlpha: 1, duration: .3 }, 1.2)
          .fromTo('.menu-signoff, .menu-footer', { y: 6 }, { y: 0, autoAlpha: 1, duration: .4 }, 1.2)
          .to('.menu-panel', { '--active-progress': 1, duration: .2 }, 1.4)
          .to('.menu-panel', { '--hint-alpha': 1, duration: .15 }, 1.55)
        if (compact) {
          timeline.to(copy, { autoAlpha: 0, duration: .4 }, .95)
        } else {
          timeline.to(copy, {
            x: to.left - from.left, y: to.top - from.top,
            width: to.width, height: to.height, boxSizing: 'border-box',
            fontSize: targetStyle.fontSize, fontFamily: targetStyle.fontFamily,
            letterSpacing: targetStyle.letterSpacing, lineHeight: targetStyle.lineHeight,
            gap: targetStyle.gap, paddingLeft: targetStyle.paddingLeft,
            textAlign: 'left', color: '#edc79b', duration: .55, ease: 'power2.inOut',
          }, .95)
          timeline.to(copy, { '--copy-rule': 1, duration: .4 }, 1.1)
        }
        animation.current = timeline
        if (open.current) timeline.progress(1)
      }, element)
    }
    build()
    let width = element.clientWidth
    let height = element.clientHeight
    const refreshIfResized = () => {
      if (width === element.clientWidth && height === element.clientHeight) return
      width = element.clientWidth
      height = element.clientHeight
      build()
    }
    const observer = new ResizeObserver(() => {
      if (currentPage.current !== 'home' || motion.current.gallery > 0 || motion.current.residences > 0 || motion.current.navigating) return
      refreshIfResized()
    })
    observer.observe(element)
    // Returning to the same panel must reuse the finished intro timeline.
    // Rebuilding it needlessly resets the shared ribbon pose and menu styles.
    element.addEventListener('intro:refresh', refreshIfResized)
    const changeMotion = () => { if (preference.matches) timeline.progress(open.current ? 1 : 0).pause() }
    preference.addEventListener('change', changeMotion)
    return () => { observer.disconnect(); element.removeEventListener('intro:refresh', refreshIfResized); preference.removeEventListener('change', changeMotion); context?.revert(); animation.current = null }
  }, [root, motion, enterRef])

  useLayoutEffect(() => {
    if (page !== 'home' || !animation.current) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) animation.current.progress(entered ? 1 : 0).pause()
    else if (entered) animation.current.play()
    else animation.current.reverse()
  }, [entered, page])
  return animation
}
