import { ComponentConfig, RenderProps, UnitFieldValue } from "@hakit/addon";
import { AnalogClockPrivate } from "./AnalogClock";
import { css, keyframes } from "@emotion/react";
import { TIMEZONE_OPTIONS } from "../../constants";
import { useConfig } from "@hakit/core";

interface AnalogClockProps {
  clockFace: {
    size: UnitFieldValue;
    faceColor: string;
    borderColor: string;
    borderSize: UnitFieldValue;
    centerDotColor: string;
  };
  hands: {
    hour: { color: string; length: number };
    minute: { color: string; length: number };
    second: { show: boolean; smooth: boolean; color: string; length: number };
  };
  markers: {
    ticks: "none" | "quarter" | "hour" | "minute";
    minuteTickColor: string;
    fiveMinuteTickColor: string;
  };
  labels: {
    labelStyle: "none" | "numbers" | "roman";
    hourLabelFontSize: UnitFieldValue;
    color: string;
  };
  timezone: {
    override: string;
  };
}

export function Render(props: RenderProps<AnalogClockProps>) {
  const config = useConfig();
  const localTimezone = config?.time_zone;
  return (
    <div>
      <AnalogClockPrivate
        showSecondHand={props.hands.second.show}
        smoothSeconds={props.hands.second.smooth}
        ticks={props.markers.ticks}
        labelStyle={props.labels.labelStyle}
        hourHandColor={props.hands.hour.color}
        minuteHandColor={props.hands.minute.color}
        secondHandColor={props.hands.second.color}
        centerDotColor={props.clockFace.centerDotColor}
        tickColor={props.markers.minuteTickColor}
        fiveMinuteTickColor={props.markers.fiveMinuteTickColor}
        hourLabelColor={props.labels.color}
        hourLabelFontSize={props.labels.hourLabelFontSize}
        hourHandLength={props.hands.hour.length}
        minuteHandLength={props.hands.minute.length}
        secondHandLength={props.hands.second.length}
        locale={config?.language}
        timezone={
          props.timezone.override === "user-settings"
            ? localTimezone
            : props.timezone.override
        }
      />
    </div>
  );
}

const sweep = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

