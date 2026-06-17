/** Shared brand mark SVG — purple SK monogram (matches src/app/icon.svg). */
export const BRAND_MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" role="img" aria-label="SelahKeep">
  <rect width="32" height="32" rx="8" fill="#5b3a8c"/>
  <text x="16" y="20.5" text-anchor="middle" fill="#faf8fc" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="11" font-weight="700" letter-spacing="0.4">SK</text>
</svg>`;

export const brandMarkDataUrl = `data:image/svg+xml,${encodeURIComponent(BRAND_MARK_SVG)}`;
