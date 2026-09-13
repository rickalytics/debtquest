import { useId } from "react";

export function Pip({ look = "classic", mood = "happy", className = "" }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg
      className={`pip-art ${className}`}
      viewBox="0 0 220 230"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id={id}
          x1="78"
          y1="52"
          x2="137"
          y2="183"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#a7f5ba" />
          <stop offset="1" stopColor="#34c5a1" />
        </linearGradient>
      </defs>
      <ellipse cx="109" cy="213" rx="59" ry="10" fill="#293c64" opacity=".12" />
      {look === "cape" && (
        <path
          d="M66 124 34 195q77 30 148-2l-38-70Z"
          fill="#8270ea"
          stroke="#5943b0"
          strokeWidth="4"
        />
      )}
      <path
        d="M61 123q-31 5-26 32t31-3M158 123q32-2 31 26t-29 4"
        fill="#6fddb0"
        stroke="#289f84"
        strokeWidth="3"
      />
      <path
        d="m73 175-7 27q8 17 31 4l4-26m28-5-1 29q15 15 29 0l-9-31"
        fill="#42c5a1"
        stroke="#289f84"
        strokeWidth="3"
      />
      <path
        d="M109 59q-15-30-37-33 0 27 26 41M111 59q8-30 39-39 2 24-27 47"
        fill="#67d3a3"
        stroke="#279d7a"
        strokeWidth="3"
      />
      <path
        d="M109 52c-44 0-65 33-65 77 0 50 25 65 65 65s68-15 68-65c0-44-22-77-68-77Z"
        fill={`url(#${id})`}
        stroke="#258b75"
        strokeWidth="4"
      />
      <ellipse cx="107" cy="155" rx="43" ry="30" fill="#d6f9cd" />
      <path
        d="M67 89q12-22 35-23"
        stroke="#ddffd8"
        strokeWidth="7"
        strokeLinecap="round"
      />
      {mood === "celebrate" ? (
        <g stroke="#234756" strokeWidth="6" strokeLinecap="round">
          <path d="m75 111 9-7 9 7m33 0 9-7 9 7" />
        </g>
      ) : (
        <g fill="#234756">
          <ellipse className="pip-eye" cx="85" cy="109" rx="7" ry="10" />
          <ellipse className="pip-eye" cx="134" cy="109" rx="7" ry="10" />
          <circle cx="87" cy="106" r="2.4" fill="white" />
          <circle cx="136" cy="106" r="2.4" fill="white" />
        </g>
      )}
      <ellipse cx="66" cy="128" rx="10" ry="6" fill="#f2a2a0" opacity=".85" />
      <ellipse cx="154" cy="128" rx="10" ry="6" fill="#f2a2a0" opacity=".85" />
      <path d="M96 127q14 17 28 0" fill="#234756" />
      <path d="M103 134q7-5 14 0-7 6-14 0Z" fill="#f7969d" />
      <path
        d="m109 153 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z"
        fill="#ffc85c"
        stroke="#c98d30"
        strokeWidth="2"
      />
      {look === "scarf" && (
        <g fill="#fcaa76" stroke="#b97047" strokeWidth="3">
          <path d="M59 142q50 22 101-1l-2 14q-48 18-94 0Z" />
          <path d="m129 156 21 28 12-14-20-19Z" />
        </g>
      )}
      {look === "cape" && (
        <path d="m69 139 39 17 39-18-7 17-32 10-35-12Z" fill="#5943b0" />
      )}
      {look === "lantern" && (
        <g stroke="#b38034" strokeWidth="3">
          <path d="M180 149v-10q0-13 11-13t11 13v10" />
          <path d="m177 147-4 39h34l-3-39Z" fill="#ffd77e" />
          <path d="M177 157h27m-28 19h29" />
          <circle cx="191" cy="167" r="7" fill="#fff4c3" stroke="none" />
        </g>
      )}
      {look === "crown" && (
        <path
          d="m78 58-5-34 21 14 16-22 17 22 22-14-7 34Z"
          fill="#ffd36b"
          stroke="#b98029"
          strokeWidth="4"
        />
      )}
    </svg>
  );
}

export function Chest({ open = false, className = "" }) {
  return (
    <svg
      className={`chest-art ${open ? "open" : ""} ${className}`}
      viewBox="0 0 160 130"
      fill="none"
      aria-hidden="true"
    >
      <ellipse cx="81" cy="118" rx="56" ry="8" fill="#293c64" opacity=".12" />
      <path
        d="M29 57h103v47q-47 20-103-2Z"
        fill="#c98050"
        stroke="#814b39"
        strokeWidth="4"
      />
      <path d="M39 67h82v29q-42 13-82-1Z" fill="#925635" />
      <g className="chest-lid">
        <path
          d="M28 61V45q2-27 50-27t54 27v17Z"
          fill="#a77aef"
          stroke="#6948a5"
          strokeWidth="4"
        />
        <path d="M39 54V45q2-17 39-17t42 17v9Z" fill="#c4a6fa" />
        <path d="M49 22v41m61-41v41" stroke="#ffd574" strokeWidth="10" />
        <path d="M27 61h106" stroke="#ffda84" strokeWidth="8" />
      </g>
      <path d="M48 66v40m62-40v41" stroke="#f6bf60" strokeWidth="10" />
      <rect
        x="66"
        y="57"
        width="31"
        height="29"
        rx="7"
        fill="#ffe29d"
        stroke="#b57b37"
        strokeWidth="3"
      />
      <path d="m81 62 4 7 8 2-6 5 1 8-7-4-7 4 1-8-6-5 8-2Z" fill="#a57439" />
      {open && (
        <g fill="#ffd46d">
          <path d="m80 1 4 11 12 4-12 4-4 11-4-11-12-4 12-4Z" />
          <path d="m23 7 3 7 8 3-8 3-3 7-3-7-8-3 8-3Zm112 7 3 7 8 3-8 3-3 7-3-7-8-3 8-3Z" />
        </g>
      )}
    </svg>
  );
}