export const config: ComponentConfig<AnalogClockProps> = {
  label: "AnalogClock",
  internalFields: {
    omit: {
      $appearance: {
        design: true,
        sizeAndSpacing: true,
        typography: true,
      }
    }
  },
  fields: {
    clockFace: {
      type: "object",
      label: "Face",
      description: "Face appearance configuration",
      section: { expanded: false },
      objectFields: {
        size: {
          type: "unit",
          label: "Size",
          description: "Overall clock width & height",
          default: "300px",
        },
        faceColor: {
          type: "color",
          label: "Face Color",
          description: "Fill color inside border",
          default: "var(--clr-primary-a70)",
        },
        borderColor: {
          type: "color",
          label: "Border Color",
          description: "Stroke color of outer frame",
          default: "var(--clr-surface-a0)",
        },
        borderSize: {
          type: "unit",
          label: "Border Size",
          description: "Thickness of the frame stroke",
          default: "10px",
        },
        centerDotColor: {
          type: "color",
          label: "Center Dot Color",
          description: "Color of central pivot dot",
          default: "var(--clr-primary-a0)",
        },
      },
    },
    hands: {
      type: "object",
      label: "Hands",
      description: "Hand styling & behavior",
      section: { expanded: false },
      objectFields: {
        hour: {
          type: "object",
          label: "Hour Hand",
          section: { expanded: false },
          objectFields: {
            color: {
              type: "color",
              label: "Color",
              description: "Stroke color of hour hand",
              default: "var(--clr-surface-a0)",
            },
            length: {
              type: "number",
              label: "Length",
              description: "Length (SVG units)",
              default: 60,
              min: 20,
              max: 120,
            },
          },
        },
        minute: {
          type: "object",
          label: "Minute Hand",
          section: { expanded: false },
          objectFields: {
            color: {
              type: "color",
              label: "Color",
              description: "Stroke color of minute hand",
              default: "var(--clr-surface-a0)",
            },
            length: {
              type: "number",
              label: "Length",
              description: "Length (SVG units)",
              default: 80,
              min: 30,
              max: 140,
            },
          },
        },
        second: {
          type: "object",
          label: "Second Hand",
          section: { expanded: false },
          objectFields: {
            show: {
              type: "switch",
              label: "Show",
              description: "Toggle second hand visibility",
              default: true,
            },
            smooth: {
              type: "switch",
              label: "Smooth Sweep",
              description: "Continuous motion vs ticks",
              default: false,
              visible: (data) => data.hands.second.show,
            },
            color: {
              type: "color",
              label: "Color",
              description: "Stroke color of second hand",
              default: "var(--clr-primary-a0)",
              visible: (data) => data.hands.second.show,
            },
            length: {
              type: "number",
              label: "Length",
              description: "Length (SVG units)",
              default: 100,
              min: 40,
              max: 160,
              visible: (data) => data.hands.second.show,
            },
          },
        },
      },
    },
    markers: {
      type: "object",
      label: "Markers",
      description: "Tick mark display options",
      section: { expanded: false },
      objectFields: {
        ticks: {
          type: "select",
          label: "Tick Density",
          description: "Which tick markers to show",
          default: "minute",
          options: [
            { label: "None", value: "none" },
            { label: "Quarter (0,15,30,45)", value: "quarter" },
            { label: "Hour (every 5)", value: "hour" },
            { label: "Minute (all)", value: "minute" },
          ],
        },
        minuteTickColor: {
          type: "color",
          label: "Minute Tick Color",
          description: "Color of minute (thin) ticks",
          default: "var(--clr-surface-a0)",
          visible: (data) => data.markers.ticks === "minute",
        },
        fiveMinuteTickColor: {
          type: "color",
          label: "5-Min Tick Color",
          description: "Color of hour/quarter ticks",
          default: "var(--clr-surface-a0)",
          visible: (data) => data.markers.ticks !== "none",
        },
      },
    },
    labels: {
      type: "object",
      label: "Labels",
      description: "Hour label appearance",
      section: { expanded: false },
      objectFields: {
        labelStyle: {
          type: "select",
          label: "Clock Labels",
          description: "Display style of hour labels",
          options: [
            { label: "None", value: "none" },
            { label: "Numbers", value: "numbers" },
            { label: "Roman", value: "roman" },
          ],
          default: "numbers",
        },
        hourLabelFontSize: {
          type: "unit",
          label: "Label Font Size",
          description: "Font size for labels (e.g. 20px)",
          default: "20px",
          visible: (data) => data.labels.labelStyle !== "none",
        },
        color: {
          type: "color",
          label: "Label Color",
          description: "Color for hour labels",
          default: "var(--clr-surface-a0)",
          visible: (data) => data.labels.labelStyle !== "none",
        },
      },
    },
    timezone: {
      type: "object",
      label: "Timezone",
      description: "Timezone configuration",
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
  styles(props) {
    return css`
      width: ${props.clockFace.size};
      height: ${props.clockFace.size};
      display: inline-block;
      position: relative;
      > svg {
        width: 100%;
        height: 100%;
        .frame {
          stroke: ${props.clockFace.borderColor};
          fill: ${props.clockFace.faceColor};
          stroke-width: ${props.clockFace.borderSize};
        }
        .hour-hand {
          animation: ${sweep} 43200s linear infinite;
        }
        .minute-hand {
          animation: ${sweep} 3600s linear infinite;
        }
        .second-hand {
          animation: ${sweep} 60s
            ${props.hands.second.smooth ? "linear" : "steps(60, end)"} infinite;
        }
        .hour-hand line {
          stroke: ${props.hands.hour.color};
        }
        .minute-hand line {
          stroke: ${props.hands.minute.color};
        }
        .second-hand line {
          stroke: ${props.hands.second.color};
        }
        .center-dot {
          fill: ${props.clockFace.centerDotColor};
        }
        .minute-marker {
          stroke: ${props.markers.minuteTickColor};
        }
        .five-minute-marker {
          stroke: ${props.markers.fiveMinuteTickColor};
        }
        .hour-label {
          fill: ${props.labels.color};
          font-size: ${props.labels.hourLabelFontSize};
        }
      }
    `;
  },
  render: Render,
};
