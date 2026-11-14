// Mr. World 로고(실크해트를 쓴 지구) — 디자인 캔버스 Staff.dc.html의 사이드바 버전.
export default function LogoMark({ width = 46 }: { width?: number }) {
  const land1 =
    'M30,128 C60,116 96,110 118,116 C130,119 129,130 120,135 C111,140 103,138 100,146 C98,155 108,158 117,158 C133,158 149,166 157,180 C162,190 151,198 143,204 C134,211 133,222 129,232 C127,239 120,237 120,228 C120,214 113,200 109,186 C106,176 98,170 88,166 C72,160 58,150 30,150 Z';
  const land2 =
    'M215,122 C196,122 180,126 170,136 C162,145 170,154 178,157 C187,160 187,170 180,176 C172,183 170,194 176,202 C183,210 196,208 215,202 Z';
  const hat =
    'M82.8,54.1 C94.7,47.8 112.9,43.6 125.5,44.3 C135.3,44.6 142.3,45.7 144.4,47.8 C145.3,55.5 146.7,65.3 148.6,74.0 C154.9,73.4 164.7,75.8 166.9,83.5 C167.5,89.1 163.3,95.4 157.0,97.8 C150.7,92.6 139.5,90.8 129.7,92.2 C115.7,94.7 101.7,100.3 91.9,104.1 C83.5,104.8 75.1,102.4 73.0,97.8 C72.5,95.4 73.7,93.9 75.8,93.3 L88.1,92.5 C86.3,80.7 84.2,66.7 82.8,54.1 Z';
  return (
    <svg
      aria-hidden="true"
      viewBox="36 36 168 216"
      fill="none"
      stroke="#ffffff"
      strokeWidth="7"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ width, height: 'auto', display: 'block' }}
    >
      <defs>
        <clipPath id="mw-logo-globe">
          <circle cx="120" cy="168" r="78" />
        </clipPath>
      </defs>
      <g clipPath="url(#mw-logo-globe)">
        <path d={land1} />
        <path d={land2} />
      </g>
      <path clipPath="url(#mw-logo-globe)" d={hat} stroke="#000000" strokeWidth="22" />
      <circle cx="120" cy="168" r="78" />
      <path d={hat} fill="#ffffff" />
    </svg>
  );
}
