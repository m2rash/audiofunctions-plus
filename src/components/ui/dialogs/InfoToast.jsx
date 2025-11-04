import React, { useEffect, useState, useRef } from "react";

const InfoToast = ({ 
  message, 
  isVisible, 
  onClose, 
  timeout = 10000,
  position = "fixed", // "fixed" (default) or "cursor"
  cursorPosition = { x: 0, y: 0 }
}) => {
  const [shouldRender, setShouldRender] = useState(false);
  const [cursorStyles, setCursorStyles] = useState({});
  const toastRef = useRef(null);

  useEffect(() => {
    if (isVisible && message) {
      setShouldRender(true);
      console.log(timeout)
      // Auto-hide after specified timeout (default 10 seconds)
      const timer = setTimeout(() => {
        if (onClose) {
          onClose();
        }
      }, timeout);

      return () => clearTimeout(timer);
    } else {
      // Delay unmounting to allow exit animation
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [isVisible, message, onClose, timeout]);

  // Calculate cursor position immediately when position changes
  useEffect(() => {
    if (position === "cursor") {
      const { x, y } = cursorPosition;
      
      // Add offset to position tooltip above and to the right of cursor
      const offsetX = 15;
      const offsetY = -45;
      
      // Initial positioning (will be refined after mount)
      setCursorStyles({
        left: `${x + offsetX}px`,
        top: `${y + offsetY}px`,
        position: 'fixed',
        zIndex: 1000,
        pointerEvents: 'none'
      });
    } else {
      setCursorStyles({});
    }
  }, [position, cursorPosition]);

  // Refine position after toast is mounted to prevent off-screen positioning
  useEffect(() => {
    if (isVisible && position === "cursor" && toastRef.current && shouldRender) {
      const toast = toastRef.current;
      const { x, y } = cursorPosition;
      
      // Add offset to position tooltip above and to the right of cursor
      const offsetX = 15;
      const offsetY = -45;
      
      // Get viewport dimensions to prevent tooltip from going off-screen
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const toastRect = toast.getBoundingClientRect();
      
      let finalX = x + offsetX;
      let finalY = y + offsetY;
      
      // Adjust if toast would go off right edge
      if (finalX + toastRect.width > viewportWidth - 10) {
        finalX = x - toastRect.width - offsetX;
      }
      
      // Adjust if toast would go off top edge
      if (finalY < 10) {
        finalY = y + Math.abs(offsetY) + 10;
      }
      
      // Update styles with refined position
      setCursorStyles({
        left: `${finalX}px`,
        top: `${finalY}px`,
        position: 'fixed',
        zIndex: 1000,
        pointerEvents: 'none'
      });
    }
  }, [isVisible, position, cursorPosition, shouldRender]);

  if (!shouldRender) {
    return null;
  }

  // Define positioning classes based on position prop
  const positionClasses = position === "cursor" 
    ? "fixed z-[1000]" // High z-index for cursor positioning
    : "fixed top-24 right-4 z-40"; // Default top-right positioning

  // Merge cursor styles with default styles
  const finalStyles = position === "cursor" ? cursorStyles : {};

  return (
    <div
      ref={toastRef}
      className={`${positionClasses} max-w-sm transition-all duration-300 ease-in-out ${
        isVisible 
          ? "opacity-100 translate-y-0" 
          : "opacity-0 -translate-y-2"
      }`}
      style={finalStyles}
      aria-hidden="true"
      role="presentation"
    >
      <div className="bg-background border border-border rounded-lg shadow-lg p-4">
        <div className="text-sm text-txt whitespace-pre-line">
          {message}
        </div>
      </div>
    </div>
  );
};

export default InfoToast;