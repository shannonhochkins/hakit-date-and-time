import React, { useMemo } from "react";
import { getLocale } from "../../helpers";

export interface AnalogClockPrivateProps {
  showSecondHand?: boolean;
  smoothSeconds?: boolean;
  ticks?: "none" | "quarter" | "hour" | "minute";
  labelStyle?: "none" | "numbers" | "roman";
  hourHandColor?: string;
  minuteHandColor?: string;
  secondHandColor?: string;
  centerDotColor?: string;
  tickColor?: string; // second markers (minute markers)
  fiveMinuteTickColor?: string; // 5-minute markers
  hourLabelColor?: string;
  hourLabelFontSize?: string; // unit
  hourHandLength?: number; // svg units (positive up length)
  minuteHandLength?: number;
  secondHandLength?: number;
  timezone?: string; // IANA timezone or 'user-settings'
  locale?: string;
}

export const AnalogClockPrivate: React.FC<AnalogClockPrivateProps> = ({
  showSecondHand = true,
  smoothSeconds = false,
  labelStyle = "numbers",
  ticks = "minute",
  hourHandColor = "var(--clr-surface-a0)",
  minuteHandColor = "var(--clr-surface-a0)",
  secondHandColor = "var(--clr-primary-a0)",
  centerDotColor = "var(--clr-primary-a0)",
  tickColor = "var(--clr-surface-a0)",
  fiveMinuteTickColor = "var(--clr-surface-a0)",
  hourLabelColor = "var(--clr-surface-a0)",
  hourLabelFontSize = "14px",
  hourHandLength = 80,
  minuteHandLength = 100,
  secondHandLength = 120,
  timezone = "user-settings",
  locale,
}) => {
  // Geometric constants for full usage of 300x300 viewBox
  const FRAME_RADIUS = 145; // circle nearly touching edges (leave slight padding)
  const SECOND_MARKER_INNER = FRAME_RADIUS - 11;
  const SECOND_MARKER_OUTER = FRAME_RADIUS - 5;
  const FIVE_MARKER_INNER = FRAME_RADIUS - 20;
  const FIVE_MARKER_OUTER = FRAME_RADIUS - 5;
  const HOUR_LABEL_RADIUS = FRAME_RADIUS - 35;

  // Compute initial offsets (in seconds) for animation-delay similar to HA implementation
  const {
    hourDelay,
    minuteDelay,
    secondDelay,
    hourRotationStart,
    minuteRotationStart,
    secondRotationStart,
  } = useMemo(() => {
    try {
      const now = new Date();
      const updatedLocale = getLocale(locale);
      const formatter = new Intl.DateTimeFormat(updatedLocale, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h12",
        timeZone: timezone,
      });
      const parts = formatter.formatToParts(now);
      const hourStr = parts.find((p) => p.type === "hour")?.value || "0";
      const minuteStr = parts.find((p) => p.type === "minute")?.value || "0";
      const secondStr = parts.find((p) => p.type === "second")?.value || "0";
      const ms = now.getMilliseconds();
      const hour = parseInt(hourStr, 10);
      const minute = parseInt(minuteStr, 10);
      const second = parseInt(secondStr, 10);
      const secondsWithMs = second + ms / 1000;
      const hour12 = hour % 12;
      // Starting rotation degrees
      const hourRotation = hour12 * 30 + minute * 0.5 + secondsWithMs / 120; // 360deg/12h = 30 per hour; 0.5 per minute; slight per second
      const minuteRotation = minute * 6 + secondsWithMs / 10; // 6 per minute; 0.1 per second for smoothness
      const secondRotation = secondsWithMs * 6; // 6 per second
      return {
        hourDelay: -(hour12 * 3600 + minute * 60 + secondsWithMs),
        minuteDelay: -(minute * 60 + secondsWithMs),
        secondDelay: -secondsWithMs,
        hourRotationStart: hourRotation,
        minuteRotationStart: minuteRotation,
        secondRotationStart: secondRotation,
      };
    } catch {
      return {
        hourDelay: 0,
        minuteDelay: 0,
        secondDelay: 0,
        hourRotationStart: 0,
        minuteRotationStart: 0,
        secondRotationStart: 0,
      };
    }
  }, [timezone]);

  return (
    <svg className="svg-analog-clock" viewBox="0 0 300 300">
      <g transform="translate(150,150)">
        <circle className="frame" r={FRAME_RADIUS} />

        {ticks !== "none" &&
          ticks !== "hour" &&
          ticks !== "quarter" &&
          minuteMarkers.map((m) =>
            drawMinuteMarker(
              m,
              tickColor,
              SECOND_MARKER_INNER,
              SECOND_MARKER_OUTER
            )
          )}
        {/* Hour markers (every 5) shown for hour & minute modes */}
        {(ticks === "hour" || ticks === "minute") &&
          fiveMinuteMarkers.map((m) =>
            draw5MinMarker(
              m,
              fiveMinuteTickColor,
              FIVE_MARKER_INNER,
              FIVE_MARKER_OUTER
            )
          )}
        {/* Quarter markers: only 0,15,30,45 (subset of fiveMinuteMarkers) */}
        {ticks === "quarter" &&
          [0, 15, 30, 45].map((m) =>
            draw5MinMarker(
              m,
              fiveMinuteTickColor,
              FIVE_MARKER_INNER,
              FIVE_MARKER_OUTER
            )
          )}
        {labelStyle !== "none" &&
          (labelStyle === "roman" ? hourLabelsRoman : hourLabelsNumbers).map(
            (l, i) =>
              drawHourLabel(
                l,
                i,
                hourLabelColor,
                hourLabelFontSize,
                HOUR_LABEL_RADIUS
              )
          )}

        <g
          className="hour-hand"
          style={{
            transform: `rotate(${hourRotationStart}deg)`,
            animationDelay: `${hourDelay}s`,
          }}
        >
          <line
            stroke={hourHandColor}
            strokeWidth="4"
            x1="0"
            y1="15"
            x2="0"
            y2={-hourHandLength}
          />
        </g>
        <g
          className="minute-hand"
          style={{
            transform: `rotate(${minuteRotationStart}deg)`,
            animationDelay: `${minuteDelay}s`,
          }}
        >
          <line
            stroke={minuteHandColor}
            strokeWidth="2"
            x1="0"
            y1="20"
            x2="0"
            y2={-minuteHandLength}
          />
        </g>
        {showSecondHand && (
          <g
            className={`second-hand ${smoothSeconds ? "smooth" : "tick"}`}
            style={{
              transform: `rotate(${secondRotationStart}deg)`,
              animationDelay: `${secondDelay}s`,
            }}
          >
            <line
              stroke={secondHandColor}
              x1="0"
              y1="30"
              x2="0"
              y2={-secondHandLength}
            />
          </g>
        )}
        <circle className="center-dot" fill={centerDotColor} r="3" />
      </g>
    </svg>
  );
};

