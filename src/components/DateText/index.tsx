import React, { useEffect, useMemo, useRef, useState } from "react";
import { ComponentConfig, RenderProps, UnitFieldValue } from "@hakit/addon";
import { Row, SelectField } from "@hakit/addon/components";
import { useConfig, useLocales } from "@hakit/core";
import { css } from "@emotion/react";
import { TIMEZONE_OPTIONS } from "../../constants";
import { getLocale } from "../../helpers";

// Supported part tokens
type DatePartKey = "year" | "month" | "day" | "weekday";

// Preset definition structure
interface PresetDef {
  label: string;
  description: string;
  order: (DatePartKey | { sep: string })[]; // sequence of parts & separators
  options: Intl.DateTimeFormatOptions; // intl options needed for these parts
  dayOrdinal?: boolean; // if true convert day to ordinal suffix (e.g. 20th)
}

const PRESETS: Record<string, PresetDef> = {
  weekday: {
    label: "Weekday (Long)",
    description: "Monday",
    order: ["weekday"],
    options: { weekday: "long" },
  },
  weekday_short: {
    label: "Weekday (Short)",
    description: "Mon",
    order: ["weekday"],
    options: { weekday: "short" },
  },
  day_numeric: {
    label: "Day (Numeric)",
    description: "3",
    order: ["day"],
    options: { day: "numeric" },
  },
  day_ordinal: {
    label: "Day (Ordinal)",
    description: "3rd",
    order: ["day"],
    options: { day: "numeric" },
    dayOrdinal: true,
  },
  month_long: {
    label: "Month (Long)",
    description: "November",
    order: ["month"],
    options: { month: "long" },
  },
  month_short: {
    label: "Month (Short)",
    description: "Nov",
    order: ["month"],
    options: { month: "short" },
  },
  month_day_ordinal: {
    label: "Month Day Ordinal",
    description: "November 3rd",
    order: ["month", "day"],
    options: { month: "long", day: "numeric" },
    dayOrdinal: true,
  },
  weekday_month_day_ordinal: {
    label: "Weekday, Month Day Ordinal",
    description: "Monday, November 3rd",
    order: ["weekday", { sep: ", " }, "month", "day"],
    options: { weekday: "long", month: "long", day: "numeric" },
    dayOrdinal: true,
  },
  month_day_year: {
    label: "Month Day Year",
    description: "October 20 2025",
    order: ["month", "day", "year"],
    options: { month: "long", day: "numeric", year: "numeric" },
  },
  month_day_year_ordinal: {
    label: "Month Day Year Ordinal",
    description: "November 3rd 2025",
    order: ["month", "day", "year"],
    options: { month: "long", day: "numeric", year: "numeric" },
    dayOrdinal: true,
  },
  weekday_month_day: {
    label: "Weekday Month Day",
    description: "Mon Oct 20",
    order: ["weekday", "month", "day"],
    options: { weekday: "short", month: "short", day: "numeric" },
  },
  weekday_month_day_year: {
    label: "Weekday Month Day Year",
    description: "Mon Oct 20 2025",
    order: ["weekday", "month", "day", "year"],
    options: { weekday: "short", month: "short", day: "numeric", year: "numeric" },
  },
  dmy_slash: {
    label: "D/M/Y Slashes",
    description: "20/10/2025",
    order: ["day", { sep: "/" }, "month", { sep: "/" }, "year"],
    options: { year: "numeric", month: "2-digit", day: "2-digit" },
  },
  ymd_slash: {
    label: "Y/M/D Slashes",
    description: "2025/10/20",
    order: ["year", { sep: "/" }, "month", { sep: "/" }, "day"],
    options: { year: "numeric", month: "2-digit", day: "2-digit" },
  },
  mdy_slash: {
    label: "M/D/Y Slashes",
    description: "10/20/2025",
    order: ["month", { sep: "/" }, "day", { sep: "/" }, "year"],
    options: { year: "numeric", month: "2-digit", day: "2-digit" },
  },
  iso: {
    label: "ISO (Date)",
    description: "2025-10-20",
    order: ["year", { sep: "-" }, "month", { sep: "-" }, "day"],
    options: { year: "numeric", month: "2-digit", day: "2-digit" },
  },
  ymd_dot: {
    label: "Y.M.D Dots",
    description: "2025.10.20",
    order: ["year", { sep: "." }, "month", { sep: "." }, "day"],
    options: { year: "numeric", month: "2-digit", day: "2-digit" },
  },
  dmy_dot: {
    label: "D.M.Y Dots",
    description: "20.10.2025",
    order: ["day", { sep: "." }, "month", { sep: "." }, "year"],
    options: { year: "numeric", month: "2-digit", day: "2-digit" },
  },
  full_long: {
    label: "Full Long",
    description: "Monday, October 20, 2025",
    order: ["weekday", { sep: ", " }, "month", "day", { sep: ", " }, "year"],
    options: { weekday: "long", month: "long", day: "numeric", year: "numeric" },
  },
  weekday_day_ordinal: {
    label: "Weekday Day Ordinal",
    description: "Saturday 20th",
    order: ["weekday", "day"],
    options: { weekday: "long", day: "numeric" },
    dayOrdinal: true,
  },
  weekday_month_day_year_ordinal: {
    label: "Weekday Month Day Year Ordinal",
    description: "Monday November 3rd 2025",
    order: ["weekday", "month", "day", "year"],
    options: { weekday: "long", month: "long", day: "numeric", year: "numeric" },
    dayOrdinal: true,
  },
  iso_with_weekday: {
    label: "Weekday ISO",
    description: "Mon 2025-10-20",
    order: ["weekday", { sep: " " }, "year", { sep: "-" }, "month", { sep: "-" }, "day"],
    options: { weekday: "short", year: "numeric", month: "2-digit", day: "2-digit" },
  },
  custom: {
    label: "Custom",
    description: "Controlled by toggles below",
    order: [],
    options: {},
  },
};

