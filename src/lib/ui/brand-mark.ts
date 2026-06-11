/** Shared brand mark SVG (matches src/app/icon.svg). */
export const BRAND_MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" role="img" aria-label="Letters to God">
  <rect width="32" height="32" rx="8" fill="#4a6741"/>
  <rect x="6" y="10" width="20" height="14" rx="2" fill="#faf8f5"/>
  <path d="M6 11.75 16 19.25 26 11.75" fill="#e8dcc8"/>
  <path d="M6 11.75 16 19.25 26 11.75" stroke="#4a6741" stroke-width="1.1" stroke-linejoin="round"/>
  <rect x="6" y="10" width="20" height="14" rx="2" stroke="#4a6741" stroke-width="1.25"/>
  <circle cx="16" cy="20" r="2.75" fill="#c4a574"/>
</svg>`;

export const brandMarkDataUrl = `data:image/svg+xml,${encodeURIComponent(BRAND_MARK_SVG)}`;
