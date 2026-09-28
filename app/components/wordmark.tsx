"use client";

import { useLayoutEffect, useRef } from "react";

/** Fit the actual font metrics, including tracking, to the available column. */
export default function Wordmark({ hero = false }: { hero?: boolean }) {
  const text = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const span = text.current!;
    const container = span.parentElement!;
    let disposed = false;
    const fit = () => {
      if (disposed) return;
      const available = container.clientWidth;
      const width = span.getBoundingClientRect().width;
      const size = parseFloat(getComputedStyle(span).fontSize);
      if (available > 0 && width > 0) {
        // Small inset also protects the final glyph's antialiased edge.
        span.style.fontSize = `${(size * (available - 2)) / width}px`;
      }
    };
    fit();
    let previousWidth = container.clientWidth;
    const observer = new ResizeObserver(() => {
      if (container.clientWidth === previousWidth) return;
      previousWidth = container.clientWidth;
      fit();
    });
    observer.observe(container);
    document.fonts.ready.then(fit);
    document.fonts.addEventListener("loadingdone", fit);
    return () => {
      disposed = true;
      observer.disconnect();
      document.fonts.removeEventListener("loadingdone", fit);
    };
  }, []);

  const Tag = hero ? "h1" : "div";
  return (
    <Tag className={hero ? "hero-wordmark" : "footer-wordmark"} aria-hidden={hero ? undefined : true}>
      <span ref={text} className="wordmark-text">VOID</span>
    </Tag>
  );
}
