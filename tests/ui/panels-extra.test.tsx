import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ChoicesPanel } from "@/components/ChoicesPanel";
import { CommutePanel } from "@/components/CommutePanel";
import { StationsPanel } from "@/components/StationsPanel";
import { axeViolations } from "../support/axe";
import { json, stubFetch } from "../support/fetch";
import { FAMILY, PLACE, household } from "../support/fixtures";

vi.mock("@/components/StationMap", () => ({
  StationMap: ({ label }: { label: string }) => <div role="region" aria-label={label} />,
}));

const STATIONS = [
  {
    name: "ITO, Delhi",
    latitude: 28.63,
    longitude: 77.24,
    distanceKm: 3.2,
    pm25: 180,
    measuredAt: "2026-11-26T09:30:00Z",
  },
  {
    name: "Lodhi Road",
    latitude: 28.59,
    longitude: 77.22,
    distanceKm: 2.4,
    pm25: 105,
    measuredAt: "2026-11-26T09:15:00Z",
  },
];

describe("StationsPanel", () => {
  it("lists nearby stations with their band and time beside the map", async () => {
    stubFetch(() => json({ enabled: true, stations: STATIONS }));
    const { container } = render(<StationsPanel place={PLACE} />);
    expect(await screen.findByRole("rowheader", { name: "ITO, Delhi" })).toBeInTheDocument();
    expect(
      await screen.findByRole("region", { name: /Map of nearby monitoring stations/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "The 2 nearest monitoring stations that reported in the last 3 hours, coloured by AQI band. The dark blue dot is you.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Very poor")).toBeInTheDocument();
    expect(screen.getByText("3:00 pm")).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("says when station readings are off, when none is fresh, and when the lookup fails", async () => {
    stubFetch(() => json({ enabled: false, stations: [] }));
    const off = render(<StationsPanel place={PLACE} />);
    expect(
      await screen.findByText("Station readings aren't set up on this server."),
    ).toBeInTheDocument();
    off.unmount();
    stubFetch(() => json({ enabled: true, stations: [] }));
    const none = render(<StationsPanel place={PLACE} />);
    expect(await screen.findByText(/^No monitoring station within 25 km/)).toBeInTheDocument();
    none.unmount();
    stubFetch(() => json({ error: "DATA_UNAVAILABLE" }, 503));
    render(<StationsPanel place={PLACE} />);
    expect(await screen.findByText(/Live air data couldn't be fetched/)).toBeInTheDocument();
  });
});

describe("ChoicesPanel", () => {
  it("shows today's dose for the household, and how much a mask and purifier cut it", async () => {
    const user = userEvent.setup();
    const { container } = render(<ChoicesPanel pm25={150} household={FAMILY} />);
    expect(container.querySelector(".dose")).toHaveTextContent(
      "About 4.9 cigarettes' worth of PM2.5 (1,358 µg breathed in today).",
    );
    expect(screen.queryByText(/These choices cut/)).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Mask you usually wear outside"), "N95 or FFP2");
    await user.click(screen.getByLabelText("We have an air purifier"));
    expect(screen.getByText(/^These choices cut your dose by/)).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("starts at an hour outdoors when the household has no outdoor time, and follows the slider", async () => {
    const { container } = render(
      <ChoicesPanel
        pm25={60}
        household={household({ activity: { kind: "none", partOfDay: "morning", minutes: 0 } })}
      />,
    );
    const slider = screen.getByLabelText(/Time outdoors today/);
    expect(slider).toHaveValue("60");
    const { fireEvent } = await import("@testing-library/react");
    fireEvent.change(slider, { target: { value: "180" } });
    expect(slider).toHaveAttribute("aria-valuetext", "180 minutes");
    expect(container.querySelector(".range-value")).toHaveTextContent("180 minutes");
  });
});

describe("CommutePanel", () => {
  it("compares every travel mode for the household's commute, marking theirs", async () => {
    const { container } = render(<CommutePanel household={FAMILY} />);
    expect(
      screen.getByText(
        "15 km each way, 5 days a week. CO₂ and petrol from India GHG Program factors.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("rowheader", { name: "Car (yours)" })).toBeInTheDocument();
    expect(screen.getByText("₹880")).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(8);
    expect(await axeViolations(container)).toEqual([]);
  });

  it("uses a sample trip when the household doesn't commute", () => {
    render(<CommutePanel household={household()} />);
    expect(screen.getByText(/^You haven't set a commute/)).toBeInTheDocument();
    expect(screen.queryByText("(yours)")).not.toBeInTheDocument();
  });
});

describe("panels in Tamil", () => {
  it("word the commute table in Tamil", async () => {
    const { LanguageProvider } = await import("@/components/i18n");
    render(
      <LanguageProvider language="ta">
        <CommutePanel household={FAMILY} />
      </LanguageProvider>,
    );
    expect(
      screen.getByRole("heading", { name: "உங்கள் பயணத்தைச் செய்யும் எல்லா வழிகளும்" }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("rowheader", { name: "கார் (உங்களுடையது)" })).toBeInTheDocument(),
    );
  });
});
