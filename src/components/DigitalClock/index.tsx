import React, { useEffect, useRef } from "react";
import { useConfig, useLocales } from "@hakit/core";
import { TIMEZONE_OPTIONS } from "../../constants";
import { css } from "@emotion/react";
import { ComponentConfig, UnitFieldValue } from "@hakit/addon";
import { getLocale } from "../../helpers";
import clsx from "clsx";
export type Digit = number | string;

type StyleMode = "flip" | "digital";

interface DigitalClockProps {
  timezone: { override: string };
  show: {
    hourFormat: "12" | "24";
    year: boolean;
    yearFormat?: "2-digit";
    month: boolean;
    monthFormat?: "2-digit" | "short" | "long" | "narrow";
    day: boolean;
    dayFormat?: "2-digit" | "short" | "long" | "narrow"; // short/long/narrow map to weekday name (2-digit shows day of month)
    hour: boolean;
    minute: boolean;
    second: boolean;
    hours_am_pm: boolean;
    hoursAmPmFormat?: "default" | "scaled"; // digital mode only
    hoursAmPmPosition?: "top" | "center" | "bottom"; // for scaled variant
  };
  labels: {
    show: boolean;
    fontSize: UnitFieldValue;
    color: string;
    position: "center" | "start" | "end";
  };
  appearance: {
    styleMode: StyleMode;
    spacing: UnitFieldValue;
    digitWidth: UnitFieldValue;
    digitHeight: UnitFieldValue;
    digitRadius: UnitFieldValue;
    digitFontSize: UnitFieldValue;
    backgroundColor: string;
    digitColor: string;
    separatorColor: string;
    dividerColor: string;
    separator?: boolean;
  };
}

// Flip digit component (adapted from original FlipClockDigit)
type DigitUpdater = (next: Digit, opts?: { immediate?: boolean }) => void;
function FlipDigit({
  initial,
  className,
  onRegister,
}: {
  initial: Digit;
  className?: string;
  onRegister: (update: DigitUpdater) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const nextAboveRef = useRef<HTMLDivElement>(null);
  const currentBelowRef = useRef<HTMLDivElement>(null);
  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const currentRef = useRef<Digit>(initial);
  const nextRef = useRef<Digit>(initial);
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return; // should exist
    const updateDigit: DigitUpdater = (next, opts) => {
      if (next === currentRef.current) return; // unchanged
      if (opts?.immediate) {
        currentRef.current = next;
        nextRef.current = next;
        if (nextAboveRef.current)
          nextAboveRef.current.textContent = String(next);
        if (backRef.current) backRef.current.textContent = String(next);
        if (currentBelowRef.current)
          currentBelowRef.current.textContent = String(next);
        if (frontRef.current) frontRef.current.textContent = String(next);
        return;
      }
      nextRef.current = next;
      if (nextAboveRef.current)
        nextAboveRef.current.textContent = String(nextRef.current);
      if (backRef.current)
        backRef.current.textContent = String(nextRef.current);
      card.classList.add("ha-dc__flipped");
    };
    const handleTransitionEnd = () => {
      currentRef.current = nextRef.current;
      if (currentBelowRef.current)
        currentBelowRef.current.textContent = String(currentRef.current);
      if (frontRef.current)
        frontRef.current.textContent = String(currentRef.current);
      card.classList.remove("ha-dc__flipped");
    };
    card.addEventListener("transitionend", handleTransitionEnd);
    onRegister(updateDigit);
    return () => {
      card.removeEventListener("transitionend", handleTransitionEnd);
    };
  }, [onRegister]);
  return (
    <div
      ref={rootRef}
      className={clsx(
        "ha-dc__digit_block",
        "ha-dc__digit_block_base",
        className
      )}
      suppressHydrationWarning
    >
      <div ref={nextAboveRef} className={"ha-dc__next_above"}>
        {initial}
      </div>
      <div ref={currentBelowRef} className={"ha-dc__current_below"}>
        {initial}
      </div>
      <div ref={cardRef} className={clsx("ha-dc__card")}>
        <div
          ref={frontRef}
          className={clsx("ha-dc__card_face", "ha-dc__card_face_front")}
        >
          {initial}
        </div>
        <div
          ref={backRef}
          className={clsx("ha-dc__card_face", "ha-dc__card_face_back")}
        >
          {initial}
        </div>
      </div>
    </div>
  );
}

