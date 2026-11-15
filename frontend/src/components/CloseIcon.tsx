/** The "×" drawn in close and remove buttons; takes the button's text colour. */
export function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M3 3 L13 13 M13 3 L3 13"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
