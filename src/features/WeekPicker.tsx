import { NativeSelect } from "../components/ui/native-select";
import Button from "../components/ui/ActionButton";
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
    <div className="week-picker">
      <div className="form-row">
        <Button
          className="secondary"
          disabled={disabled}
          onClick={() => onChange(addDays(selected, -7))}
        >
          Tuần trước
        </Button>
        <Field label={label}>
          <NativeSelect
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
          </NativeSelect>
        </Field>
        <Button
          className="secondary"
          disabled={disabled}
          onClick={() => onChange(current)}
        >
          Tuần hiện tại
        </Button>
        <Button
          className="secondary"
          disabled={disabled}
          onClick={() => onChange(addDays(selected, 7))}
        >
          Tuần kế tiếp
        </Button>
      </div>
      <p className="muted" aria-live="polite">
        {weekLabel(selected)}
      </p>
    </div>
  );
}