const ORDERED_UNITS: UnitKey[] = [
  "year",
  "month",
  "day",
  "hour",
  "minute",
  "second",
  "hours_am_pm",
];
// will use home assistant locale if available
const LABELS = {
  year: "YEAR",
  month: "MONTH",
  day: "DAY",
  hour: "HOUR",
  minute: "MINUTE",
  second: "SECOND",
  hours_am_pm: "AM/PM",
} as const;

// Helpers (moved outside Render for reuse)
const pad2 = (v: string) => (v.length === 1 ? `0${v}` : v);
const isWeekdayFormat = (
  f: DigitalClockProps["show"]["dayFormat"]
): f is "short" | "long" | "narrow" =>
  f === "short" || f === "long" || f === "narrow";

type UnitKey =
  | "year"
  | "month"
  | "day"
  | "hour"
  | "minute"
  | "second"
  | "hours_am_pm";

function buildDateFormatter(
  locale: string | undefined,
  timezone: string | undefined,
  show: DigitalClockProps["show"]
) {
  const hourFormat = show.hourFormat;
  const yearOpt = show.year ? show.yearFormat || "2-digit" : undefined;
  const monthOpt = show.month ? show.monthFormat || "2-digit" : undefined;
  const dayIsWeekday = show.day && isWeekdayFormat(show.dayFormat);
  const dayOpt = show.day
    ? show.dayFormat === "2-digit"
      ? "2-digit"
      : undefined
    : undefined;
  // Only assign weekday when format is one of short/long/narrow
  const weekdayOpt =
    dayIsWeekday && isWeekdayFormat(show.dayFormat)
      ? show.dayFormat
      : undefined;
  const opts: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    hourCycle: hourFormat === "24" ? "h23" : "h12",
    year: yearOpt,
    month: monthOpt,
    day: dayOpt,
    weekday: weekdayOpt, // no cast needed
    hour: show.hour ? "2-digit" : undefined,
    minute: show.minute ? "2-digit" : undefined,
    second: show.second ? "2-digit" : undefined,
  };
  return new Intl.DateTimeFormat(locale, opts);
}

function extractParts(
  d: Date,
  fmt: Intl.DateTimeFormat
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of fmt.formatToParts(d)) {
    if (
      p.type === "year" ||
      p.type === "month" ||
      p.type === "day" ||
      p.type === "hour" ||
      p.type === "minute" ||
      p.type === "second"
    )
      out[p.type] = p.value;
    if (p.type === "weekday") out["day"] = p.value; // map weekday to day
    if (p.type === "dayPeriod") out["hours_am_pm"] = p.value;
  }
  return out;
}

function enabledUnits(show: DigitalClockProps["show"]): UnitKey[] {
  return ORDERED_UNITS.filter((k) => {
    if (k === "hours_am_pm") {
      return show.hours_am_pm && show.hourFormat === "12";
    }
    return show[k];
  });
}

function buildInitialSections(
  now: Date,
  enabled: UnitKey[],
  show: DigitalClockProps["show"],
  fmt: Intl.DateTimeFormat
): [UnitKey, string[]][] {
  const parts = extractParts(now, fmt);
  return enabled.map((k) => {
    let val =
      k === "hours_am_pm"
        ? parts[k] || (now.getHours() < 12 ? "AM" : "PM")
        : parts[k] || "";
    if (
      k === "month" &&
      show.month &&
      (show.monthFormat === undefined || show.monthFormat === "2-digit") &&
      val.length === 1
    )
      val = pad2(val);
    if (
      k === "day" &&
      show.day &&
      show.dayFormat === "2-digit" &&
      val.length === 1
    )
      val = pad2(val);
    if (["hour", "minute", "second"].includes(k) && val.length === 1)
      val = pad2(val);
    return [k, val.split("")] as [UnitKey, string[]];
  });
}