export function IslandWorld() {
  return (
    <svg
      className="island-world"
      viewBox="0 0 640 580"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id="questWater"
          x1="320"
          y1="0"
          x2="320"
          y2="580"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#d9e4fd" />
          <stop offset=".5" stopColor="#bce9e1" />
          <stop offset="1" stopColor="#b2ded5" />
        </linearGradient>
        <linearGradient
          id="questLand"
          x1="320"
          y1="68"
          x2="320"
          y2="536"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#e2eaa0" />
          <stop offset=".5" stopColor="#b8dfa2" />
          <stop offset="1" stopColor="#81c4a3" />
        </linearGradient>
      </defs>
      <path fill="url(#questWater)" d="M0 0h640v580H0z" />
      <g fill="white" opacity=".7">
        <ellipse cx="509" cy="69" rx="70" ry="18" />
        <ellipse cx="488" cy="55" rx="29" ry="24" />
        <ellipse cx="69" cy="164" rx="70" ry="18" />
        <ellipse cx="80" cy="150" rx="29" ry="24" />
      </g>
      <g stroke="#ecfffa" strokeWidth="3" strokeLinecap="round" opacity=".7">
        <path d="M29 350h28m499-10h45M500 490h59M69 535h25M557 211h44M99 67h27m409 478h10M35 394h11" />
      </g>
      <ellipse
        cx="327"
        cy="393"
        rx="222"
        ry="116"
        fill="#4a9f96"
        opacity=".17"
      />
      <path
        d="M117 339c-67-79 10-115 113-137 58-12 28-102 121-110 79-7 169 46 114 125-34 49 107 47 85 133-17 65-110 49-137 103-23 46-200 53-251-11-16-20-15-68-45-103Z"
        fill="#74b39a"
        stroke="#689f89"
        strokeWidth="2"
        transform="translate(0 26)"
      />
      <path
        d="M117 339c-67-79 10-115 113-137 58-12 28-102 121-110 79-7 169 46 114 125-34 49 107 47 85 133-17 65-110 49-137 103-23 46-200 53-251-11-16-20-15-68-45-103Z"
        fill="url(#questLand)"
        stroke="#eff1ba"
        strokeWidth="12"
      />
      <path
        d="M377 259c7 60 27 109 52 131l-44 56-38-19 50-50c-24-52-29-91-29-131"
        fill="#7ad3d2"
      />
      <path
        d="M369 275c11 50 30 105 44 116l-57 51"
        stroke="#bff3e8"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M183 429c-17-59 113-22 148-63s-145-34-124-113 133 2 169-43 1-40 0-83"
        stroke="#adc380"
        strokeWidth="32"
        strokeLinecap="round"
      />
      <path
        d="M183 421c-17-59 113-22 148-63s-145-34-124-113 133 2 169-43 1-40 0-83"
        stroke="#fff0c2"
        strokeWidth="24"
        strokeLinecap="round"
      />
      <path
        d="M183 421c-17-59 113-22 148-63s-145-34-124-113 169 2 169-126"
        stroke="#d1ad75"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="2 12"
      />
      <g fill="#397e72" stroke="#296455" strokeWidth="2">
        <path d="m143 286 22-49 22 49Z" />
        <path d="m118 298 21-43 21 43Z" />
        <path d="m442 304 29-59 29 59Z" />
        <path d="m474 321 22-47 22 47Z" />
        <path d="m270 151 22-49 22 49Z" />
      </g>
      <g stroke="#725b43" strokeWidth="5" strokeLinecap="round">
        <path d="M165 286v13m-26-1v13m332-7v14m25 2v13M292 152v13" />
      </g>
      <path
        d="m249 328 69 17-5 17-68-17Z"
        fill="#b7885a"
        stroke="#8d6244"
        strokeWidth="2"
      />
      <path
        d="m256 330-4 18m18-15-4 19m18-16-4 19m18-16-4 19m16-16-4 18"
        stroke="#dfb782"
        strokeWidth="6"
      />
      <g fill="#fff6ce">
        <circle cx="246" cy="199" r="4" />
        <circle cx="432" cy="384" r="4" />
        <circle cx="282" cy="438" r="4" />
        <circle cx="260" cy="432" r="3" />
        <circle cx="453" cy="167" r="4" />
      </g>
      <path d="m344 143 37-69 40 69Z" fill="#ab9acf" />
      <path d="m366 98 15-24 17 29-19-8Z" fill="#fffafa" />
      <path d="M403 110V71m0 1 30 8-30 10" stroke="#7a617c" strokeWidth="3" />
      <path d="m405 73 25 7-25 8Z" fill="#fcc76a" />
      <g fill="#7cbe97">
        <ellipse cx="95" cy="459" rx="28" ry="10" />
        <ellipse cx="558" cy="407" rx="24" ry="9" />
      </g>
      <g fill="#7ca891">
        <path d="m87 459 9-25 11 25Z" />
        <path d="m551 406 7-20 10 20Z" />
      </g>
    </svg>
  );
}
