/** Shared brand mark SVG (matches src/app/icon.svg). */
export const BRAND_MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" role="img" aria-label="LTG Vault">
  <rect width="32" height="32" rx="8" fill="#5b3a8c"/>
  <rect x="6" y="10" width="20" height="14" rx="2" fill="#faf8fc"/>
  <path d="M6 11.75 16 19.25 26 11.75" fill="#ebe4f4"/>
  <path d="M6 11.75 16 19.25 26 11.75" stroke="#5b3a8c" stroke-width="1.1" stroke-linejoin="round"/>
  <rect x="6" y="10" width="20" height="14" rx="2" stroke="#5b3a8c" stroke-width="1.25"/>
  <circle cx="16" cy="20" r="2.75" fill="#8b6bb8"/>
</svg>`;

export const brandMarkDataUrl = `data:image/svg+xml,${encodeURIComponent(BRAND_MARK_SVG)}`;
