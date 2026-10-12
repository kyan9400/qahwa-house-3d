/**
  Designed fallback for the 3D stage (no WebGL, context lost, or while the 3D warms up).
  Drawn entirely in SVG, in the site palette.
*/
export default function Poster() {
  return (
    <svg viewBox="0 0 640 640" role="presentation" focusable="false">
      <defs>
        <radialGradient id="pg-glow" cx="50%" cy="55%" r="50%">
          <stop offset="0" stopColor="#e3a53c" stopOpacity="0.28" />
          <stop offset="1" stopColor="#e3a53c" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="pg-cup" x1="0" x2="1">
          <stop offset="0" stopColor="#6e2a12" />
          <stop offset="0.35" stopColor="#b0512a" />
          <stop offset="0.6" stopColor="#9a3d1c" />
          <stop offset="1" stopColor="#5a220f" />
        </linearGradient>
        <radialGradient id="pg-coffee" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#c58a52" />
          <stop offset="0.8" stopColor="#9a5d31" />
          <stop offset="1" stopColor="#5e3118" />
        </radialGradient>
        <linearGradient id="pg-brass" x1="0" x2="1">
          <stop offset="0" stopColor="#6b4a1c" />
          <stop offset="0.38" stopColor="#e8c27a" />
          <stop offset="0.62" stopColor="#b8873a" />
          <stop offset="1" stopColor="#5e4018" />
        </linearGradient>
        <linearGradient id="pg-brass-spout" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#9c7130" />
          <stop offset="1" stopColor="#e3b768" />
        </linearGradient>
        <linearGradient id="pg-saucer" x1="0" x2="1">
          <stop offset="0" stopColor="#cdbd9f" />
          <stop offset="0.45" stopColor="#f2e7d4" />
          <stop offset="1" stopColor="#b9a888" />
        </linearGradient>
      </defs>
      <circle cx="320" cy="350" r="300" fill="url(#pg-glow)" />
      {/* the brass dallah behind the cup, as in the 3D scene */}
      <g transform="translate(168 444)">
        <path
          d="M-50 -70C-85 -70 -100 -100 -110 -140C-118 -175 -130 -196 -150 -203L-152 -198C-138 -190 -126 -170 -118 -138C-108 -96 -96 -54 -52 -44Z"
          fill="url(#pg-brass-spout)"
        />
        <path d="M28 -160C70 -168 100 -150 98 -110C96 -78 82 -54 62 -44" fill="none" stroke="#9c7130" strokeWidth="9" strokeLinecap="round" />
        <path
          d="M0 0L58 0C64 -3 72 -20 73.5 -39C75 -55 66 -75 55.5 -87C45 -99 32 -116 30.6 -132C29.5 -144 34 -160 40.5 -168C45 -174 50 -178 51.6 -180L46.8 -181C44 -186 36 -198 19.5 -207.6L9.6 -210L9.6 -215.4L15.6 -216.6L15.6 -221.4L7.2 -223.2C14 -230 16 -240 13.2 -246C10 -253 4 -257 0 -257.4C-4 -257 -10 -253 -13.2 -246C-16 -240 -14 -230 -7.2 -223.2L-15.6 -221.4L-15.6 -216.6L-9.6 -215.4L-9.6 -210L-19.5 -207.6C-36 -198 -44 -186 -46.8 -181L-51.6 -180C-50 -178 -45 -174 -40.5 -168C-34 -160 -29.5 -144 -30.6 -132C-32 -116 -45 -99 -55.5 -87C-66 -75 -75 -55 -73.5 -39C-72 -20 -64 -3 -58 0Z"
          fill="url(#pg-brass)"
        />
      </g>
      <g fill="none" stroke="#f2e5cf" strokeLinecap="round" opacity="0.32">
        <path d="M285 200c-30-40 30-60 0-105s25-60 5-90" strokeWidth="12" />
        <path d="M340 205c-25-35 35-55 10-100s20-55 0-80" strokeWidth="9" />
        <path d="M385 210c-20-30 25-45 5-80" strokeWidth="7" />
      </g>
      <ellipse cx="320" cy="488" rx="262" ry="66" fill="#2a1b12" opacity="0.6" />
      <ellipse cx="320" cy="472" rx="258" ry="62" fill="url(#pg-saucer)" />
      <ellipse cx="320" cy="466" rx="160" ry="36" fill="#d8c8aa" />
      <path d="M470 290c70-6 82 70 6 112" fill="none" stroke="#8f3a1b" strokeWidth="26" strokeLinecap="round" />
      <path d="M148 250c4 92 40 170 108 205h128c68-35 104-113 108-205z" fill="url(#pg-cup)" />
      <path d="M232 448h176" stroke="#b48a64" strokeWidth="10" strokeLinecap="round" />
      <ellipse cx="320" cy="250" rx="172" ry="42" fill="#efe3cf" />
      <ellipse cx="320" cy="252" rx="154" ry="33" fill="url(#pg-coffee)" />
      <g fill="#f4e7d2" opacity="0.95">
        <path d="M250 258c30-20 110-20 140 0-30-8-110-8-140 0z" />
        <path d="M262 249c26-16 90-16 116 0-26-6-90-6-116 0z" />
        <path d="M276 241c22-12 66-12 88 0-22-4-66-4-88 0z" />
        <ellipse cx="320" cy="232" rx="20" ry="7" />
        <rect x="318" y="228" width="4" height="40" rx="2" />
      </g>
      <g fill="#4a2816">
        <g transform="translate(96 380) rotate(-25)">
          <ellipse rx="22" ry="15" />
          <path d="M-18 0c10 4 26-4 36 0" stroke="#24120a" strokeWidth="3" fill="none" />
        </g>
        <g transform="translate(560 220) rotate(35)">
          <ellipse rx="18" ry="12" />
          <path d="M-15 0c8 3 22-3 30 0" stroke="#24120a" strokeWidth="3" fill="none" />
        </g>
        <g transform="translate(140 150) rotate(60)">
          <ellipse rx="14" ry="10" />
          <path d="M-11 0c6 3 16-3 22 0" stroke="#24120a" strokeWidth="2.5" fill="none" />
        </g>
        <g transform="translate(530 470) rotate(-60)">
          <ellipse rx="20" ry="14" />
          <path d="M-16 0c9 4 24-4 32 0" stroke="#24120a" strokeWidth="3" fill="none" />
        </g>
      </g>
    </svg>
  );
}
