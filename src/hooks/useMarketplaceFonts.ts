/**
 * Shared hook — injects Google Fonts (Inter, Poppins, Material Symbols)
 * needed by all marketplace-facing pages.
 *
 * WHY a hook: OEMPartsPage, SuppliersPage etc. render independently
 * without the LandingPage shell, so they must load fonts themselves.
 */
import { useEffect } from 'react';

const FONT_LINKS = [
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@600;700;800;900&display=swap',
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap',
];

export function useMarketplaceFonts() {
  useEffect(() => {
    FONT_LINKS.forEach(href => {
      if (!document.querySelector(`link[href="${href}"]`)) {
        const l = document.createElement('link');
        l.rel = 'stylesheet';
        l.href = href;
        document.head.appendChild(l);
      }
    });
  }, []);
}
