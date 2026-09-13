export default function JourneyArt({ className = "" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 600 340"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id="hillBack"
          x1="300"
          y1="80"
          x2="300"
          y2="340"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#a9c9a8" />
          <stop offset="1" stopColor="#729f8b" />
        </linearGradient>
        <linearGradient
          id="hillFront"
          x1="300"
          y1="150"
          x2="300"
          y2="340"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#679b81" />
          <stop offset="1" stopColor="#26624f" />
        </linearGradient>
      </defs>
      <circle cx="465" cy="83" r="39" fill="#eed3a4" />
      <path d="M372 77h35M389 61v32" stroke="#d0dfc2" strokeWidth="1.5" />
      <path d="m537 143 4 8 8 4-8 4-4 8-4-8-8-4 8-4Z" fill="#c2d7b7" />
      <path
        d="M0 251C83 211 111 126 203 127c77 1 100 79 171 62 86-20 140-71 226-9v160H0Z"
        fill="url(#hillBack)"
      />
      <path
        d="M0 251c97 82 115-11 201-17 100-8 87-88 182-96 111-9 134 115 217 104v98H0Z"
        fill="url(#hillFront)"
      />
      <path
        d="M110 348c-39-37 20-49 75-66 91-28 135-30 116-57-10-15-45-16-24-31 18-13 68-10 93-44"
        stroke="#dfe5c7"
        strokeWidth="23"
        strokeLinecap="round"
      />
      <path
        d="M110 348c-39-37 20-49 75-66 91-28 135-30 116-57-10-15-45-16-24-31 18-13 68-10 93-44"
        stroke="#88a283"
        strokeWidth="1.5"
        strokeDasharray="3 9"
        strokeLinecap="round"
      />
      <ellipse cx="372" cy="152" rx="19" ry="5" fill="#255346" opacity=".2" />
      <path
        d="M372 150V93"
        stroke="#fff8e6"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path d="M374 94c17-6 18 10 37 3v24c-18 6-22-9-37-3Z" fill="#e8b486" />
      <path
        d="m458 234 12-25 12 25h-24Zm-24 26 19-39 19 39h-38Z"
        fill="#235943"
      />
      <path d="M453 259v15m17-40v22" stroke="#235943" strokeWidth="3" />
      <path d="m123 195 14-30 14 30h-28Z" fill="#46785c" />
      <path d="M137 194v15" stroke="#46785c" strokeWidth="3" />
      <circle
        cx="287"
        cy="228"
        r="15"
        fill="#f5d7b4"
        stroke="#fff6e4"
        strokeWidth="3"
      />
      <path
        d="m282 228 4 4 7-8"
        stroke="#3c6c56"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="189" cy="282" r="20" fill="#fff6e4" />
      <circle cx="189" cy="282" r="14" fill="#c68158" />
      <path
        d="m183 282 4 4 8-8"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M32 103h21m-10-10v20" stroke="#93b69e" strokeWidth="1.5" />
      <circle cx="205" cy="72" r="3" fill="#e9d7b7" />
    </svg>
  );
}
