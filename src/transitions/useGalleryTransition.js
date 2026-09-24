import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

export default function useGalleryTransition({ root, motion, intro, setPage, setEntered, setBusy }) {
  const timeline = useRef(null)
  const context = useRef(null)
  const locked = useRef(false)
  const goHome = useRef(false)
  useEffect(() => () => { context.current?.revert() }, [])

  const openGallery = () => {
    if (locked.current) return
    locked.current = true
    motion.current.navigating = true
    setBusy(true)
    intro.current?.progress(1).pause()
    context.current?.revert()
    const element = root.current
    const select = selector => element.querySelector(selector)
    context.current = gsap.context(() => {
      const rows = [...element.querySelectorAll('.menu-item')]
      const departing = rows.filter(row => row.dataset.route !== 'gallery')
      const galleryRow = select('[data-route="gallery"]')
      gsap.set('.gallery-page--shared', { autoAlpha: 1 })
      gsap.set('.gallery-header, .gallery-heading > *, .gallery-corner, .gallery-arrow, .gallery-filters button, .gallery-footer, .gallery-card figcaption, .gallery-expand', { autoAlpha: 0 })
      gsap.set('.gallery-track', { '--arrival-scale': .94, '--arrival-blur': '12px', '--arrival-alpha': 0, '--side-offset': '80px', '--side-alpha': 0, '--frame-alpha': 0 })
      gsap.set('.gallery-filters', { '--tab-line': 0 })
      const tl = gsap.timeline({ paused: true,
        onComplete: () => {
          locked.current = false
          motion.current.navigating = false
          setPage('gallery'); setBusy(false)
          select('.gallery-heading h1')?.focus({ preventScroll: true })
        },
        onReverseComplete: () => {
          context.current?.revert()
          context.current = null; timeline.current = null
          motion.current.gallery = 0; motion.current.energy = 0
          motion.current.navigating = false
          element.dispatchEvent(new Event('intro:refresh'))
          locked.current = false; setBusy(false); setPage('home')
          setEntered(!goHome.current)
          if (!goHome.current) select('.menu-close')?.focus({ preventScroll: true })
        },
      })
      timeline.current = tl
      tl.to(galleryRow, { scale: 1.01, '--selected-line': 1, duration: .11, ease: 'power2.out' }, 0)
        .to(galleryRow, { scale: 1, duration: .11 }, .11)
        .to(galleryRow.querySelector('.menu-label'), { color: '#f0cfa0', duration: .2 }, 0)
        .to(departing, { x: -24, y: -5, autoAlpha: 0, filter: 'blur(4px)', stagger: .045, duration: .3, ease: 'power3.out' }, .18)
        .to(galleryRow, { x: -24, autoAlpha: 0, filter: 'blur(4px)', duration: .3 }, .4)
        .to('.menu-panel', { '--panel-reveal': '0%', duration: .8, ease: 'expo.inOut' }, .3)
        .to('.menu-art', { left: '0%', duration: .8, ease: 'expo.inOut' }, .3)
        .to(motion.current, { gallery: 1, duration: .85, ease: 'power2.inOut' }, .35)
        .to(motion.current, { energy: 1, duration: .25 }, .35)
        .to(motion.current, { energy: 0, duration: .55 }, .8)
        .to('.corner-copy--top', { y: '-=14', autoAlpha: 0, letterSpacing: '.38em', duration: .6 }, .5)
        .to('.menu-panel .menu-logo, .menu-signoff, .menu-footer', { y: -8, autoAlpha: 0, duration: .35 }, .5)
        .to('.menu-art', { autoAlpha: 0, duration: .45 }, .8)
        .fromTo('.gallery-header', { y: -12 }, { y: 0, autoAlpha: 1, duration: .5 }, .65)
        .to('.gallery-heading > p:first-child', { autoAlpha: 1, duration: .3 }, .72)
        .fromTo('.gallery-heading h1', { y: 20, filter: 'blur(10px)' }, { y: 0, filter: 'blur(0px)', autoAlpha: 1, duration: .5, ease: 'power3.out' }, .75)
        .fromTo('.gallery-heading > p:last-child', { letterSpacing: '.55em' }, { letterSpacing: '.42em', autoAlpha: 1, duration: .4 }, .85)
        .to('.gallery-track', { '--arrival-scale': 1, '--arrival-blur': '0px', '--arrival-alpha': 1, duration: .7, ease: 'power3.out' }, .7)
        .to('.gallery-track', { '--side-offset': '0px', '--side-alpha': 1, duration: .55, ease: 'power3.out' }, .9)
        .to('.gallery-track', { '--frame-alpha': 1, duration: .25 }, 1.15)
        .to('.gallery-arrow', { autoAlpha: 1, duration: .35 }, 1.05)
        .to('.gallery-card--center figcaption, .gallery-expand', { autoAlpha: 1, duration: .3 }, 1.15)
        .fromTo('.gallery-filters button', { y: 12 }, { y: 0, autoAlpha: 1, stagger: .04, duration: .3 }, 1.15)
        .to('.gallery-filters', { '--tab-line': 1, duration: .3 }, 1.4)
        .to('.menu-close', { y: -8, autoAlpha: 0, duration: .25 }, 1.05)
        .fromTo('.gallery-explore', { x: 15, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: .3 }, 1.3)
        .fromTo('.gallery-footer, .gallery-corner', { y: 5 }, { y: 0, autoAlpha: 1, duration: .35 }, 1.35)
        .set('.gallery-card figcaption', { clearProps: 'opacity,visibility' }, 1.7)
        .set('.menu-page--cinematic', { autoAlpha: 0 }, 1.7)
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) tl.progress(1)
      else tl.play()
    }, element)
  }
  const returnMenu = (home = false) => {
    if (locked.current || !timeline.current) return
    locked.current = true; goHome.current = home; setBusy(true); motion.current.navigating = true
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) timeline.current.reverse().totalTime(0)
    else timeline.current.reverse()
  }
  return { openGallery, returnMenu }
}