function applyTick(
  enabled: UnitKey[],
  show: DigitalClockProps["show"],
  digitUpdatersRef: React.RefObject<Record<string, DigitUpdater[]>>,
  firstRunRef: React.RefObject<boolean>,
  fmt: Intl.DateTimeFormat
) {
  const now = firstRunRef.current ? undefined : new Date();
  const current = now || new Date();
  const parts = extractParts(current, fmt);
  enabled.forEach((k) => {
    let val =
      k === "hours_am_pm"
        ? parts[k] || (current.getHours() < 12 ? "AM" : "PM")
        : parts[k] || "";
    if (
      k === "month" &&
      show.month &&
      (show.monthFormat === undefined || show.monthFormat === "2-digit") &&
      val.length === 1
    )
      val = pad2(val);
    if (
      k === "day" &&
      show.day &&
      show.dayFormat === "2-digit" &&
      val.length === 1
    )
      val = pad2(val);
    if (["hour", "minute", "second"].includes(k) && val.length === 1)
      val = pad2(val);
    const digits = val.split("");
    const updaters = digitUpdatersRef.current[k];
    if (!updaters) return;
    digits.forEach((d, idx) => {
      const updater = updaters[idx];
      if (!updater) return;
      updater(d, firstRunRef.current ? { immediate: true } : undefined);
    });
  });
  if (firstRunRef.current) firstRunRef.current = false;
}

