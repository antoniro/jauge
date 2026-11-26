// The app's icons: 1.7 px rounded strokes on a 16 or 18 px grid, in the text colour (DESIGN.md, Icons).
// The car drawings of the settings are in Settings.tsx.

// ---------- 18 px grid ----------
const ic = { width: 18, height: 18, viewBox: '0 0 18 18', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const
export const IconClose = () => (<svg {...ic}><path d="m4.500 4.500 9 9M13.500 4.500l-9 9" /></svg>)
export const IconSearch = () => (<svg {...ic}><circle cx="8" cy="8" r="4.800" /><path d="m11.600 11.600 3.400 3.400" /></svg>)
export const IconGear = () => (<svg {...ic}><path d="M3 5.200h6.200M12.800 5.200H15M3 12.800h2.200M8.800 12.800H15" /><circle cx="11" cy="5.200" r="1.800" /><circle cx="7" cy="12.800" r="1.800" /></svg>)
export const IconPinMark = () => (<svg {...ic}><path d="M9 16s5-4.400 5-8.400a5 5 0 1 0-10 0C4 11.600 9 16 9 16Z" /><circle cx="9" cy="7.500" r="1.700" /></svg>)
export const IconDown = () => (<svg {...ic} width={12} height={12}><path d="m4.500 7 4.500 4.500L13.500 7" /></svg>)
export const IconBack = () => (<svg {...ic} width={14} height={14}><path d="M7 4.500 3.500 8 7 11.500M3.500 8h7a3.500 3.500 0 0 1 0 7H9" /></svg>)
export const IconMinus = () => (<svg {...ic}><path d="M4 9h10" /></svg>)
export const IconPlus = () => (<svg {...ic}><path d="M4 9h10M9 4v10" /></svg>)
export const IconCheck = () => (<svg {...ic}><path d="m4 9.400 3.400 3.400L14 5.600" /></svg>)
export const IconFlag = () => (<svg {...ic} width={16} height={16}><path d="M4.500 15.500V3M4.500 3.500h8l-1.800 3 1.800 3h-8" /></svg>)

// ---------- 16 px grid ----------
const is = { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const
export const IconPump = () => (<svg {...is}><path d="M2.5 14V3.2c0-.7.5-1.2 1.2-1.2h4.1c.7 0 1.2.5 1.2 1.2V14M1.5 14h8.5M4.5 4.5h2.5v2.3H4.5zM9 8h1.4c.6 0 1 .4 1 1v2.2a1.1 1.1 0 0 0 2.2 0V5.6L11.4 3.4" /></svg>)
export const IconPin = () => (<svg {...is}><path d="M8 14.2s4.4-3.9 4.4-7.5a4.4 4.4 0 1 0-8.8 0c0 3.6 4.4 7.5 4.4 7.5Z" /><circle cx="8" cy="6.7" r="1.5" /></svg>)
export const IconMinusSmall = () => (<svg {...is}><path d="M3.5 8h9" /></svg>)
export const IconPlusSmall = () => (<svg {...is}><path d="M3.5 8h9M8 3.5v9" /></svg>)
export const IconList = () => (<svg {...is}><path d="M5.5 4h8M5.5 8h8M5.5 12h8M2.5 4h.01M2.5 8h.01M2.5 12h.01" /></svg>)
export const IconCheckSmall = () => (<svg {...is}><path d="m3.2 8.4 3.1 3.1 6.500-7" /></svg>)
export const IconCloseSmall = () => (<svg {...is} width={12} height={12}><path d="m4 4 8 8M12 4l-8 8" /></svg>)
export const IconMap = () => (<svg {...is}><path d="M1.8 4.2 6 2.5l4 1.7 4.2-1.7v9.300L10 13.500l-4-1.7-4.2 1.700ZM6 2.5v9.300M10 4.200v9.3" /></svg>)
export const IconLocate = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
    <circle cx="8" cy="8" r="4.2" /><circle cx="8" cy="8" r="1" fill="currentColor" stroke="none" /><path d="M8 1v2.2M8 12.8V15M1 8h2.2M12.8 8H15" />
  </svg>
)
export const IconGo = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden><path d="M14.3 1.7 1.9 6.6c-.5.2-.5.9 0 1.1l4.7 1.7 1.7 4.7c.2.5.9.5 1.1 0l4.9-12.4Z" /></svg>
)
