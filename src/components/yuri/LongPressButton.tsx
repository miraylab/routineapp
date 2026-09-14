import { forwardRef, type ButtonHTMLAttributes } from "react";

import { useLongPress } from "@/lib/useLongPress";

export const LongPressButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & {
    onLongPress?: () => void;
  }
>(({ onLongPress, onClick, ...props }, ref) => {
  const { longPressProps, shouldSuppressClick } = useLongPress(() => onLongPress?.());

  return (
    <button
      ref={ref}
      type="button"
      {...(onLongPress ? longPressProps : {})}
      {...props}
      onClick={(event) => {
        if (shouldSuppressClick()) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
    />
  );
});

LongPressButton.displayName = "LongPressButton";
