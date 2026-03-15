"use client";

import { useRef, useState, useCallback, useEffect, type ReactNode } from "react";

interface SwipeAction {
  label: string;
  color: string; // tailwind bg class or hex
  onAction: () => void;
  direction: "left" | "right";
}

interface SwipeToActionProps {
  children: ReactNode;
  leftAction?: SwipeAction;
  rightAction?: SwipeAction;
}

/**
 * Wraps a list item. Supports swipe left (reveals right-side action)
 * and swipe right (reveals left-side action).
 * Used for delete (swipe left) and delegate (swipe right).
 */
export function SwipeToAction({ children, leftAction, rightAction }: SwipeToActionProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);
  const [offset, setOffset] = useState(0);
  const [revealedDir, setRevealedDir] = useState<"left" | "right" | null>(null);
  const dragging = useRef(false);
  const hasDragged = useRef(false);

  const BUTTON_WIDTH = 90;
  const THRESHOLD = 40;
  const DRAG_DEAD_ZONE = 5;

  const startDrag = useCallback((clientX: number) => {
    startXRef.current = clientX;
    currentXRef.current = 0;
    dragging.current = true;
    hasDragged.current = false;
  }, []);

  const moveDrag = useCallback((clientX: number) => {
    if (!dragging.current) return;
    const dx = clientX - startXRef.current;
    currentXRef.current = dx;

    if (Math.abs(dx) > DRAG_DEAD_ZONE) {
      hasDragged.current = true;
    }

    if (revealedDir === "left" && leftAction) {
      // Currently showing left action (swiped right), dragging back
      const newOffset = Math.max(0, Math.min(BUTTON_WIDTH, BUTTON_WIDTH + dx));
      setOffset(newOffset);
    } else if (revealedDir === "right" && rightAction) {
      // Currently showing right action (swiped left), dragging back
      const newOffset = Math.min(0, Math.max(-BUTTON_WIDTH, -BUTTON_WIDTH + dx));
      setOffset(newOffset);
    } else {
      // No reveal — free dragging
      let newOffset = dx;
      if (!rightAction && newOffset < 0) newOffset = 0;
      if (!leftAction && newOffset > 0) newOffset = 0;
      newOffset = Math.max(-BUTTON_WIDTH, Math.min(BUTTON_WIDTH, newOffset));
      setOffset(newOffset);
    }
  }, [revealedDir, leftAction, rightAction]);

  const endDrag = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;

    if (revealedDir) {
      // Snap back or keep revealed
      if (revealedDir === "left") {
        if (currentXRef.current < -THRESHOLD) {
          setOffset(0);
          setRevealedDir(null);
        } else {
          setOffset(BUTTON_WIDTH);
        }
      } else {
        if (currentXRef.current > THRESHOLD) {
          setOffset(0);
          setRevealedDir(null);
        } else {
          setOffset(-BUTTON_WIDTH);
        }
      }
    } else {
      if (currentXRef.current > THRESHOLD && leftAction) {
        setOffset(BUTTON_WIDTH);
        setRevealedDir("left");
      } else if (currentXRef.current < -THRESHOLD && rightAction) {
        setOffset(-BUTTON_WIDTH);
        setRevealedDir("right");
      } else {
        setOffset(0);
      }
    }
  }, [revealedDir, leftAction, rightAction]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startDrag(e.touches[0].clientX);
  }, [startDrag]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    moveDrag(e.touches[0].clientX);
  }, [moveDrag]);

  const handleTouchEnd = useCallback(() => {
    endDrag();
  }, [endDrag]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    startDrag(e.clientX);
  }, [startDrag]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      moveDrag(e.clientX);
    };
    const handleMouseUp = () => {
      if (!dragging.current) return;
      endDrag();
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [moveDrag, endDrag]);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const handleClick = (e: MouseEvent) => {
      if (hasDragged.current) {
        e.stopPropagation();
        e.preventDefault();
        hasDragged.current = false;
      }
    };
    el.addEventListener("click", handleClick, true);
    return () => el.removeEventListener("click", handleClick, true);
  }, []);

  const handleAction = useCallback((action: SwipeAction) => {
    setOffset(0);
    setRevealedDir(null);
    action.onAction();
  }, []);

  return (
    <div className="relative overflow-hidden">
      {/* Left action (revealed when swiping right) */}
      {leftAction && (
        <div
          className="absolute inset-y-0 left-0 flex items-center justify-center text-white font-bold text-sm"
          style={{ width: BUTTON_WIDTH, backgroundColor: leftAction.color }}
        >
          <button
            onClick={() => handleAction(leftAction)}
            className="w-full h-full flex items-center justify-center gap-1.5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            {leftAction.label}
          </button>
        </div>
      )}

      {/* Right action (revealed when swiping left) */}
      {rightAction && (
        <div
          className="absolute inset-y-0 right-0 flex items-center justify-center text-white font-bold text-sm"
          style={{ width: BUTTON_WIDTH, backgroundColor: rightAction.color }}
        >
          <button
            onClick={() => handleAction(rightAction)}
            className="w-full h-full flex items-center justify-center"
          >
            {rightAction.label}
          </button>
        </div>
      )}

      {/* Sliding content */}
      <div
        ref={contentRef}
        className="relative bg-white transition-transform duration-150 ease-out select-none"
        style={{
          transform: `translateX(${offset}px)`,
          transitionDuration: dragging.current ? "0ms" : "150ms",
          cursor: "grab",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
      >
        {children}
      </div>
    </div>
  );
}
