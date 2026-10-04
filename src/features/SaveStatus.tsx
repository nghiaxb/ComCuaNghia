import type { AutosaveState } from "../lib/order-autosave";
import Button from "../components/ui/ActionButton";
export default function SaveStatus({
  text,
  status,
  dirty,
  onRetry,
  retryDisabled,
}: {
  text: string;
  status: AutosaveState["status"];
  dirty: boolean;
  onRetry: () => void;
  retryDisabled: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-2">
      <p
        role="status"
        className={
          ["error", "uncertain", "conflict", "locked"].includes(status)
            ? "text-xs text-destructive"
            : "text-xs text-muted-foreground"
        }
      >
        {text}
        {dirty && status === "idle" ? " · Có bản nháp" : ""}
      </p>
      {status === "uncertain" && (
        <Button variant="secondary" disabled={retryDisabled} onClick={onRetry}>
          Thử lưu lại
        </Button>
      )}
    </div>
  );
}
