/**
 * LoadingBar — top progress bar shown during page navigation.
 *
 * WHY useLocation not useNavigation:
 *   useNavigation() only works inside a "data router" (createBrowserRouter).
 *   This app uses <BrowserRouter> so we detect navigation via useLocation()
 *   which fires on every route change regardless of router type.
 */
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

export function LoadingBar() {
  const location = useLocation();
  const [progress, setProgress] = useState(0);
  const [visible,  setVisible]  = useState(false);

  useEffect(() => {
    // Every location change triggers the bar
    setVisible(true);
    setProgress(10);

    let p = 10;
    const advance = setInterval(() => {
      p += Math.random() * 18;
      if (p >= 82) { clearInterval(advance); p = 82; }
      setProgress(p);
    }, 120);

    // Complete quickly — location already changed, page is loaded
    const finish = setTimeout(() => {
      clearInterval(advance);
      setProgress(100);
      setTimeout(() => { setVisible(false); setProgress(0); }, 450);
    }, 280);

    return () => { clearInterval(advance); clearTimeout(finish); };
  }, [location.key]); // location.key changes on every navigation

  if (!visible && progress === 0) return null;

  return (
    /* No visible background track — the bar itself slides across a transparent base,
       so there is no persistent red line/"border animation" at the top of every page. */
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 999999,
      height: 2, backgroundColor: 'transparent', pointerEvents: 'none',
    }}>
      <div style={{
        height: '100%',
        width: `${Math.min(progress, 100)}%`,
        background: 'linear-gradient(to right, #c0392b, #e8a09a)',
        transition: progress === 100 ? 'width 0.25s ease' : 'width 0.12s ease',
        borderRadius: '0 2px 2px 0',
        opacity: 0.7,
      }} />
    </div>
  );
}
