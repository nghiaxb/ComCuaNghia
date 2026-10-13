export function MealArt({ variant = 0 }: { variant?: number }) {
  return (
    <svg viewBox="0 0 240 190" width="100%" height="100%" aria-hidden="true">
      <ellipse cx="120" cy="168" rx="91" ry="13" fill="#163d2b" opacity=".13" />
      <rect
        x="26"
        y="26"
        width="188"
        height="132"
        rx="27"
        fill="#e6d3ad"
        transform="rotate(-6 120 95)"
      />
      <rect x="34" y="31" width="172" height="117" rx="23" fill="#fff9e9" />
      <path d="M119 38v103M126 99h72" stroke="#dbc8a4" strokeWidth="5" />
      <ellipse cx="77" cy="91" rx="32" ry="40" fill="#eee6d5" />
      <ellipse cx="76" cy="86" rx="29" ry="37" fill="white" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <path
          key={i}
          d={`M${60 + (i % 3) * 12} ${65 + Math.floor(i / 3) * 24}l4 9`}
          stroke="#e9e2d3"
          strokeWidth="3"
          strokeLinecap="round"
        />
      ))}
      <path
        d="M141 56q28-18 45 3q11 23-17 30q-39 7-28-33"
        fill={["#c77939", "#cb6951", "#ba8744"][variant % 3]}
      />
      <path
        d="M150 59l29 17m-30-2 22-19"
        stroke="#8e522d"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="149" cy="121" r="13" fill="#629854" />
      <circle cx="167" cy="117" r="15" fill="#407947" />
      <circle cx="183" cy="126" r="10" fill="#85aa5c" />
      <path
        d="M23 13l190-7M24 22l190-7"
        stroke="#805d38"
        strokeWidth="5"
        strokeLinecap="round"
      />
    </svg>
  );
}
