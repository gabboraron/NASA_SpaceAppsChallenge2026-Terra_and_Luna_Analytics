/** Line-drawn bee, the product mark. `inverse` draws it for dark backgrounds. */
export function BeeMark({
  size = 28,
  inverse = false,
}: {
  size?: number;
  inverse?: boolean;
}) {
  const line = inverse ? "#f7f0de" : "#1c1912";
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      stroke={line}
      strokeWidth="1.6"
      strokeLinecap="round"
    >
      <ellipse
        cx="11"
        cy="9"
        rx="5"
        ry="3.4"
        transform="rotate(-30 11 9)"
        fill={inverse ? "none" : "#fcf8ec"}
      />
      <ellipse
        cx="21"
        cy="9"
        rx="5"
        ry="3.4"
        transform="rotate(30 21 9)"
        fill={inverse ? "none" : "#fcf8ec"}
      />
      <ellipse
        cx="16"
        cy="19"
        rx="6"
        ry="8.5"
        fill="#e3a92b"
        stroke="#1c1912"
      />
      <path d="M10.4 16.5h11.2M10.2 21h11.6M12 25h8" stroke="#1c1912" />
    </svg>
  );
}
