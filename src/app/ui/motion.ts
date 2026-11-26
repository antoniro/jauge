// The springs things move with (DESIGN.md, Motion). With reduced motion, every movement is instant instead.
export const SPRING = { type: 'spring', stiffness: 330, damping: 34 } as const
export const STILL = { duration: 0 } as const
