/** Remove overlays/iframes do Google Identity Services que ficam presos no mobile */
export function clearGoogleOverlays() {
  if (typeof document === 'undefined') return

  const selectors = [
    '#credential_picker_container',
    '#g_a11y_announcement',
    'div[id^="gsi_"]',
    'iframe[src*="accounts.google.com"]',
    'iframe[src*="gsi/"]',
  ]

  for (const selector of selectors) {
    document.querySelectorAll(selector).forEach((el) => {
      try {
        el.remove()
      } catch {
        // ignore
      }
    })
  }

  document.body.style.overflow = ''
  document.documentElement.style.overflow = ''
  document.body.style.pointerEvents = ''
  document.documentElement.style.pointerEvents = ''
}
