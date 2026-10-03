import ImageUpload from "./ImageUpload";
import { useState } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";
import type { PageProps } from "./common";
import type { Day } from "../../shared/contracts";
import { Field, vnd } from "./common";
import { addDays, weekStart, vietnamDate } from "../../shared/time";
import { ocr } from "../lib/api";
export default function Menus({ data, mutate, busy, readOnly }: PageProps) {
  const [week, setWeek] = useState(weekStart(vietnamDate()));
  const [draftId, setDraftId] = useState<string | null>(null);
  const [draftVersion, setDraftVersion] = useState(0);
  const [sourceVersions, setSourceVersions] = useState<Record<string, number>>(
    {},
  );
  const [notify, setNotify] = useState(true);
  const [draft, setDraft] = useState<
    { date: string; foods: { name: string; unitPrice: number }[] }[]
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
        <Field label="Tuần bắt đầu (thứ Hai)">
          <input
            type="date"
            value={week}
            onChange={(e) => {
              if (!e.target.value) return;
              setSourceVersions({});
              setWeek(weekStart(e.target.value));
              setRemoving(null);
              setDraft([]);
              setDraftId(null);
              setDraftVersion(0);
            }}
          />
        </Field>
      </section>
      <section className="panel" aria-label="Menu đã công bố">
        <h2>Menu đã công bố</h2>
        <p className="muted">
          Chọn Sửa để đổi món hoặc giá. Xoá menu sẽ gỡ món khỏi danh sách đặt,
          giữ nguyên các đơn đã đặt.
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
              <button
                className="secondary"
                disabled={busy || readOnly || day.locked}
                onClick={() => {
                  setDraftId(null);
                  setDraftVersion(0);
                  setSourceVersions({ [day.date]: day.version });
                  setDraft([
                    {
                      date: day.date,
                      foods: data.foods
                        .filter((food) => food.day_id === day.id && food.active)
                        .map((food) => ({
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
              </button>
              <button
                className="secondary"
                disabled={busy || readOnly || day.locked}
                onClick={() => {
                  setRemoving(day);
                  setReason("");
                }}
              >
                <Trash2 size={15} /> Xoá menu ngày này
              </button>
            </div>
          </article>
        ))}
        {removing && (
          <div className="notice" role="group" aria-label="Xác nhận xoá menu">
            <h3>Gỡ menu {dateLabel(removing.date)}?</h3>
            <p>
              Các đơn đã đặt và thông tin tính tiền được giữ nguyên. Thao tác có
              nhật ký và thông báo Google Chat theo cấu hình.
            </p>
            <Field label="Lý do gỡ menu">
              <input
                value={reason}
                maxLength={500}
                disabled={busy}
                onChange={(e) => setReason(e.target.value)}
              />
            </Field>
            <button
              className="secondary"
              disabled={busy}
              onClick={() => setRemoving(null)}
            >
              Quay lại
            </button>
            <button
              className="primary"
              disabled={busy || readOnly || !reason.trim()}
              onClick={async () => {
                const result = await mutate(
                  "menu.withdraw",
                  { dayId: removing.id, reason: reason.trim() },
                  removing.version,
                );
                if (result) setRemoving(null);
              }}
            >
              Xác nhận gỡ menu
            </button>
          </div>
        )}
      </section>
      <section className="panel">
        <h2>Bản nháp đã lưu</h2>
        {data.drafts.length ? (
          data.drafts.map((d) => (
            <div className="form-row" key={d.id}>
              <button
                className="secondary"
                onClick={() => {
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
                Mở bản nháp tuần {d.week_start}
              </button>
              <button
                className="secondary"
                disabled={busy || readOnly}
                onClick={async () => {
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
                }}
              >
                <Trash2 size={15} /> Xoá bản nháp
              </button>
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
        <button
          className="text-button"
          disabled={readOnly}
          onClick={() => {
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
        </button>
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
              <button
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
              </button>
            </div>
          ))}
          {!d.foods.length && (
            <p className="muted">
              Ngày này chưa có món. Thêm món trước khi công bố; để gỡ menu đã
              công bố, dùng nút Xoá menu ngày này ở trên.
            </p>
          )}
          <button
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
          </button>
        </section>
      ))}
      {!!draft.length && (
        <section className="panel">
          <button className="text-button" disabled={busy} onClick={clearDraft}>
            Bỏ bản nháp đang sửa
          </button>
          <button
            className="secondary"
            disabled={busy || readOnly}
            onClick={async () => {
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
            }}
          >
            Lưu bản nháp
          </button>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={notify}
              onChange={(e) => setNotify(e.target.checked)}
            />{" "}
            Thông báo Google Chat
          </label>
          <p className="fine">
            Cơm thứ Hai chỉ thông báo khi bạn chọn ở đây. Menu mới không xóa đơn
            đã đặt.
          </p>
          <button
            className="primary"
            disabled={
              busy ||
              readOnly ||
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
            onClick={async () => {
              const result = await mutate("menu.publish", {
                days: draft,
                notifyChat: notify,
                expectedDayVersions: sourceVersions,
              });
              if (result) clearDraft();
            }}
          >
            Công bố menu
          </button>
        </section>
      )}
    </>
  );
}
