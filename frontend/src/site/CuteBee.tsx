import { useId } from "react";

export type BeePose =
  | "happy"
  | "satellite"
  | "thirsty"
  | "stop"
  | "coin"
  | "book"
  | "magnifier"
  | "chart"
  | "map"
  | "heart"
  | "sleepy";

const INK = "#1c1912";
const HONEY = "#e3a92b";
const WING = "#fcf8ec";
const CHEEK = "#e9806e";

/** The extra prop each pose holds, drawn on the bee's right. */
function Prop({ pose }: { pose: BeePose }) {
  switch (pose) {
    case "happy":
      return null;
    case "sleepy":
      return <path d="M72 34h8l-8 9h8M85 18h6l-6 7h6" strokeWidth="2.5" />;
    case "book":
      return (
        <g strokeWidth="2.5">
          <path d="M68 58l13 4 13-4v17l-13 4-13-4z" fill={WING} />
          <path
            d="M81 62v17M72 63l6 2M72 68l6 2M84 65l6-2M84 70l6-2"
            strokeWidth="1.5"
          />
        </g>
      );
    case "magnifier":
      return (
        <g>
          <path d="M77 47 68 57" strokeWidth="4" />
          <circle cx="84" cy="40" r="10" fill="#d8ebf7" />
          <path d="M80 35a6 6 0 0 1 6-1" stroke={WING} strokeWidth="2" />
        </g>
      );
    case "chart":
      return (
        <g strokeWidth="2.5">
          <rect x="70" y="46" width="26" height="26" rx="4" fill={WING} />
          <path
            d="M76 66v-6M83 66V55M90 66V51"
            stroke={HONEY}
            strokeWidth="4"
          />
        </g>
      );
    case "map":
      return (
        <path
          d="M68 52l9-4 9 4 9-4v22l-9 4-9-4-9 4zM77 48v22M86 52v22"
          fill="#cfe0b0"
          strokeWidth="2.5"
        />
      );
    case "heart":
      return (
        <path
          d="M84 32c-3-5-11-4-11 3 0 6 11 12 11 12s11-6 11-12c0-7-8-8-11-3z"
          fill={CHEEK}
          strokeWidth="2.5"
        />
      );
    case "satellite":
      return (
        <g>
          <path
            d="M75 22 66 31M83 22 75 34"
            strokeWidth="2"
            strokeDasharray="2 3"
          />
          <rect x="65" y="10" width="8" height="7" fill="#7aa0c8" />
          <rect x="87" y="10" width="8" height="7" fill="#7aa0c8" />
          <rect x="74" y="7" width="12" height="13" rx="2" fill={WING} />
        </g>
      );
    case "thirsty":
      return (
        <path
          d="M80 33c-5 7-6 10-6 12a6 6 0 0 0 12 0c0-2-1-5-6-12z"
          fill="#9cc6e8"
        />
      );
    case "stop":
      return (
        <g>
          <path d="M72 70 86 46" />
          <path
            d="m81 23 8 0 6 6 0 8-6 6-8 0-6-6 0-8z"
            fill="#c8553d"
            transform="translate(0 2)"
          />
          <path d="M80 35h10" stroke={WING} />
        </g>
      );
    case "coin":
      return (
        <g transform="translate(84 62)">
          <circle r="11" fill={HONEY} />
          <circle r="7" fill="none" strokeWidth="1.5" />
          <path d="M3 -3a4 4 0 1 0 0 6M-5 -1h6M-5 1.5h6" strokeWidth="1.5" />
        </g>
      );
  }
}

/** Friendly cartoon bee for the landing chapters; `pose` adds a prop and a mood. */
export function CuteBee({ pose, size = 96 }: { pose: BeePose; size?: number }) {
  const clip = useId();
  const worried = pose === "thirsty" || pose === "stop";
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      stroke={INK}
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <defs>
        <clipPath id={clip}>
          <ellipse cx="46" cy="62" rx="24" ry="26" />
        </clipPath>
      </defs>
      <ellipse
        cx="25"
        cy="42"
        rx="15"
        ry="10"
        transform="rotate(-35 25 42)"
        fill={WING}
      />
      <ellipse
        cx="67"
        cy="42"
        rx="15"
        ry="10"
        transform="rotate(35 67 42)"
        fill={WING}
      />
      <path d="M40 38q-2-10-9-13M52 38q2-10 9-13" />
      <circle cx="31" cy="25" r="2.5" fill={INK} />
      <circle cx="61" cy="25" r="2.5" fill={INK} />
      <path d="m42 87 4 9 4-9z" fill={INK} />
      <ellipse cx="46" cy="62" rx="24" ry="26" fill={HONEY} />
      <g clipPath={`url(#${clip})`} stroke="none" fill={INK}>
        <rect x="20" y="70" width="52" height="6" />
        <rect x="20" y="80" width="52" height="6" />
      </g>
      <ellipse cx="46" cy="62" rx="24" ry="26" />
      {pose === "sleepy" ? (
        <path d="M34 53q4 3 8 0M50 53q4 3 8 0" strokeWidth="2.5" />
      ) : (
        <>
          <circle cx="38" cy="54" r="3.2" fill={INK} stroke="none" />
          <circle cx="54" cy="54" r="3.2" fill={INK} stroke="none" />
          <circle cx="39" cy="53" r="1" fill={WING} stroke="none" />
          <circle cx="55" cy="53" r="1" fill={WING} stroke="none" />
        </>
      )}
      <circle
        cx="31"
        cy="61"
        r="3.2"
        fill={CHEEK}
        stroke="none"
        opacity=".75"
      />
      <circle
        cx="61"
        cy="61"
        r="3.2"
        fill={CHEEK}
        stroke="none"
        opacity=".75"
      />
      {worried ? (
        <>
          <path d="M34 47l7 2M58 47l-7 2" strokeWidth="2" />
          <path d="M41 65q5-4 10 0" strokeWidth="2.5" />
        </>
      ) : (
        <path d="M40 62q6 6 12 0" strokeWidth="2.5" />
      )}
      <Prop pose={pose} />
    </svg>
  );
}
