import { addDays, vietnamDate, weekLabel, weekStart } from "../../shared/time";
import { Field } from "./common";

type WeekPickerProps = {
  value: string;
  onChange: (week: string) => void;
  availableWeeks?: string[];
  label?: string;
  disabled?: boolean;
};

export default function WeekPicker({
  value,
  onChange,
  availableWeeks = [],
  label = "Tuần",
  disabled = false,
}: WeekPickerProps) {
  const current = weekStart(vietnamDate());
  const selected = weekStart(value);
  const weeks = [
    ...new Set([
      ...availableWeeks.map(weekStart),
      selected,
      current,
      addDays(selected, -7),
      addDays(selected, 7),
      addDays(current, -7),
      addDays(current, 7),
    ]),
  ].sort();
  return (
    <div>
      <div className="form-row">
        <button
          className="secondary"
          disabled={disabled}
          onClick={() => onChange(addDays(selected, -7))}
        >
          Tuần trước
        </button>
        <Field label={label}>
          <select
            aria-label={label}
            value={selected}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
          >
            {weeks.map((week) => (
              <option key={week} value={week}>
                {weekLabel(week)}
              </option>
            ))}
          </select>
        </Field>
        <button
          className="secondary"
          disabled={disabled}
          onClick={() => onChange(current)}
        >
          Tuần hiện tại
        </button>
        <button
          className="secondary"
          disabled={disabled}
          onClick={() => onChange(addDays(selected, 7))}
        >
          Tuần kế tiếp
        </button>
      </div>
      <p className="muted" aria-live="polite">
        {weekLabel(selected)}
      </p>
    </div>
  );
}