function getOrdinalSuffix(day: number): string {
  const v = day % 100;
  if (v >= 11 && v <= 13) return `${day}th`;
  switch (day % 10) {
    case 1: return `${day}st`;
    case 2: return `${day}nd`;
    case 3: return `${day}rd`;
    default: return `${day}th`;
  }
}

interface DateProps {
  timezone: { override: string };
  format: {
    preset: keyof typeof PRESETS;
    // only used when preset === 'custom'
    year?: boolean;
    yearFormat?: "2-digit" | "numeric"; // numeric -> full year
    month?: boolean;
    monthFormat?: "2-digit" | "short" | "long" | "narrow";
    day?: boolean;
    dayFormat?: "2-digit" | "numeric" | "ordinal"; // ordinal -> 20th
    weekday?: boolean;
    weekdayFormat?: "short" | "long" | "narrow";
    separatorStyle?: "space" | "slash" | "dash" | "comma-space";
  };
  appearance: {
    fontSize: UnitFieldValue;
    color: string;
    weight: "regular" | "medium" | "bold";
    uppercase: boolean;
  };
}

interface PartValueMap { year?: string; month?: string; day?: string; weekday?: string; }

function buildFormatter(locale: string | undefined, timezone: string | undefined, f: DateProps["format"]): Intl.DateTimeFormat {
  if (f.preset !== 'custom') {
    const def = PRESETS[f.preset];
    return new Intl.DateTimeFormat(locale, { timeZone: timezone, ...def.options });
  }
  const opts: Intl.DateTimeFormatOptions = { timeZone: timezone };
  if (f.year && f.yearFormat) opts.year = f.yearFormat;
  if (f.month && f.monthFormat) opts.month = f.monthFormat;
  if (f.day && f.dayFormat && f.dayFormat !== 'ordinal') opts.day = f.dayFormat === '2-digit' ? '2-digit' : 'numeric';
  if (f.weekday && f.weekdayFormat) opts.weekday = f.weekdayFormat;
  return new Intl.DateTimeFormat(locale, opts);
}

function extractParts(d: Date, fmt: Intl.DateTimeFormat): PartValueMap {
  const out: PartValueMap = {};
  for (const p of fmt.formatToParts(d)) {
    if (p.type === 'year' || p.type === 'month' || p.type === 'day' || p.type === 'weekday') out[p.type] = p.value;
  }
  return out;
}

function buildSequence(f: DateProps['format']): (DatePartKey | { sep: string })[] {
  if (f.preset !== 'custom') return PRESETS[f.preset].order;
  const sepMap: Record<'space'|'slash'|'dash'|'comma-space', string> = { space:' ', slash:'/', dash:'-', 'comma-space':', ' };
  const sep = sepMap[(f.separatorStyle || 'space') as keyof typeof sepMap];
  const order: DatePartKey[] = [];
  if (f.weekday) order.push('weekday');
  if (f.month) order.push('month');
  if (f.day) order.push('day');
  if (f.year) order.push('year');
  if (order.length <= 1) return order;
  const seq: (DatePartKey | { sep: string })[] = [];
  order.forEach((part, idx) => { seq.push(part); if (idx < order.length - 1) seq.push({ sep }); });
  return seq;
}

