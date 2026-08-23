export const MARKETING_PATHS = [
  '/',
  '/features',
  '/download',
  '/help',
  '/privacy',
  '/terms',
  '/changelog',
] as const;

export type MarketingPath = (typeof MARKETING_PATHS)[number];

export const isPublicMarketingPath = (
  pathname: string,
): pathname is MarketingPath =>
  MARKETING_PATHS.includes(pathname as MarketingPath);
