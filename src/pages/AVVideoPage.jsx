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
const VIDEO_ID = 'VNm9qBBziIo'
const SRC = `https://www.youtube.com/embed/${VIDEO_ID}?autoplay=1&mute=0&rel=0&modestbranding=1&playsinline=1&vq=hd2160`

export default function AVVideoPage() {
  return <section className="absolute inset-0 overflow-hidden bg-black" aria-label="AV video">
    <h1 tabIndex={-1} className="visually-hidden">AV Video</h1>
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="relative aspect-video w-[min(100%,177.78dvh)] bg-black">
        <iframe className="absolute inset-0 size-full" src={SRC} title="Arkade Ascend AV film"
          frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
      </div>
    </div>
  </section>
}
