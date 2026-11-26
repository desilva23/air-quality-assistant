import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { AirNow } from "@/components/AirNow";
import { OutlookChart } from "@/components/OutlookChart";
import { outlookScale } from "@/components/outlook-scale";
import { axeViolations } from "../support/axe";
import { MODEL_READING, outlookFrom, report } from "../support/fixtures";

describe("AirNow", () => {
  it("shows the index, its meaning, and exactly where and when it was measured", async () => {
    const { container } = render(<AirNow report={report()} />);
    expect(screen.getByText("323")).toBeInTheDocument();
    expect(screen.getByText("Very poor", { selector: ".aqi-label" })).toBeInTheDocument();
    expect(screen.getByText("Respiratory illness on prolonged exposure.")).toBeInTheDocument();
    expect(screen.getByText("OpenAQ (CPCB)")).toBeInTheDocument();
    expect(screen.getByText("ITO, Delhi, 3.2 km away")).toBeInTheDocument();
    expect(screen.getByText("Measured")).toBeInTheDocument();
    expect(screen.getByText("12:00 am IST")).toBeInTheDocument();
    expect(screen.getByText("220 µg/m³")).toBeInTheDocument();
    expect(screen.getByText("6.8 cigarettes")).toBeInTheDocument();
    expect(screen.getByText(/the WHO 24-hour guideline \(15 µg\/m³\)/)).toHaveTextContent(
      "PM2.5 is 10× the WHO 24-hour guideline (15 µg/m³).",
    );
    expect(await axeViolations(container)).toEqual([]);
  });

  it("labels a model estimate, explains why, and copes without PM10 or a station name", () => {
    const model = render(
      <AirNow
        report={report({
          reading: { ...MODEL_READING, pm25: 30, pm10: 300 },
          note: "No station nearby.",
        })}
      />,
    );
    expect(screen.getByText("Model estimate for this spot")).toBeInTheDocument();
    expect(screen.getByText(/WHO 24-hour guideline/)).toHaveTextContent("PM2.5 is 2×");
    expect(screen.getByText("For")).toBeInTheDocument();
    expect(screen.getByText("No station nearby.")).toBeInTheDocument();
    expect(screen.getByText(/set by PM10/)).toBeInTheDocument();
    model.unmount();
    const noPm10 = render(
      <AirNow report={report({ reading: { ...MODEL_READING, pm25: 12, pm10: null } })} />,
    );
    expect(screen.queryByText("PM10")).not.toBeInTheDocument();
    expect(
      screen.getByText("PM2.5 is within the WHO 24-hour guideline (15 µg/m³)."),
    ).toBeInTheDocument();
    noPm10.unmount();
    render(<AirNow report={report({ reading: { ...report().reading, station: null } })} />);
    expect(screen.getByText("Monitoring station, 3.2 km away")).toBeInTheDocument();
  });
});

describe("OutlookChart", () => {
  it("summarises the forecast for screen readers and picks out the cleanest hour", async () => {
    const { container } = render(
      <OutlookChart
        outlook={outlookFrom([
          200, 210, 220, 230, 240, 250, 240, 230, 220, 120, 60, 90, 100, 120, 140, 160, 180, 200,
          210, 220, 230, 240, 250, 260, 270,
        ])}
        source="Open-Meteo (CAMS model)"
      />,
    );
    expect(
      screen.getByRole("img", {
        name: /ranges from 60 to 260 µg\/m³\. Cleanest waking hour: 10:00 am, 60 µg\/m³ \(Satisfactory\)/,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Cleanest waking hour: 10:00 am/)).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(25);
    expect(await axeViolations(container)).toEqual([]);
  });

  it("reads out the hour under the pointer", async () => {
    const user = userEvent.setup();
    const { container } = render(<OutlookChart outlook={outlookFrom([100, 50])} source={null} />);
    const bars = Array.from(container.querySelectorAll(".bars li"));
    const readout = container.querySelector(".outlook-readout");
    await user.hover(bars[0] ?? container);
    expect(readout).toHaveTextContent("12:00 am, 100 µg/m³ (Poor)");
    await user.unhover(bars[0] ?? container);
    expect(readout?.textContent).toBe("");
  });

  it("says so when there's no forecast, or no waking hour in it", () => {
    const empty = render(<OutlookChart outlook={[]} source={null} />);
    expect(
      screen.getByText("No hourly forecast is available for this place right now."),
    ).toBeInTheDocument();
    empty.unmount();
    render(<OutlookChart outlook={outlookFrom([80, 90])} source={null} />);
    expect(
      screen.getByRole("img", {
        name: "Forecast PM2.5 for the next 2 hours ranges from 80 to 90 µg/m³.",
      }),
    ).toBeInTheDocument();
  });
});

describe("outlookScale", () => {
  it("always shows the daily limit and keeps to clean ticks", () => {
    expect(outlookScale(outlookFrom([20, 30])).ticks).toEqual([0, 20, 40, 60, 80]);
    expect(outlookScale(outlookFrom([150])).ticks).toEqual([0, 50, 100, 150, 200]);
    expect(outlookScale(outlookFrom([700])).max).toBe(800);
    expect(outlookScale(outlookFrom([1500])).max).toBe(1800);
    expect(outlookScale(outlookFrom([150])).percent(400)).toBe(100);
  });
});
