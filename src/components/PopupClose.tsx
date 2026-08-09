/**
 * Our own close button for InfoWindows opened with `headerDisabled`.
 *
 * Google's built-in header reserves a fixed-height row above the content for
 * its close button, which pushes popup text toward the middle of the bubble.
 * Suppressing the header at the API level (rather than trying to flatten its
 * internal markup with CSS) removes that gap for good -- but it takes the
 * close button with it, so we draw our own in the space our popups already
 * reserve on the right.
 */
export function PopupClose({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="popup-close" onClick={onClick} aria-label="닫기" title="닫기">
      ×
    </button>
  )
}
