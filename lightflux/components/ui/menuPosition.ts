import type { MenuSurfacePosition } from './MenuSurface';

interface MenuViewport {
  height: number;
  width: number;
}

export const clampMenuPosition = (
  position: MenuSurfacePosition,
  viewport: MenuViewport,
  menuWidth: number,
  estimatedHeight: number,
): MenuSurfacePosition => ({
  x: Math.max(12, Math.min(position.x, viewport.width - menuWidth - 12)),
  y: Math.max(
    12,
    Math.min(position.y, viewport.height - estimatedHeight - 12),
  ),
});
