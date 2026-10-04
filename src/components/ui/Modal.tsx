import { useRef, type ReactNode } from "react";
import { Dialog as Root, DialogContent, DialogTitle } from "./dialog";
export default function Dialog({
  title,
  children,
  busy,
  onClose,
}: {
  title: string;
  children: ReactNode;
  busy: boolean;
  onClose: () => void;
}) {
  const previous = useRef(document.activeElement);
  return (
    <Root
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent
        className="confirm-dialog max-h-[85dvh] overflow-y-auto"
        showCloseButton={false}
        aria-describedby={undefined}
        onEscapeKeyDown={(event) => {
          if (busy) event.preventDefault();
        }}
        onInteractOutside={(event) => event.preventDefault()}
        onOpenAutoFocus={(event) => {
          const target =
            event.currentTarget instanceof HTMLElement
              ? event.currentTarget.querySelector<HTMLElement>("[autofocus]")
              : null;
          if (target) {
            event.preventDefault();
            target.focus();
          }
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          if (
            previous.current instanceof HTMLElement &&
            previous.current.isConnected
          )
            previous.current.focus();
        }}
      >
        <DialogTitle>{title}</DialogTitle>
        {children}
      </DialogContent>
    </Root>
  );
}
