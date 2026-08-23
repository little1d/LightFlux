// The routed desktop shell needs room for its 78px navigation rail, an 8px
// divider, and two panes that remain usable at roughly 360px each.
export const DESKTOP_LAYOUT_BREAKPOINT = 820;

// Mobile browsers can lose a meaningful part of their usable height to browser
// chrome even on physically tall phones. Keep the navigation compact when the
// current viewport, rather than the device model, is short.
export const COMPACT_MOBILE_HEIGHT_BREAKPOINT = 700;
