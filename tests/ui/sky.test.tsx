import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AssistantApp } from "@/components/AssistantApp";
import { SkyBand } from "@/components/SiteFrame";
import { SkyReading } from "@/components/SkyReading";
import { indianAqi } from "@/lib/domain/aqi";
import { axeViolations } from "../support/axe";
import { json, stubFetch } from "../support/fetch";
import { MODEL_READING, PLACE, STATION_READING, report } from "../support/fixtures";

describe("SkyReading", () => {
  it("shows today's index, its band and exactly where it was measured", async () => {
    const { container } = render(
      <SkyReading place={PLACE} aqi={indianAqi(STATION_READING)} reading={STATION_READING} />,
    );
    expect(screen.getByText("New Delhi right now")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("323Very poor");
    expect(
      screen.getByText("Measured at ITO, Delhi, 3.2 km away, at 12:00 am IST"),
    ).toBeInTheDocument();
    expect(screen.getByText(/set by PM2\.5/)).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("labels a model estimate, a nameless station and an index set by PM10", () => {
    const model = { ...MODEL_READING, pm25: 30, pm10: 300 };
    const first = render(<SkyReading place={PLACE} aqi={indianAqi(model)} reading={model} />);
    expect(screen.getByText("Model estimate for this spot at 12:00 am IST")).toBeInTheDocument();
    expect(screen.getByText(/set by PM10/)).toBeInTheDocument();
    first.unmount();
    const nameless = { ...STATION_READING, station: null };
    render(<SkyReading place={PLACE} aqi={indianAqi(nameless)} reading={nameless} />);
    expect(screen.getByText(/^Measured at a monitoring station, 3\.2 km away/)).toBeInTheDocument();
  });

  it("says it is reading the air until a reading arrives", () => {
    render(<SkyReading place={PLACE} aqi={null} reading={null} />);
    expect(screen.getByText("Reading the air…")).toBeInTheDocument();
  });
});

describe("SkyBand", () => {
  it("takes its colour from today's air, and a neutral sky before any reading", () => {
    const { container, rerender } = render(<SkyBand category={null}>x</SkyBand>);
    expect(container.firstElementChild).toHaveClass("sky", "sky-unknown");
    rerender(<SkyBand category="very-poor">x</SkyBand>);
    expect(container.firstElementChild).toHaveClass("sky-very-poor");
  });
});

describe("revealing the reading", () => {
  it("scrolls the new reading into view after a pick, but not for a place restored on load", async () => {
    stubFetch(() => json(report()));
    const scroll = vi.spyOn(Element.prototype, "scrollIntoView");
    localStorage.setItem("aqa:place:v1", JSON.stringify(PLACE));
    const user = userEvent.setup();
    render(<AssistantApp aiEnabled={false} />);
    await screen.findByText("323");
    expect(scroll).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /Mumbai commuter/ }));
    await screen.findByText("Mumbai right now");
    await screen.findByText("323");
    expect(scroll).toHaveBeenCalledWith({ block: "nearest" });
  });
});
