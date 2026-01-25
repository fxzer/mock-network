// Declare a global variable to hold the reference to the PiP window
// preventing it from being garbage collected or closed prematurely in some contexts.
declare global {
  interface Window {
    __pipWindowRef?: Window
  }
}

export async function popupWindow({ url }: { url: string }) {
  if (!('documentPictureInPicture' in window)) {
    console.error(
      'Your browser does not currently support documentPictureInPicture. You can go to chrome://flags/#document-picture-in-picture-api to enable it.',
    )
    return
  }
  const pipWindow = await documentPictureInPicture.requestWindow({
    width: 580,
    height: 680,
  })

  // Store reference globally
  window.__pipWindowRef = pipWindow

  // Add an event listener to clear the reference when the window is closed
  pipWindow.addEventListener('pagehide', () => {
    window.__pipWindowRef = undefined
  })

  const iframe = document.createElement('iframe')
  iframe.src = url
  iframe.className = 'ajax-interceptor-iframe'
  iframe.style.setProperty('width', '100%')
  iframe.style.setProperty('height', '100vh')
  iframe.style.setProperty('border', 'none')
  pipWindow.document.body.style.setProperty('margin', '0')
  pipWindow.document.body.append(iframe)
  return pipWindow
}
