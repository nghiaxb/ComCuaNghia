import { useEffect, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
  AlertDialogFooter,
} from "../components/ui/alert-dialog";
import { Input } from "../components/ui/input";
type Action = (reason: string) => unknown | Promise<unknown>;
type Decision = {
  message: string;
  reason: boolean;
  subject: string;
  action?: Action;
};
export function useDecision(subject = "") {
  const [pending, setPending] = useState<Decision | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const running = useRef(false);
  const currentSubject = useRef(subject);
  currentSubject.current = subject;
  const resolve = useRef<((value: string | null) => void) | null>(null);
  const previous = useRef<Element | null>(null);
  useEffect(() => {
    resolve.current?.(null);
    resolve.current = null;
    setPending(null);
    return () => {
      resolve.current?.(null);
      resolve.current = null;
    };
  }, [subject]);
  const finish = (value: string | null) => {
    const done = resolve.current;
    resolve.current = null;
    setPending(null);
    done?.(value);
  };
  const ask = (message: string, needsReason: boolean, action?: Action) =>
    new Promise<string | null>((done) => {
      if (resolve.current || running.current) {
        done(null);
        return;
      }
      previous.current = document.activeElement;
      resolve.current = done;
      setReason("");
      setError("");
      setPending({ message, reason: needsReason, subject, action });
    });
  const execute = async () => {
    if (!pending || running.current) return;
    if (pending.subject !== currentSubject.current) {
      finish(null);
      return;
    }
    const value = pending.reason ? reason.trim() : "confirmed";
    if (!value) return;
    if (!pending.action) {
      finish(value);
      return;
    }
    running.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await pending.action(value);
      if (result === null || result === false)
        throw new Error(
          "Thao tác chưa thành công. Kiểm tra thông báo lỗi và thử lại.",
        );
      finish(value);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Không thể thực hiện thao tác. Vui lòng thử lại.",
      );
    } finally {
      running.current = false;
      setBusy(false);
    }
  };
  const dialog = (
    <AlertDialog
      open={!!pending}
      onOpenChange={(open) => {
        if (!open && !running.current) finish(null);
      }}
    >
      {pending && (
        <AlertDialogContent
          onEscapeKeyDown={(event) => {
            if (running.current) event.preventDefault();
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
          <AlertDialogTitle>{pending.message}</AlertDialogTitle>
          <AlertDialogDescription>
            Kiểm tra nội dung trước khi xác nhận.
          </AlertDialogDescription>
          {pending.reason && (
            <label className="field">
              <span>Lý do</span>
              <Input
                aria-label="Lý do"
                autoFocus
                disabled={busy}
                maxLength={500}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
          )}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={busy}
              onClick={(event) => {
                event.preventDefault();
                if (!running.current) finish(null);
              }}
            >
              Quay lại
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={busy || (pending.reason && !reason.trim())}
              onClick={(event) => {
                event.preventDefault();
                void execute();
              }}
            >
              {busy ? "Đang xử lý…" : "Xác nhận"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      )}
    </AlertDialog>
  );
  return {
    confirm: async (message: string, action?: Action) =>
      !!(await ask(message, false, action)),
    prompt: (message: string, action?: Action) => ask(message, true, action),
    dialog,
  };
}
