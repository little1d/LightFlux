import { Platform } from 'react-native';

// Premium cross-platform UI stack. Latin and CJK are paired so every desktop
// platform resolves to its refined native faces:
//   macOS  -> SF Pro + PingFang SC
//   Windows -> Segoe UI + Microsoft YaHei
//   Linux  -> system sans + Noto Sans CJK
// PingFang SC is listed explicitly (and weights are capped at 600 elsewhere) so
// Chinese never falls back to the heavy Heiti face that 800/900 would trigger.
const FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", ' +
  '"Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, ' +
  'Arial, "Noto Sans CJK SC", sans-serif';

const BASE_CSS = `
:root { color-scheme: light; }
html, body, #root {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
  font-family: ${FONT_STACK};
}
`;

// Runs synchronously when imported at the top of the layout, before the app
// paints, so there is no flash of the previous default/heavy type. This sets the
// baseline stack and font smoothing only; React Native Web applies each
// element's own family (icon glyphs, statistics monospace) through atomic
// classes, which a universal rule would otherwise clobber. Each OS pairs its
// premium Latin + CJK faces via this stack/system fallback, and weights are
// capped at 600 elsewhere so Chinese renders real PingFang/YaHei/Noto cuts
// rather than a synthesized heavy face.
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const existing = document.querySelector('style[data-lightflux-base]');
  if (!existing) {
    const style = document.createElement('style');
    style.setAttribute('data-lightflux-base', '');
    style.textContent = BASE_CSS;
    document.head.appendChild(style);
  }
}
