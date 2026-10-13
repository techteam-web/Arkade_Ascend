// Loads pictures a page is likely to show next, once the browser is idle and
// at low priority, so choosing one shows it at once. Each is asked for as the
// page will ask for it (the same srcset and sizes), so the browser picks the
// same file. Not on data saver.
export function prefetchImages(images, sizes) {
  if (typeof window === 'undefined' || navigator.connection?.saveData) return () => {}
  let cancelled = false
  const start = () => {
    if (cancelled) return
    for (const image of images) {
      if (!image?.src) continue
      const img = new Image()
      img.fetchPriority = 'low'
      img.decoding = 'async'
      if (image.srcSet) { img.sizes = sizes ?? '100vw'; img.srcset = image.srcSet }
      img.src = image.src
    }
  }
  const idle = window.requestIdleCallback ?? (fn => setTimeout(fn, 600))
  const handle = idle(start, { timeout: 2500 })
  return () => { cancelled = true; (window.cancelIdleCallback ?? clearTimeout)(handle) }
}
