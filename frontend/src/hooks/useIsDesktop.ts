import { useEffect, useState } from "react";

export function useIsDesktop(breakpoint = 768): boolean {
  const read = () => window.innerWidth >= breakpoint;
  const [isDesktop, setIsDesktop] = useState(read);

  useEffect(() => {
    function sync() {
      setIsDesktop(read());
    }
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, [breakpoint]);

  return isDesktop;
}
