import { useState, type MouseEvent } from 'react';

export function useRailRowMenu() {
  const [menuOpen, setMenuOpen] = useState(false);
  const openMenuOnContext = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const open = () => {
      window.clearTimeout(fallback);
      window.removeEventListener('pointerup', onRelease);
      setMenuOpen(true);
    };
    const onRelease = () => window.setTimeout(open, 0);
    const fallback = window.setTimeout(open, 500);
    window.addEventListener('pointerup', onRelease, { once: true });
  };
  return { menuOpen, setMenuOpen, openMenuOnContext };
}
