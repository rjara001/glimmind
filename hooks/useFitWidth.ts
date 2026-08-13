import { useEffect, useState } from 'react';
import type { RefObject } from 'react';

export function useFitWidth<T extends HTMLElement, M extends HTMLElement>(
  containerRef: RefObject<T | null>,
  measureRef: RefObject<M | null>
): boolean {
  const [fits, setFits] = useState<boolean>(true);

  useEffect(() => {
    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container || !measure) return;

    const update = () => {
      setFits(measure.scrollWidth <= container.clientWidth);
    };

    update();

    const observer = new ResizeObserver(update);
    observer.observe(container);
    observer.observe(measure);

    return () => observer.disconnect();
  }, [containerRef, measureRef]);

  return fits;
}
