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
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 999999,
      height: 3, backgroundColor: 'rgba(139,30,30,0.12)', pointerEvents: 'none',
    }}>
      <div style={{
        height: '100%',
        width: `${Math.min(progress, 100)}%`,
        backgroundColor: '#8b1e1e',
        transition: progress === 100 ? 'width 0.25s ease' : 'width 0.12s ease',
        borderRadius: '0 3px 3px 0',
        position: 'relative',
        boxShadow: '2px 0 8px rgba(139,30,30,0.4)',
      }}>
        {/* Glowing tip */}
        <div style={{
          position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
          width: 60, height: 3,
          background: 'linear-gradient(to right, transparent, rgba(255,180,170,0.9))',
          borderRadius: 3,
        }} />
      </div>
    </div>
  );
}