// Build rendered string exactly as Render would produce (concatenated parts & separators)
// (Removed earlier composeDisplay – DOM renders parts; preview uses composePreview)

// Preview string: inserts a space between adjacent parts when no explicit separator exists
function composePreview(date: Date, locale: string | undefined, timezone: string | undefined, format: DateProps['format']): string {
  const fmt = buildFormatter(locale, timezone, format);
  const raw = extractParts(date, fmt);
  if ((format.preset === 'custom' && format.day && format.dayFormat === 'ordinal') || (format.preset !== 'custom' && PRESETS[format.preset].dayOrdinal)) {
    raw.day = getOrdinalSuffix(date.getDate());
  }
  const seq = buildSequence(format);
  let out = '';
  let lastWasPart = false;
  seq.forEach(token => {
    if (typeof token === 'string') {
      const v = raw[token] || '';
      if (lastWasPart && out.length > 0) out += ' ';
      out += v;
      lastWasPart = true;
    } else {
      out += token.sep; // keep explicit separator verbatim
      lastWasPart = false; // explicit separator resets adjacency
    }
  });
  return out;
}

function Render(props: RenderProps<DateProps>) {
  const cfg = useConfig();
  const timezone = props.timezone.override === 'user-settings' ? cfg?.time_zone : props.timezone.override;
  const locale = getLocale(cfg?.language);
  const fmt = useMemo(() => buildFormatter(locale, timezone, props.format), [locale, timezone, props.format]);
  const [parts, setParts] = useState<PartValueMap>(() => extractParts(new Date(), fmt));
  const seq = useMemo(() => buildSequence(props.format), [props.format]);
  const intervalRef = useRef<number | null>(null);
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const extracted = extractParts(now, fmt);
      if (
        (props.format.preset === 'custom' && props.format.day && props.format.dayFormat === 'ordinal') ||
        (props.format.preset !== 'custom' && PRESETS[props.format.preset].dayOrdinal)
      ) {
        extracted.day = getOrdinalSuffix(now.getDate());
      }
      setParts(extracted);
    };
    tick();
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    intervalRef.current = window.setInterval(tick, 60_000);
    return () => { if (intervalRef.current) window.clearInterval(intervalRef.current); };
  }, [fmt, props.format.preset, props.format.day, props.format.dayFormat]);
  return (
    <div className="ha-date-text__container">
      {seq.map((token, i) => {
        if (typeof token === 'string') {
          const raw = parts[token] || '';
          const display = props.appearance.uppercase ? raw.toUpperCase() : raw;
          const needsSpace = i > 0 && typeof seq[i-1] === 'string';
          return (
            <React.Fragment key={i}>
              {needsSpace && <div className="ha-date-text__space" aria-hidden="true">&nbsp;</div>}
              <div className={"ha-date-text__part ha-date-text__part--"+token} suppressHydrationWarning>{display}</div>
            </React.Fragment>
          );
        }
        return <div key={i} className="ha-date-text__sep" suppressHydrationWarning>{token.sep}</div>;
      })}
    </div>
  );
}
export const config: ComponentConfig<DateProps> = {
  label: "DateText",
  fields: {
    format: {
      type: "object",
      label: "Format",
      description: "Preset or custom combination of date parts.",
      section: { expanded: false },
      objectFields: {
        preset: {
          type: "custom",
          label: "Preset",
          description: "Choose a predefined layout or Custom to build your own.",
          default: "full_long",
          render({ value, onChange, id }) {
            const cfg = useConfig();
            const timezone = cfg?.time_zone;
            const locale = getLocale(cfg?.language);
            const today = new Date();
            const optionsBase = Object.keys(PRESETS).map(key => {
              const fmtConfig: DateProps['format'] = { preset: key as keyof typeof PRESETS };
              const preview = key === 'custom' ? 'Custom (build below)' : composePreview(today, locale, timezone, fmtConfig);
              return { preview, key };
            });
            // detect duplicates and append key for clarity
            const counts: Record<string,string[]> = {};
            optionsBase.forEach(o => { (counts[o.preview] ||= []).push(o.key); });
            const options = optionsBase.map(o => {
              const dup = counts[o.preview].length > 1;
              const dupSuffix = dup ? ` • ${o.key}` : '';
              const label = `${o.preview}${dupSuffix}`;
              return { label, value: o.key };
            });
            const selected = options.find(o => o.value === value) || options[0];
            
            return (
              <Row style={{
                padding: 'var(--space-3)'
              }}>
                <SelectField
                  id={id}
                  name={id}
                  label="Preset"
                  value={selected}
                  options={options}
                  helperText="Select a preset format for the date display"
                  onChange={opt => onChange(opt.value)}
                />
              </Row>
            );
          },
        },
        year: {
          type: "switch",
          label: "Year",
          default: true,
          visible: (d) => d.format?.preset === "custom",
          description: "Include the year component.",
        },
        yearFormat: {
          type: "select",
          label: "Year Format",
          default: "numeric",
          options: [
            { label: "Full", value: "numeric" },
            { label: "2 Digit", value: "2-digit" },
          ],
          visible: (d) => d.format?.preset === "custom" && d.format?.year === true,
          description: "Choose full (e.g. 2025) or 2‑digit (e.g. 25) year.",
        },
        month: {
          type: "switch",
          label: "Month",
          default: true,
          visible: (d) => d.format?.preset === "custom",
          description: "Include the month component.",
        },
        monthFormat: {
          type: "select",
          label: "Month Format",
          default: "long",
          options: [
            { label: "Long", value: "long" },
            { label: "Short", value: "short" },
            { label: "Narrow", value: "narrow" },
            { label: "2 Digit", value: "2-digit" },
          ],
          visible: (d) => d.format?.preset === "custom" && d.format?.month === true,
          description: "Long/Short/Narrow name or numeric 2‑digit month.",
        },
        day: {
          type: "switch",
          label: "Day",
          default: true,
          visible: (d) => d.format?.preset === "custom",
          description: "Include the day of month.",
        },
        dayFormat: {
          type: "select",
          label: "Day Format",
          default: "numeric",
          options: [
            { label: "Numeric", value: "numeric" },
            { label: "2 Digit", value: "2-digit" },
            { label: "Ordinal", value: "ordinal" },
          ],
          visible: (d) => d.format?.preset === "custom" && d.format?.day === true,
          description: "Numeric (3), zero‑padded (03) or ordinal (3rd).",
        },
        weekday: {
          type: "switch",
          label: "Weekday",
          default: true,
          visible: (d) => d.format?.preset === "custom",
          description: "Include the weekday name.",
        },
        weekdayFormat: {
          type: "select",
          label: "Weekday Format",
          default: "short",
          options: [
            { label: "Long", value: "long" },
            { label: "Short", value: "short" },
            { label: "Narrow", value: "narrow" },
          ],
          visible: (d) => d.format?.preset === "custom" && d.format?.weekday === true,
          description: "Long (Monday), short (Mon) or narrow (M) form.",
        },
        separatorStyle: {
          type: "select",
          label: "Separator Style",
          default: "space",
          options: [
            { label: "Space", value: "space" },
            { label: "Slash /", value: "slash" },
            { label: "Dash -", value: "dash" },
            { label: "Comma Space ,", value: "comma-space" },
          ],
          visible: (d) => d.format?.preset === "custom",
          description: "Character placed between adjacent date parts.",
        },
      },
    },
    appearance: {
      type: "object",
      label: "Appearance",
      description: "Styling for the date string.",
      section: { expanded: false },
      objectFields: {
        fontSize: {
          type: "unit",
          label: "Font Size",
            description: "Base font size for parts.",
          default: "1rem",
        },
        color: {
          type: "color",
          label: "Color",
          description: "Text color for date parts.",
          default: "var(--clr-primary-a90)",
        },
        weight: {
          type: "select",
          label: "Weight",
          default: "regular",
          options: [
            { label: "Regular", value: "regular" },
            { label: "Medium", value: "medium" },
            { label: "Bold", value: "bold" },
          ],
          description: "Font weight for all date parts.",
        },
        uppercase: {
          type: "switch",
          label: "Uppercase",
          description: "Transform text to uppercase.",
          default: false,
        },
      },
    },
     timezone: {
      type: "object",
      label: "Timezone",
      description: "Timezone override (defaults to user settings).",
      section: { expanded: false },
      objectFields: {
        override: {
          type: "select",
          label: "Timezone",
          description: "Select a specific timezone or use user settings.",
          options: TIMEZONE_OPTIONS,
          default: "user-settings",
        },
      },
    },
  },
  styles(props) {
    return css`
      &.ha-date-text__container {
        --ha-date-text-font-size: ${props.appearance.fontSize};
        --ha-date-text-color: ${props.appearance.color};
        font-size: var(--ha-date-text-font-size);
        color: var(--ha-date-text-color);
        display: inline-flex;
        align-items: baseline;
        font-weight: ${props.appearance.weight === 'bold' ? 700 : props.appearance.weight === 'medium' ? 500 : 400};
        user-select: none;
        cursor: default;
      }
      .ha-date-text__part { line-height: 1; }
      .ha-date-text__sep { line-height: 1; opacity: 0.75; }
    `;
  },
  render: Render,
};
