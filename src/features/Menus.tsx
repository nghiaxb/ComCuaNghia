import ImageUpload from "./ImageUpload";
import { useState } from "react";
import { Plus } from "lucide-react";
import type { PageProps } from "./common";
import { Field } from "./common";
import { addDays, weekStart, vietnamDate } from "../../shared/time";
import { ocr } from "../lib/api";
export default function Menus({ data, mutate, busy, readOnly }: PageProps) {
  const [week, setWeek] = useState(weekStart(vietnamDate()));
  const [draftId, setDraftId] = useState<string | null>(null);
  const [draftVersion, setDraftVersion] = useState(0);
  const [notify, setNotify] = useState(true);
  const [draft, setDraft] = useState<
    { date: string; foods: { name: string; unitPrice: number }[] }[]
  >([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
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
          <p>Từ ảnh thực đơn đến bữa trưa, chỉ vài thao tác.</p>
        </div>
      </div>
      <section className="panel">
        <h2>Bản nháp đã lưu</h2>
        {data.drafts.length ? (
          data.drafts.map((d) => (
            <button
              className="secondary"
              key={d.id}
              onClick={() => {
                setWeek(d.week_start);
                setDraft(d.days);
                setDraftId(d.id);
                setDraftVersion(d.version);
              }}
            >
              Tuần {d.week_start} · v{d.version}
            </button>
          ))
        ) : (
          <p className="muted">Chưa có bản nháp đã lưu.</p>
        )}
      </section>
      <div className="panel">
        <Field label="Tuần bắt đầu (thứ Hai)">
          <input
            type="date"
            value={week}
            onChange={(e) => {
              setWeek(weekStart(e.target.value));
              setDraft([]);
              setDraftId(null);
              setDraftVersion(0);
            }}
          />
        </Field>
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
        <section className="panel" key={d.date}>
          <h2>{d.date}</h2>
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
            </div>
          ))}
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
          <button
            className="secondary"
            disabled={busy || readOnly}
            onClick={async () => {
              const result = await mutate(
                "menu.draft.save",
                {
                  weekStart: week,
                  days: draft,
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
              draft.some((d) =>
                d.foods.some(
                  (f) =>
                    !f.name.trim() ||
                    !Number.isSafeInteger(f.unitPrice) ||
                    f.unitPrice < 0,
                ),
              )
            }
            onClick={() =>
              void mutate("menu.publish", { days: draft, notifyChat: notify })
            }
          >
            Công bố menu
          </button>
        </section>
      )}
    </>
  );
}
