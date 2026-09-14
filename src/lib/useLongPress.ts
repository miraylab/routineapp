import { useRef, type MouseEvent, type PointerEvent } from "react";

export function useLongPress(onLongPress: () => void, delay = 560) {
  const timeoutRef = useRef<number | null>(null);
  const didLongPressRef = useRef(false);

  const clear = () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const start = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    didLongPressRef.current = false;
    clear();
    timeoutRef.current = window.setTimeout(() => {
      didLongPressRef.current = true;
      onLongPress();
    }, delay);
  };

  const shouldSuppressClick = () => {
    if (!didLongPressRef.current) return false;
    didLongPressRef.current = false;
    return true;
  };

  return {
    longPressProps: {
      onPointerDown: start,
      onPointerUp: clear,
      onPointerCancel: clear,
      onPointerLeave: clear,
      onContextMenu: (event: MouseEvent<HTMLElement>) => {
        event.preventDefault();
        clear();
        onLongPress();
      },
    },
    shouldSuppressClick,
  };
}