const minuteMarkers = Array.from(new Array(60), (_, i) => i);
const fiveMinuteMarkers = minuteMarkers.filter((m) => m % 5 === 0);

const markerIndexToRadians = (markerIndex: number) =>
  (Math.PI * markerIndex) / 30;

const drawMinuteMarker = (
  markerIndex: number,
  color: string,
  innerRadius: number,
  outerRadius: number
) => {
  return (
    <g key={`m-${markerIndex}`} className="minute-marker" stroke={color}>
      <line
        x1={innerRadius * Math.cos(markerIndexToRadians(markerIndex))}
        y1={innerRadius * Math.sin(markerIndexToRadians(markerIndex))}
        x2={outerRadius * Math.cos(markerIndexToRadians(markerIndex))}
        y2={outerRadius * Math.sin(markerIndexToRadians(markerIndex))}
      />
    </g>
  );
};

const draw5MinMarker = (
  markerIndex: number,
  color: string,
  innerRadius: number,
  outerRadius: number
) => {
  return (
    <g key={`f-${markerIndex}`} className="five-minute-marker" stroke={color}>
      <line
        strokeWidth="2"
        x1={innerRadius * Math.cos(markerIndexToRadians(markerIndex))}
        y1={innerRadius * Math.sin(markerIndexToRadians(markerIndex))}
        x2={outerRadius * Math.cos(markerIndexToRadians(markerIndex))}
        y2={outerRadius * Math.sin(markerIndexToRadians(markerIndex))}
      />
    </g>
  );
};

// Clock positions start from 3 o'clock moving clockwise due to coordinate system rotation logic used.
const hourLabelsNumbers = [
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
  "1",
  "2",
];

const hourLabelsRoman = [
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
  "IX",
  "X",
  "XI",
  "XII",
  "I",
  "II",
];
const drawHourLabel = (
  label: React.ReactNode,
  hourLabelIndex: number,
  color: string,
  fontSize: string,
  radius: number
) => {
  return (
    <text
      key={`h-${hourLabelIndex}`}
      className="hour-label"
      textAnchor="middle"
      alignmentBaseline="central"
      dominantBaseline="central"
      x={radius * Math.cos(markerIndexToRadians(hourLabelIndex * 5))}
      y={radius * Math.sin(markerIndexToRadians(hourLabelIndex * 5))}
      fill={color}
      style={{ fontSize }}
    >
      {label}
    </text>
  );
};
