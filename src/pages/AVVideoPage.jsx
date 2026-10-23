import { useEffect, useRef } from 'react'
import { useShell } from '../app/ShellContext.js'

// The project's AV film, as on Rivali Park 2: YouTube's own player and
// controls, nothing of ours over it, playing as soon as the page opens. The
// visitor has already pressed to enter the presentation and to get here, so
// browsers let it start with sound (mute=0). The film is as large as the
// screen allows at 16:9, centred on black, so YouTube's controls always stay
// on screen; a screen of another shape shows black bars.
//
// `vq=hd2160` asks YouTube to start at its highest quality. YouTube still
// adapts to the connection and can only serve what the upload has, so this is
// a request, not a guarantee.
//
// The page stays mounted behind the menu (and behind the start gate when full
// screen is left), so the film is paused then, and when the tab is hidden,
// through the player's postMessage API (`enablejsapi=1`). It stays paused when
// the visitor comes back; YouTube's play button resumes it.
const VIDEO_ID = 'VNm9qBBziIo'
const SRC = `https://www.youtube.com/embed/${VIDEO_ID}?autoplay=1&mute=0&rel=0&modestbranding=1&playsinline=1&vq=hd2160&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`

const command = (frame, func) => frame?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args: [] }), 'https://www.youtube.com')

export default function AVVideoPage() {
  const { menuOpen, gated } = useShell()
  const frame = useRef(null)
  useEffect(() => { if (menuOpen || gated) command(frame.current, 'pauseVideo') }, [menuOpen, gated])
  useEffect(() => {
    const onHide = () => { if (document.hidden) command(frame.current, 'pauseVideo') }
    document.addEventListener('visibilitychange', onHide)
    return () => document.removeEventListener('visibilitychange', onHide)
  }, [])
  return <section className="absolute inset-0 overflow-hidden bg-black" aria-label="AV video">
    <h1 tabIndex={-1} className="visually-hidden">AV Video</h1>
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="relative aspect-video w-[min(100%,177.78dvh)] bg-black">
        <iframe ref={frame} className="absolute inset-0 size-full" src={SRC} title="Arkade Ascend AV film"
          frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
      </div>
    </div>
  </section>
}