function Render(props: DigitalClockProps) {
  const cfg = useConfig();
  const locales = useLocales();
  const timezone =
    props.timezone.override === "user-settings"
      ? cfg?.time_zone
      : props.timezone.override;
  const { show } = props;
  const hourFormat = show.hourFormat;
  const { labels, appearance } = props;
  const { styleMode } = appearance;
  const containerRef = useRef<HTMLDivElement>(null);
  const digitUpdatersRef = useRef<Record<string, DigitUpdater[]>>({});
  const firstRunRef = useRef(true);
  const mountNowRef = useRef<Date>(new Date());
  const locale = getLocale(cfg?.language);
  const fmt = buildDateFormatter(locale, timezone, show);
  const enabled = enabledUnits(show);
  const initSections = buildInitialSections(
    mountNowRef.current,
    enabled,
    show,
    fmt
  );
  useEffect(() => {
    const tick = () =>
      applyTick(enabled, show, digitUpdatersRef, firstRunRef, fmt);
    // schedule initial sync at exact next second boundary for stability
    const nowMs = mountNowRef.current.getTime();
    const delay = 1000 - (nowMs % 1000);
    const intervalRef = { current: 0 };
    const timeoutId = window.setTimeout(() => {
      tick();
      intervalRef.current = window.setInterval(tick, 1000);
    }, delay);
    return () => {
      clearTimeout(timeoutId);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [
    timezone,
    hourFormat,
    enabled.join(":"),
    show.year,
    show.yearFormat,
    show.month,
    show.monthFormat,
    show.day,
    show.dayFormat,
    show.hour,
    show.minute,
    show.second,
    show.hours_am_pm,
    show.hoursAmPmFormat,
    show.hoursAmPmPosition,
    styleMode,
  ]);
  return (
    <div
      ref={containerRef}
      className={clsx(
        "ha-dc__container",
        labels.show && "ha-dc__labels_on",
        styleMode === "flip" ? "ha-dc__mode_flip" : "ha-dc__mode_digital"
      )}
    >
      {initSections.map(([key, digits], idx) => {
        const nextKey = initSections[idx + 1]?.[0];
        const isScaledAmPm =
          key === "hours_am_pm" &&
          styleMode === "digital" &&
          show.hoursAmPmFormat === "scaled";
        return (
          <React.Fragment key={key}>
            <div
              className={clsx(
                `ha-dc__unit_time ha-dc__unit_time--${key}`,
                isScaledAmPm && "ha-dc__ampm_scaled",
                isScaledAmPm &&
                  `ha-dc__ampm_pos_${show.hoursAmPmPosition || "center"}`
              )}
            >
              <div className="ha-dc__digits_row">
                {digits.map((d, i) => {
                  if (styleMode === "flip") {
                    return (
                      <FlipDigit
                        key={i}
                        initial={d}
                        className={`ha-dc__digit_block--${key}`}
                        onRegister={(fn) => {
                          (digitUpdatersRef.current[key] ||= []).push(fn);
                        }}
                      />
                    );
                  }
                  return (
                    <span
                      key={i}
                      className={clsx(
                        "ha-dc__digit_digital",
                        `ha-dc__digit_digital--${key}`,
                        isScaledAmPm && "ha-dc__digit_digital--ampm_scaled"
                      )}
                      ref={(el) => {
                        if (!el) return;
                        (digitUpdatersRef.current[key] ||= []).push(
                          (next, opts) => {
                            if (opts?.immediate) {
                              el.textContent = String(next);
                              return;
                            }
                            if (el.textContent !== String(next))
                              el.textContent = String(next);
                          }
                        );
                      }}
                    >
                      {d}
                    </span>
                  );
                })}
              </div>
              {labels.show && !isScaledAmPm && (
                <div className="ha-dc__unit_label">
                  {key === "hours_am_pm" && locales.am && locales.pm
                    ? `${locales.am}/${locales.pm}`.replace(/[0-9\.]/g, "")
                    : locales[key] || LABELS[key]}
                </div>
              )}
              {labels.show && isScaledAmPm && (
                <div className="ha-dc__unit_label">&nbsp;</div>
              )}
            </div>
            {idx < initSections.length - 1 &&
              appearance.separator !== false &&
              !(
                nextKey === "hours_am_pm" &&
                styleMode === "digital" &&
                show.hoursAmPmFormat === "scaled"
              ) && <div className={"ha-dc__separator ha-dc__colon"}></div>}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export const config: ComponentConfig<DigitalClockProps> = {
  label: "DigitalClock",
  fields: {
    show: {
      type: "object",
      label: "Units",
      description: "Select which time parts to display and format.",
      section: { expanded: false },
      objectFields: {
        hourFormat: {
          type: "select",
          label: "Hour Format",
          description: "Use 24-hour or 12-hour (AM/PM) mode.",
          default: "12",
          options: [
            { label: "24 Hour", value: "24" },
            { label: "12 Hour", value: "12" },
          ],
        },
        year: {
          type: "switch",
          label: "Year",
          description: "Display the current year.",
          default: false,
        },
        yearFormat: {
          type: "select",
          label: "Year Format",
          description: "Choose how year shows: 2-digit -> 25 (for 2025).",
          default: "2-digit",
          options: [{ label: "2 Digit", value: "2-digit" }],
          visible: (data) => data.show?.year === true,
        },
        month: {
          type: "switch",
          label: "Month",
          description: "Display the current month.",
          default: false,
        },
        monthFormat: {
          type: "select",
          label: "Month Format",
          description:
            "Month style: 2-digit=01, Short=Jan, Long=January, Narrow=J.",
          default: "2-digit",
          options: [
            { label: "2 Digit", value: "2-digit" },
            { label: "Short", value: "short" },
            { label: "Long", value: "long" },
            { label: "Narrow", value: "narrow" },
          ],
          visible: (data) => data.show?.month === true,
        },
        day: {
          type: "switch",
          label: "Day",
          description: "Display the current day of month.",
          default: false,
        },
        dayFormat: {
          type: "select",
          label: "Day Format",
          description:
            "Day style: 2-digit=01, Short=Mon, Long=Monday, Narrow=M.",
          default: "2-digit",
          options: [
            { label: "2 Digit", value: "2-digit" },
            { label: "Weekday Short", value: "short" },
            { label: "Weekday Long", value: "long" },
            { label: "Weekday Narrow", value: "narrow" },
          ],
          visible: (data) => data.show?.day === true,
        },
        hour: {
          type: "switch",
          label: "Hour",
          description: "Show hour digits.",
          default: true,
        },
        minute: {
          type: "switch",
          label: "Minute",
          description: "Show minute digits.",
          default: true,
        },
        second: {
          type: "switch",
          label: "Second",
          description: "Show seconds digits.",
          default: true,
        },
        hours_am_pm: {
          type: "switch",
          label: "AM/PM",
          description: "Show AM/PM indicator (12-hour mode only).",
          default: true,
          visible: (data) => data.show?.hourFormat === "12",
        },
        hoursAmPmFormat: {
          type: "select",
          label: "AM/PM Format",
          description: "Default full size or scaled suffix (digital only).",
          default: "scaled",
          options: [
            { label: "Matching", value: "default" },
            { label: "Scaled", value: "scaled" },
          ],
          visible: (data) =>
            data.show?.hourFormat === "12" && data.show?.hours_am_pm === true,
        },
        hoursAmPmPosition: {
          type: "select",
          label: "Scaled AM/PM Position",
          description: "Vertical alignment for scaled AM/PM suffix.",
          default: "bottom",
          options: [
            { label: "Top", value: "top" },
            { label: "Center", value: "center" },
            { label: "Bottom", value: "bottom" },
          ],
          visible: (data) =>
            data.show?.hourFormat === "12" &&
            data.show?.hours_am_pm === true &&
            data.show?.hoursAmPmFormat === "scaled",
        },
      },
    },
    labels: {
      type: "object",
      label: "Labels",
      description: "Configure labels underneath each time unit.",
      section: { expanded: false },
      objectFields: {
        show: {
          type: "switch",
          label: "Show",
          description: "Toggle on to display unit labels (e.g. HOUR, MINUTE).",
          default: true,
        },
        fontSize: {
          type: "unit",
          label: "Font Size",
          description: "Size of the labels text.",
          default: "0.75rem",
          visible: (d) => d.labels?.show === true,
        },
        color: {
          type: "color",
          label: "Color",
          description: "Color of the label text.",
          default: "var(--clr-primary-a90)",
          visible: (d) => d.labels?.show === true,
        },
        position: {
          type: "select",
          label: "Position",
          description: "Horizontal alignment of labels within each group.",
          default: "center",
          options: [
            { label: "Center", value: "center" },
            { label: "Start", value: "start" },
            { label: "End", value: "end" },
          ],
          visible: (d) => d.labels?.show === true,
        },
      },
    },
    appearance: {
      type: "object",
      label: "Appearance",
      description: "Visual styling for digits, spacing, colors and animation.",
      section: { expanded: false },
      objectFields: {
        styleMode: {
          type: "select",
          label: "Mode",
          description: "Select animated Flip or plain Digital style.",
          default: "digital",
          options: [
            { label: "Flip", value: "flip" },
            { label: "Digital", value: "digital" },
          ],
        },
        spacing: {
          type: "unit",
          label: "Spacing",
          description: "Gap between groups (e.g. between hour and minute).",
          default: "0.25rem",
          step: 0.1,
        },
        digitWidth: {
          type: "unit",
          label: "Digit Width",
          description: "Width of each flip card.",
          default: "2.875rem",
          visible: (data) => data.appearance?.styleMode === "flip",
        },
        digitHeight: {
          type: "unit",
          label: "Digit Height",
          description: "Height of each flip card.",
          default: "5rem",
          visible: (data) => data.appearance?.styleMode === "flip",
        },
        digitRadius: {
          type: "unit",
          label: "Digit Radius",
          description: "Corner radius of flip cards.",
          default: "0.25rem",
          visible: (data) => data.appearance?.styleMode === "flip",
        },
        digitFontSize: {
          type: "unit",
          label: "Digit Font Size",
          description: "Font size used for digits.",
          default: "3.125rem",
        },

        backgroundColor: {
          type: "color",
          label: "Background",
          description: "Background color of digit halves.",
          default: "var(--clr-surface-a30)",
        },
        digitColor: {
          type: "color",
          label: "Digit Color",
          description: "Color of the numbers.",
          default: "var(--clr-primary-a90)",
        },
        separator: {
          type: "switch",
          label: "Separator",
          description: "Show colon separators between time groups.",
          default: true,
        },
        separatorColor: {
          type: "color",
          label: "Separator Color",
          default: "var(--clr-primary-a70)",
          description: "Color of colon separator dots.",
          visible: (data) => data.appearance?.separator !== false,
        },
        dividerColor: {
          type: "color",
          label: "Divider Color",
          description: "Color of the horizontal divider line in flip cards.",
          default: "var(--clr-surface-a10)",
          visible: (data) => data.appearance?.styleMode === "flip",
        },
      },
    },
    timezone: {
      type: "object",
      label: "Timezone",
      description: "Timezone settings for the clock.",
      section: { expanded: false },
      objectFields: {
        override: {
          type: "select",
          label: "Timezone",
          description:
            "Select a specific timezone or use your Home Assistant user setting.",
          options: TIMEZONE_OPTIONS,
          default: "user-settings",
        },
      },
    },
  },
  resolveData(data, { lastData }) {
    // change some values when swapping appearance mode
    if (
      data.props.appearance.styleMode === "digital" &&
      lastData?.props?.appearance?.styleMode === "flip"
    ) {
      data.props.appearance.digitHeight = "3.125rem";
      // change the default gap to 0.25rem in digital mode
      data.props.appearance.spacing = "0.25rem";
    }
    if (
      data.props.appearance.styleMode === "flip" &&
      lastData?.props?.appearance?.styleMode === "digital"
    ) {
      data.props.appearance.digitHeight = "5rem";
      data.props.appearance.spacing = "0.5rem";
    }
    return data;
  },
  styles(props) {
    return css`
      &.ha-dc__container {
        /* dynamic variables from appearance props */
        /* static flip duration */
        --ha-dc-flip-duration: 0.7s;
        --ha-dc-spacing: ${props.appearance.spacing};
        --ha-dc-digit-block-width: ${props.appearance.digitWidth};
        --ha-dc-digit-block-height: ${props.appearance.digitHeight};
        --ha-dc-digit-block-radius: ${props.appearance.digitRadius};
        --ha-dc-digit-block-spacing: 4px; /* original default */
        --ha-dc-digit-font-size: ${props.appearance.digitFontSize};
        --ha-dc-label-font-size: ${props.labels.fontSize};
        --ha-dc-label-color: ${props.labels.color};
        --ha-dc-label-position: ${props.labels.position};
        --ha-dc-background: ${props.appearance.backgroundColor};
        --ha-dc-digit-color: ${props.appearance.digitColor};
        --ha-dc-divider-color: ${props.appearance.dividerColor};
        --ha-dc-divider-height: 1px;
        --ha-dc-shadow: 0 0 2px 1px rgba(0, 0, 0, 0.1);
        --ha-dc-separator-size: 5px;
        --ha-dc-separator-color: ${props.appearance.separatorColor};
        font-family: inherit;
        user-select: none;
        cursor: default;
        display: flex;
        align-items: center;
        gap: var(--ha-dc-spacing);
      }
      /* new layout for unit blocks */
      .ha-dc__unit_time {
        display: flex;
        flex-direction: column;
        align-items: ${props.labels.position === "center"
          ? "center"
          : props.labels.position === "start"
            ? "flex-start"
            : "flex-end"};
      }
      .ha-dc__digits_row {
        display: flex;
        align-items: center;
        text-transform: uppercase;
      }
      .ha-dc__digits_row .ha-dc__digit_block:not(:last-child) {
        margin-right: var(--ha-dc-digit-block-spacing);
      }
      .ha-dc__unit_label {
        margin-top: 0.25rem;
        font-size: var(--ha-dc-label-font-size);
        line-height: 1;
        font-weight: 500;
        color: var(--ha-dc-label-color);
        text-transform: uppercase;
      }
      &.ha-dc__container:not(.ha-dc__labels_on) .ha-dc__unit_label {
        display: none;
      }
      .ha-dc__digit_block_base {
        perspective: 200px;
        position: relative;
        font-size: var(--ha-dc-digit-font-size);
        color: var(--ha-dc-digit-color);
        font-weight: 500;
        line-height: 0;
        width: var(--ha-dc-digit-block-width);
        height: var(--ha-dc-digit-block-height);
        box-shadow: var(--ha-dc-shadow);
        border-radius: var(--ha-dc-digit-block-radius);
      }
      /* digital mode simple digits */
      &.ha-dc__mode_digital .ha-dc__digit_digital {
        display: inline-flex;
        justify-content: center;
        align-items: center;
        font-size: var(--ha-dc-digit-font-size);
        --line-height-adjustment: 0.5rem;
        line-height: calc(
          var(--ha-dc-digit-font-size) - var(--line-height-adjustment)
        );
        color: var(--ha-dc-digit-color);
        font-weight: 500;
        width: auto; /* no fixed width in digital mode */
        background: transparent;
      }
      /* hide flip structural elements entirely in digital */
      &.ha-dc__mode_digital .ha-dc__digit_block_base,
      &.ha-dc__mode_digital .ha-dc__next_above,
      &.ha-dc__mode_digital .ha-dc__current_below,
      &.ha-dc__mode_digital .ha-dc__card,
      &.ha-dc__mode_digital .ha-dc__card_face {
        display: none !important;
      }
      .ha-dc__current_below,
      .ha-dc__next_above {
        position: absolute;
        width: 100%;
        height: 50%;
        overflow: hidden;
        display: flex;
        justify-content: center;
        background: var(--ha-dc-background);
      }
      .ha-dc__next_above {
        align-items: flex-end;
        top: 0;
        border-top-left-radius: inherit;
        border-top-right-radius: inherit;
        border-bottom: var(--ha-dc-divider-height) solid
          var(--ha-dc-divider-color);
      }
      .ha-dc__current_below {
        align-items: flex-start;
        bottom: 0;
        border-bottom-left-radius: inherit;
        border-bottom-right-radius: inherit;
      }
      /* ensure flip-only structural pieces excluded from digital mode visually */
      &.ha-dc__mode_digital .ha-dc__divider,
      &.ha-dc__mode_digital .ha-dc__current_below,
      &.ha-dc__mode_digital .ha-dc__next_above {
        display: none;
      }
      .ha-dc__card {
        position: relative;
        z-index: 2;
        width: 100%;
        height: 50%;
        transform-style: preserve-3d;
        transform-origin: bottom;
        transform: rotateX(0);
        border-radius: inherit;
      }
      .ha-dc__card.ha-dc__flipped {
        transition: transform 0.7s ease-in-out;
        transform: rotateX(-180deg);
      }
      .ha-dc__card_face {
        position: absolute;
        width: 100%;
        height: 100%;
        display: flex;
        justify-content: center;
        overflow: hidden;
        backface-visibility: hidden;
        background: var(--ha-dc-background);
      }
      .ha-dc__card_face_front {
        align-items: flex-end;
        border-top-left-radius: inherit;
        border-top-right-radius: inherit;
        border-bottom: var(--ha-dc-divider-height) solid
          var(--ha-dc-divider-color);
      }
      .ha-dc__card_face_back {
        align-items: flex-start;
        transform: rotateX(-180deg);
        border-bottom-left-radius: inherit;
        border-bottom-right-radius: inherit;
      }
      .ha-dc__colon {
        height: var(--ha-dc-digit-block-height);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        align-self: start; /* align colon with top of hour digit container */
      }
      /* colon adjustment when labels hidden no extra margin needed */
      .ha-dc__colon::before,
      .ha-dc__colon::after {
        content: "";
        width: var(--ha-dc-separator-size);
        height: var(--ha-dc-separator-size);
        border-radius: 50%;
        background-color: var(--ha-dc-separator-color);
      }
      .ha-dc__colon::before {
        margin-bottom: var(--ha-dc-separator-size);
      }

      &.ha-dc__mode_digital {
        .ha-dc__colon {
          height: calc(var(--ha-dc-digit-font-size) - 0.5rem);
          align-self: start;
        }
      }

      /* scaled AM/PM (digital mode) */
      .ha-dc__ampm_scaled {
        .ha-dc__digits_row {
          height: auto;
        }
        .ha-dc__digit_digital--ampm_scaled {
          font-size: calc(var(--ha-dc-digit-font-size) * 0.5);
          line-height: calc(var(--ha-dc-digit-font-size) * 0.5);
        }
        &.ha-dc__ampm_pos_top {
          align-self: flex-start;
        }
        &.ha-dc__ampm_pos_center {
          align-self: center;
        }
        &.ha-dc__ampm_pos_bottom {
          align-self: flex-end;
        }
      }
    `;
  },
  render: Render,
};
