import { useEffect, useState } from "react";

const MOBILE_QUERY = "(max-width: 639px)"; // matches Tailwind's `sm` breakpoint

/** SSR-safe: starts false to match server render, then updates after mount. */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    setIsMobile(mql.matches);
    const onChange = () => setIsMobile(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
