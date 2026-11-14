// 디자인 캔버스(Mount Sleet + 직원 콘솔)에서 그대로 옮긴 색 토큰.
export const color = {
  // 공통 브랜드
  brandGold: '#AF8A40',
  ink: '#000000',
  white: '#ffffff',

  // 고객 화면 (Mount Sleet)
  surfaceDark: '#1c1c1c',
  navyDeep: '#20303c',
  muted: '#808080',
  surfaceSoft: '#f7f7f7',
  surfaceCool: '#eff1f2',

  // 직원 콘솔
  consoleBg: '#000000',
  consolePanel: '#0d0d0d',
  consoleBorder: '#262626',
  consoleRowBorder: '#1f1f1f',
  consoleText: '#f7f7f7',
  consoleDim: '#9c9c9c',
  consoleFaint: '#767676',
  consoleSelected: '#FFD404',
  consoleHoverRow: '#181818',
  consoleChip: '#b8b8b8',
  consoleBtnBorder: '#4a4a4a',
  consoleBtnText: '#d8d8d8',
  danger: '#e06c6c',
  warn: '#e3c27a',
  ok: '#5bb974',
  info: '#337eff',
  editBtn: '#d9d9d9',
  editBtnActive: '#7a7a7a',
  btnDisabled: '#4a4a4a',
  delBtn: '#b60000',
  delBtnActive: '#7d0000',
} as const;

export const font = {
  family: `'Wanted Sans', 'Spoqa Han Sans Neo', 'Noto Sans KR', sans-serif`,
} as const;
