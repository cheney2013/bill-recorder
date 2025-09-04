import React, { useRef, useState, useCallback } from 'react';

interface SwipeToDeleteProps {
  onDelete: () => void;
  children: React.ReactNode;
  className?: string;
  actionWidth?: number; // min revealed width for the button label, px
  label?: string; // button label
}

// Swipe left; if dragged >= 50% width on release, trigger delete. Touch/pen only.
export const SwipeToDelete: React.FC<SwipeToDeleteProps> = ({ onDelete, children, className, actionWidth = 88, label = '删除' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef<number | null>(null);
  const baseXRef = useRef<number>(0); // starting offset (usually 0)
  const [dx, setDx] = useState(0); // current translateX, clamped [-width, 0]
  const [anim, setAnim] = useState(false);
  const [committing, setCommitting] = useState(false);
  const widthRef = useRef<number>(0);

  const snapTo = (target: number) => {
    setAnim(true);
    setDx(target);
    setTimeout(() => setAnim(false), 160);
  };

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return;
    containerRef.current?.setPointerCapture(e.pointerId);
    startXRef.current = e.clientX;
    baseXRef.current = dx;
    widthRef.current = containerRef.current?.getBoundingClientRect().width || 1;
    setAnim(false);
    setCommitting(false);
  }, [dx]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return;
    if (startXRef.current == null) return;
    const delta = e.clientX - startXRef.current;
    // Allow up to full width to support destructive commit animation start
    let next = baseXRef.current + delta;
    const min = -widthRef.current;
    if (next > 0) next = 0;
    if (next < min) next = min;
    // Prevent scrolling and tooltips while swiping
    if (Math.abs(delta) > 4) e.preventDefault();
    setDx(next);
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return;
    const start = startXRef.current;
    startXRef.current = null;
    if (start == null) return;
    const delta = e.clientX - start;
    const revealed = Math.abs(baseXRef.current + delta);
    const threshold = widthRef.current * 0.5;
    if (revealed >= threshold) {
      // Commit delete without height collapse: brief polish then remove
      setCommitting(true);
  // Slide content fully left and keep it there until removal
  setAnim(true);
  setDx(-widthRef.current);
      const contentEl = contentRef.current;
      if (contentEl) {
        contentEl.style.transition = 'opacity 160ms ease-out, transform 160ms ease-out';
        contentEl.style.opacity = '0';
        contentEl.style.transform = 'scale(0.98)';
      }
      // Allow the commit visuals (rail expands to 100%) then delete
      setTimeout(() => {
        onDelete();
      }, 180);
    } else {
      // Snap back closed
      setCommitting(false);
      snapTo(0);
    }
  }, []);

  const revealedPx = Math.max(0, -dx);
  const railOpacity = revealedPx > 0 || committing ? 1 : 0;

  return (
  <div ref={containerRef} className={`relative overflow-hidden ${className || ''}`} style={{ touchAction: 'pan-y', width: '100%' }}
         onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
      {/* Action rail behind content */}
  <div className="absolute inset-0 flex items-stretch justify-end select-none" style={{ opacity: railOpacity, transition: 'opacity 120ms ease-out', pointerEvents: 'none' }}>
        <div
          className="h-full bg-red-600 text-white font-semibold flex items-center justify-center"
          style={{
            width: committing ? '100%' : `${revealedPx}px`,
            borderTopRightRadius: '0.5rem',
            borderBottomRightRadius: '0.5rem',
            transition: committing ? 'width 160ms ease-out' : undefined,
          }}
        >
          <span
            style={{
              opacity: committing || revealedPx >= actionWidth ? 1 : 0,
              transition: 'opacity 140ms ease-out',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
            }}
            aria-hidden={!(committing || revealedPx >= actionWidth)}
          >
            {label}
          </span>
        </div>
      </div>
      {/* Sliding content */}
      <div
        className={`relative will-change-transform ${anim ? 'transition-transform duration-150 ease-out' : ''}`}
        ref={contentRef}
        style={{ transform: `translateX(${dx}px)` }}
      >
        {children}
      </div>
    </div>
  );
};
