import { useCallback, useState } from "react";
import Button from "../components/ui/ActionButton";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../components/ui/table";
import SharedOrderOverview from "./SharedOrderOverview";
import BillSummary, { dayBill } from "./BillSummary";
import BillEditor, { type BillDraft } from "./BillEditor";
import { useDecision } from "./useDecision";
import { Empty, type PageProps } from "./common";
import { weekStart } from "../../shared/time";

export default function DailyWorkspace({
  data,
  dayId,
  mutate,
  busy,
  readOnly,
  guard,
}: PageProps & { dayId: string; guard?: (action: () => void) => void }) {
  const [copyError, setCopyError] = useState("");
  const [drafts, setDrafts] = useState<Record<string, BillDraft>>({});
  const [acknowledgements, setAcknowledgements] = useState<
    Record<string, number>
  >({});
  const keepDraft = useCallback(
    (draft: BillDraft) => setDrafts((old) => ({ ...old, [dayId]: draft })),
    [dayId],
  );
  const acknowledgeDraft = useCallback(
    (version: number) => {
      setAcknowledgements((old) => ({ ...old, [dayId]: version }));
      setDrafts((old) =>
        old[dayId]
          ? { ...old, [dayId]: { ...old[dayId], baseVersion: version } }
          : old,
      );
    },
    [dayId],
  );
  const { prompt, dialog } = useDecision(dayId);
  const day = data.days.find((day) => day.id === dayId);
  const orders = data.orders.filter(
    (order) => order.day_id === dayId && order.status === "active",
  );
  const groups = new Map<
    string,
    { name: string; note: string; quantity: number }
  >();
  for (const order of orders)
    for (const item of order.items) {
      const key = JSON.stringify([item.name, item.note.trim()]);
      groups.set(key, {
        name: item.name,
        note: item.note.trim(),
        quantity: (groups.get(key)?.quantity ?? 0) + item.quantity,
      });
    }
  const count = [...groups.values()].reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  const settled =
    !!day && (data.settledWeeks?.includes(weekStart(day.date)) ?? false);
  if (!day) return null;
  const bill = dayBill(data, dayId);
  const lock = () => {
    // The draft guard can open another dialog before this decision.
    // Keep the initiating control rather than that dialog's discard button.
    const returnFocus = document.activeElement;
    const action = () => {
      void prompt(
        day.locked ? "Lý do mở khóa" : "Lý do khóa ngày",
        (reason) =>
          mutate(
            "day.lock",
            { dayId: day.id, locked: !day.locked, reason },
            day.version,
          ),
        returnFocus,
      );
    };
    if (guard) guard(action);
    else action();
  };
  return (
    <section className="daily-workspace mt-6" aria-label="Điều phối trong ngày">
      {dialog}
      <div className="col-span-full flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2>Đơn & bill trong ngày</h2>
          <p className="fine">
            {day.date} ·{" "}
            {settled ? "Đã quyết toán" : day.locked ? "Đã khóa" : "Đang mở"}
          </p>
        </div>
        {data.member.role !== "employee" && (
          <Button
            variant={day.locked ? "secondary" : "primary"}
            disabled={busy || readOnly || settled}
            onClick={lock}
          >
            {day.locked ? "Mở khóa ngày" : "Khóa ngày đặt cơm"}
          </Button>
        )}
      </div>
      <div className="daily-main min-w-0">
        <SharedOrderOverview data={data} dayId={dayId} compact />
        <section className="panel" aria-label="Đơn gửi quán">
          <div className="section-title">
            <div>
              <h2>Đơn gửi quán</h2>
              <p className="fine">
                {count} suất · {orders.length} người đã đặt
              </p>
            </div>
            <Button
              variant="secondary"
              disabled={!orders.length || busy}
              onClick={() => {
                setCopyError("");
                void (async () => {
                  await navigator.clipboard.writeText(
                    [...groups.values()]
                      .map(
                        (item) =>
                          `${item.name} ×${item.quantity}${item.note ? " — " + item.note : ""}`,
                      )
                      .join("\n") + `\nTổng: ${count} suất`,
                  );
                  if (!readOnly)
                    await mutate("audit.export", {
                      type: "supplier-summary",
                      dayId,
                    });
                })().catch(() =>
                  setCopyError("Không sao chép được đơn. Vui lòng thử lại."),
                );
              }}
            >
              Sao chép đơn
            </Button>
          </div>
          {copyError && (
            <p role="alert" className="error">
              {copyError}
            </p>
          )}
          {!orders.length ? (
            <Empty />
          ) : (
            <div className="table-wrap">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Món ăn</TableHead>
                    <TableHead>Ghi chú</TableHead>
                    <TableHead>Số suất</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...groups.values()].map((item) => (
                    <TableRow key={JSON.stringify([item.name, item.note])}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.note || "Bình thường"}</TableCell>
                      <TableCell>
                        <b>{item.quantity}</b>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>
      </div>
      <aside className="daily-bill min-w-0" aria-label="Bill và thao tác ngày">
        <BillSummary bill={bill} />
        <BillEditor
          key={dayId}
          data={data}
          bill={bill}
          mutate={mutate}
          busy={busy}
          readOnly={readOnly}
          initialDraft={drafts[dayId]}
          onDraftChange={keepDraft}
          onSaveAcknowledged={acknowledgeDraft}
          acknowledgedVersion={acknowledgements[dayId]}
        />
      </aside>
    </section>
  );
}
