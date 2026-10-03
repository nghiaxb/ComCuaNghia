import Button from "../components/ui/Button";
import ConfirmDialog from "./ConfirmDialog";
import ImageUpload from "./ImageUpload";
import WeekPicker from "./WeekPicker";
import { useState } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";
import type { PageProps } from "./common";
import type { Day } from "../../shared/contracts";
import { Field, vnd } from "./common";
import {
  addDays,
  defaultMenuWeek,
  weekLabel,
  weekStart,
} from "../../shared/time";
import { ocr } from "../lib/api";
export default function Menus({ data, mutate, busy, readOnly }: PageProps) {
  const [week, setWeek] = useState(defaultMenuWeek());
  const [draftId, setDraftId] = useState<string | null>(null);
  const [draftVersion, setDraftVersion] = useState(0);
  const [sourceVersions, setSourceVersions] = useState<Record<string, number>>(
    {},
  );
  const [notify, setNotify] = useState(true);
  const [clearExistingOrders, setClearExistingOrders] = useState(false);
  const [draft, setDraft] = useState<
    {
      date: string;
      sourceVersion?: number;
      foods: { id?: string; name: string; unitPrice: number }[];
    }[]
  >([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [removing, setRemoving] = useState<Day | null>(null);
  const [reason, setReason] = useState("");
  const published = data.days
    .filter(
      (day) =>
        weekStart(day.date) === week &&
        data.foods.some((food) => food.day_id === day.id && food.active),
    )
    .sort((a, b) => a.date.localeCompare(b.date));
  const availableWeeks = [
    ...data.days.map((day) => weekStart(day.date)),
    ...data.drafts.map((draft) => draft.week_start),
  ];
  const weekDayIds = new Set(
    data.days
      .filter((day) => weekStart(day.date) === week)
      .map((day) => day.id),
  );
  const affectedOrders = data.orders.filter(
    (order) => order.status === "active" && weekDayIds.has(order.day_id),
  ).length;
  const modifiesPublished = data.days.some((day) =>
    draft.some((draftDay) => draftDay.date === day.date),
  );
  const dateLabel = (date: string) =>
    new Date(date + "T12:00:00+07:00").toLocaleDateString("vi-VN", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "Asia/Ho_Chi_Minh",
    });
  const clearDraft = () => {
    setDraft([]);
    setDraftId(null);
    setDraftVersion(0);
    setSourceVersions({});
    setClearExistingOrders(false);
  };

  async function upload(file?: File) {
    if (!file) return;
    if (
      file.size > 10 * 1024 * 1024 ||
      !["image/png", "image/jpeg", "image/webp"].includes(file.type)
    ) {
      setError("Chọn ảnh PNG, JPEG hoặc WebP dưới 10 MB.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const image = await createImageBitmap(file);
      if (image.width * image.height > 25000000)
        throw Error("Ảnh vượt 25 megapixel");
      image.close();
      const encoded = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result).split(",")[1]);
        r.onerror = reject;
        r.readAsDataURL(file);
      });
      const result = await ocr(
        encoded,
        file.type,
        week,
        data.settings.data.defaultPrice,
      );
      setClearExistingOrders(false);
      setSourceVersions({});
      setDraft(result.days);
      setDraftId(result.draftId);
      setDraftVersion(result.version);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không đọc được ảnh");
    } finally {
      setLoading(false);
    }
  }
  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">CHUẨN BỊ TUẦN MỚI</p>
          <h1>Quản lý menu</h1>
          <p>
            Xem, sửa hoặc xoá menu từng ngày. Nhập từ ảnh hoặc nhập tay bên
            dưới.
          </p>
        </div>
      </div>
      <section className="panel">
        <WeekPicker
          label="Tuần menu"
          value={week}
          availableWeeks={availableWeeks}
          disabled={loading || busy}
          onChange={(selectedWeek) => {
            if (loading) return;
            setWeek(selectedWeek);
            setRemoving(null);
            clearDraft();
          }}
        />
      </section>
      <section className="panel" aria-label="Menu đã công bố">
        <h2>Menu đã công bố</h2>
        <p className="muted">
          Chọn Sửa để đổi món hoặc giá. Xoá menu sẽ huỷ các đơn đang mở của ngày
          đó; lịch sử vẫn được giữ.
        </p>
        {!published.length && <p>Tuần này chưa có menu đã công bố.</p>}
        {published.map((day) => (
          <article className="menu-day" key={day.id}>
            <h3>
              {dateLabel(day.date)}{" "}
              {day.locked && <span className="tag">Đã khoá</span>}
            </h3>
            <ul>
              {data.foods
                .filter((food) => food.day_id === day.id && food.active)
                .map((food) => (
                  <li key={food.id}>
                    {food.name} · {vnd(food.unit_price)}
                  </li>
                ))}
            </ul>
            <div className="form-row">
              <Button
                className="secondary"
                disabled={busy || readOnly || loading || day.locked}
                onClick={() => {
                  setClearExistingOrders(false);
                  setDraftId(null);
                  setDraftVersion(0);
                  setSourceVersions({ [day.date]: day.version });
                  setDraft([
                    {
                      date: day.date,
                      foods: data.foods
                        .filter((food) => food.day_id === day.id && food.active)
                        .map((food) => ({
                          id: food.id,
                          name: food.name,
                          unitPrice: food.unit_price,
                        })),
                    },
                  ]);
                  requestAnimationFrame(() =>
                    document
                      .getElementById("menu-editor")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" }),
                  );
                }}
              >
                <Pencil size={15} /> Sửa menu ngày này
              </Button>
              <Button
                className="secondary"
                disabled={busy || readOnly || loading || day.locked}
                onClick={() => {
                  setRemoving(day);
                  setReason("");
                }}
              >
                <Trash2 size={15} /> Xoá menu ngày này
              </Button>
            </div>
          </article>
        ))}
        {removing && (
          <ConfirmDialog busy={busy} onClose={() => setRemoving(null)}>
            <h3>Gỡ menu {dateLabel(removing.date)}?</h3>
            <p>
              {
                data.orders.filter(
                  (order) =>
                    order.day_id === removing.id && order.status === "active",
                ).length
              }{" "}
              đơn đang mở của ngày này sẽ bị huỷ. Lịch sử đặt món vẫn được giữ;
              thay đổi được ghi nhật ký và thông báo Google Chat.
            </p>
            <Field label="Lý do gỡ menu">
              <input
                autoFocus
                value={reason}
                maxLength={500}
                disabled={busy}
                onChange={(e) => setReason(e.target.value)}
              />
            </Field>
            <Button
              className="secondary"
              disabled={busy}
              onClick={() => setRemoving(null)}
            >
              Quay lại
            </Button>
            <Button
              className="primary danger"
              disabled={busy || readOnly || !reason.trim()}
              onClick={() => {
                void (async () => {
                  const result = await mutate(
                    "menu.withdraw",
                    {
                      dayId: removing.id,
                      reason: reason.trim(),
                      cancelExistingOrders: true,
                    },
                    removing.version,
                  );
                  if (result) setRemoving(null);
                })();
              }}
            >
              Xác nhận gỡ menu
            </Button>
          </ConfirmDialog>
        )}
      </section>
      <section className="panel">
        <h2>Bản nháp đã lưu</h2>
        {data.drafts.length ? (
          data.drafts.map((d) => (
            <div className="form-row" key={d.id}>
              <Button
                className="secondary"
                disabled={loading || busy}
                onClick={() => {
                  setClearExistingOrders(false);
                  setSourceVersions(
                    Object.fromEntries(
                      d.days
                        .filter((day) => day.sourceVersion !== undefined)
                        .map((day) => [day.date, day.sourceVersion!]),
                    ),
                  );
                  setWeek(d.week_start);
                  setDraft(d.days);
                  setDraftId(d.id);
                  setDraftVersion(d.version);
                }}
              >
                Mở bản nháp tuần {weekLabel(d.week_start)}
              </Button>
              <Button
                className="secondary"
                disabled={busy || readOnly}
                onClick={() => {
                  void (async () => {
                    if (
                      !window.confirm(
                        `Xoá bản nháp tuần ${d.week_start}? Menu đã công bố và đơn cơm vẫn được giữ.`,
                      )
                    )
                      return;
                    const result = await mutate(
                      "menu.draft.delete",
                      { id: d.id },
                      d.version,
                    );
                    if (result && draftId === d.id) clearDraft();
                  })();
                }}
              >
                <Trash2 size={15} /> Xoá bản nháp
              </Button>
            </div>
          ))
        ) : (
          <p className="muted">Chưa có bản nháp đã lưu.</p>
        )}
      </section>
      <div className="panel">
        <ImageUpload disabled={readOnly || loading || busy} onImage={upload} />
        {loading && <p role="status">Đang đọc menu…</p>}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <Button
          className="text-button"
          disabled={readOnly || loading || busy}
          onClick={() => {
            setClearExistingOrders(false);
            setSourceVersions({});
            setDraftId(null);
            setDraftVersion(0);
            setDraft(
              Array.from({ length: 5 }, (_, i) => ({
                date: addDays(week, i),
                foods: [
                  { name: "", unitPrice: data.settings.data.defaultPrice },
                ],
              })),
            );
          }}
        >
          Hoặc nhập menu thủ công
        </Button>
      </div>
      {draft.map((d, di) => (
        <section
          className="panel"
          id={di === 0 ? "menu-editor" : undefined}
          key={d.date}
        >
          <h2>{dateLabel(d.date)}</h2>
          {d.foods.map((f, fi) => (
            <div className="form-row" key={fi}>
              <Field label="Tên món">
                <input
                  value={f.name}
                  maxLength={200}
                  onChange={(e) =>
                    setDraft((old) =>
                      old.map((x, j) =>
                        j === di
                          ? {
                              ...x,
                              foods: x.foods.map((y, k) =>
                                k === fi ? { ...y, name: e.target.value } : y,
                              ),
                            }
                          : x,
                      ),
                    )
                  }
                />
              </Field>
              <Field label="Giá / suất">
                <input
                  type="number"
                  min="0"
                  value={f.unitPrice}
                  onChange={(e) =>
                    setDraft((old) =>
                      old.map((x, j) =>
                        j === di
                          ? {
                              ...x,
                              foods: x.foods.map((y, k) =>
                                k === fi
                                  ? { ...y, unitPrice: Number(e.target.value) }
                                  : y,
                              ),
                            }
                          : x,
                      ),
                    )
                  }
                />
              </Field>
              <Button
                className="icon-button"
                aria-label="Xoá món"
                disabled={busy || readOnly}
                onClick={() =>
                  setDraft((old) =>
                    old.map((day, index) =>
                      index === di
                        ? {
                            ...day,
                            foods: day.foods.filter((_, index) => index !== fi),
                          }
                        : day,
                    ),
                  )
                }
              >
                <Trash2 size={18} />
              </Button>
            </div>
          ))}
          {!d.foods.length && (
            <p className="muted">
              Ngày này chưa có món. Thêm món trước khi công bố; để gỡ menu đã
              công bố, dùng nút Xoá menu ngày này ở trên.
            </p>
          )}
          <Button
            className="text-button"
            onClick={() =>
              setDraft((old) =>
                old.map((x, j) =>
                  j === di
                    ? {
                        ...x,
                        foods: [
                          ...x.foods,
                          {
                            name: "",
                            unitPrice: data.settings.data.defaultPrice,
                          },
                        ],
                      }
                    : x,
                ),
              )
            }
          >
            <Plus size={14} /> Thêm món
          </Button>
        </section>
      ))}
      {!!draft.length && (
        <section className="panel">
          <Button className="text-button" disabled={busy} onClick={clearDraft}>
            Bỏ bản nháp đang sửa
          </Button>
          <Button
            className="secondary"
            disabled={busy || readOnly}
            onClick={() => {
              void (async () => {
                const result = await mutate(
                  "menu.draft.save",
                  {
                    weekStart: week,
                    days: draft.map((day) => ({
                      ...day,
                      ...(sourceVersions[day.date] !== undefined
                        ? { sourceVersion: sourceVersions[day.date] }
                        : {}),
                    })),
                    ...(draftId ? { id: draftId } : {}),
                  },
                  draftVersion,
                );
                if (result) {
                  setDraftId(String(result.id));
                  setDraftVersion(Number(result.version));
                }
              })();
            }}
          >
            Lưu bản nháp
          </Button>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={modifiesPublished || notify}
              disabled={modifiesPublished || busy || readOnly}
              onChange={(e) => setNotify(e.target.checked)}
            />{" "}
            Thông báo Google Chat
          </label>
          <p className="fine">
            {modifiesPublished
              ? "Mọi thay đổi menu đã công bố đều thông báo Google Chat."
              : "Khi công bố lần đầu, thông báo cơm thứ Hai theo lựa chọn ở đây."}
          </p>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={clearExistingOrders}
              disabled={busy || readOnly}
              onChange={(e) => setClearExistingOrders(e.target.checked)}
            />{" "}
            Xóa các đơn đã đặt trong tuần này
          </label>
          <p className="fine">
            {clearExistingOrders
              ? `${affectedOrders} đơn đang hoạt động trong toàn tuần ${weekLabel(week)} sẽ bị xóa khi công bố, kể cả ngày không có trong bản nháp.`
              : "Không xoá toàn bộ đơn. Đổi tên/bỏ món sẽ huỷ phần đặt liên quan; đổi giá sẽ cập nhật giá cho đơn đang mở."}
          </p>
          <Button
            className="primary"
            disabled={
              busy ||
              readOnly ||
              loading ||
              draft.some(
                (d) =>
                  !d.foods.length ||
                  d.foods.some(
                    (f) =>
                      !f.name.trim() ||
                      !Number.isSafeInteger(f.unitPrice) ||
                      f.unitPrice < 0,
                  ),
              )
            }
            onClick={() => {
              void (async () => {
                if (
                  clearExistingOrders &&
                  !window.confirm(
                    `Công bố menu và xóa ${affectedOrders} đơn đang hoạt động trong toàn tuần ${weekLabel(week)}?`,
                  )
                )
                  return;
                const result = await mutate("menu.publish", {
                  weekStart: week,
                  clearExistingOrders,
                  days: draft,
                  notifyChat: modifiesPublished || notify,
                  expectedDayVersions: sourceVersions,
                });
                if (result) clearDraft();
              })();
            }}
          >
            Công bố menu
          </Button>
        </section>
      )}
    </>
  );
}
