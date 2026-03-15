"use client";

import { useRef, useState, useCallback, useEffect, type ReactNode } from "react";

interface SwipeToDeleteProps {
  children: ReactNode;
  onDelete: () => void;
  label?: string;
}

/**
 * Wraps a list item. Swiping/dragging left reveals a red "Delete" button.
 * Works on both touch (mobile) and mouse (desktop).
 */
export function SwipeToDelete({ children, onDelete, label = "Delete" }: SwipeToDeleteProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);
  const [offset, setOffset] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const dragging = useRef(false);
  const hasDragged = useRef(false);

  const BUTTON_WIDTH = 80;
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

    if (revealed) {
      const newOffset = Math.min(0, Math.max(-BUTTON_WIDTH, -BUTTON_WIDTH + dx));
      setOffset(newOffset);
    } else {
      const newOffset = Math.min(0, Math.max(-BUTTON_WIDTH, dx));
      setOffset(newOffset);
    }
  }, [revealed]);

  const endDrag = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;
    if (revealed) {
      if (currentXRef.current > THRESHOLD) {
        setOffset(0);
        setRevealed(false);
      } else {
        setOffset(-BUTTON_WIDTH);
      }
    } else {
      if (currentXRef.current < -THRESHOLD) {
        setOffset(-BUTTON_WIDTH);
        setRevealed(true);
      } else {
        setOffset(0);
      }
    }
  }, [revealed]);

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startDrag(e.touches[0].clientX);
  }, [startDrag]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    moveDrag(e.touches[0].clientX);
  }, [moveDrag]);

  const handleTouchEnd = useCallback(() => {
    endDrag();
  }, [endDrag]);

  // Mouse handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    startDrag(e.clientX);
  }, [startDrag]);

  // Use window-level listeners for mouse move/up so dragging works even if cursor leaves the element
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

  // Prevent child clicks when user was dragging (not clicking)
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

  const handleDelete = useCallback(() => {
    setOffset(0);
    setRevealed(false);
    onDelete();
  }, [onDelete]);

  return (
    <div className="relative overflow-hidden" ref={containerRef}>
      {/* Red delete button behind */}
      <div
        className="absolute inset-y-0 right-0 flex items-center justify-center bg-red-600 text-white font-bold text-sm"
        style={{ width: BUTTON_WIDTH }}
      >
        <button
          onClick={handleDelete}
          className="w-full h-full flex items-center justify-center"
        >
          {label}
        </button>
      </div>

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
