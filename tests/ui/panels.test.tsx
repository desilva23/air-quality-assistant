import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AskPanel } from "@/components/AskPanel";
import { ErrorScreen } from "@/components/ErrorScreen";
import { PlaceSearch } from "@/components/PlaceSearch";
import { PlanPanel } from "@/components/PlanPanel";
import { SourceNote } from "@/components/SourceNote";
import { planFallback } from "@/lib/ai/fallbacks/plan";
import { axeViolations } from "../support/axe";
import { json, stubFetch } from "../support/fetch";
import { planRequest } from "../support/fixtures";

describe("PlaceSearch", () => {
  it("searches only with two letters or more, and says when nothing matched", async () => {
    const fetch = stubFetch(() => json({ places: [] }));
    const user = userEvent.setup();
    render(<PlaceSearch onSelect={vi.fn()} />);
    await user.type(screen.getByLabelText("Town or city"), "N{Enter}");
    expect(fetch).not.toHaveBeenCalled();
    await user.type(screen.getByLabelText("Town or city"), "owhere{Enter}");
    expect(await screen.findByText("No town in India matched that name.")).toBeInTheDocument();
  });

  it("lists places without a region by name, and shows search errors", async () => {
    stubFetch(() =>
      json({ places: [{ name: "Port Blair", region: null, latitude: 11.67, longitude: 92.74 }] }),
    );
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const { container } = render(<PlaceSearch onSelect={onSelect} />);
    await user.type(screen.getByLabelText("Town or city"), "Port{Enter}");
    await user.click(await screen.findByRole("button", { name: "Port Blair" }));
    expect(onSelect).toHaveBeenCalledWith({
      name: "Port Blair",
      region: null,
      latitude: 11.67,
      longitude: 92.74,
    });
    expect(await axeViolations(container)).toEqual([]);

    stubFetch(() => json({ error: "DATA_UNAVAILABLE" }, 503));
    await user.type(screen.getByLabelText("Town or city"), "x{Enter}");
    expect(await screen.findByText(/Live air data couldn't be fetched/)).toBeInTheDocument();
  });

  it("shows progress while locating and explains a refusal", async () => {
    let refuse: () => void = () => undefined;
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition: (_: unknown, failure: () => void) => (refuse = failure) },
    });
    const user = userEvent.setup();
    render(<PlaceSearch onSelect={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Use my location" }));
    expect(screen.getByRole("button", { name: "Finding you…" })).toBeDisabled();
    refuse();
    expect(await screen.findByText(/Your location wasn't shared/)).toBeInTheDocument();
    Reflect.deleteProperty(navigator, "geolocation");
  });
});

describe("PlanPanel", () => {
  const envelope = {
    source: "fallback" as const,
    data: planFallback(planRequest()),
    notice: "Built-in guidance.",
  };

  it("shows every part of the plan with its computed impact", async () => {
    const { container } = render(<PlanPanel envelope={envelope} />);
    expect(screen.getByRole("heading", { level: 5, name: "Evening" })).toBeInTheDocument();
    expect(
      screen.getByText(/cuts the PM2.5 you breathe during it by about 67%/),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Impact:").length).toBeGreaterThan(3);
    expect(await axeViolations(container)).toEqual([]);
  });

  it("copies the share message, or explains when copying isn't allowed", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    render(<PlanPanel envelope={envelope} />);
    await user.click(screen.getByRole("button", { name: "Copy message" }));
    expect(writeText).toHaveBeenCalledWith(envelope.data.plan.shareText);
    expect(
      await screen.findByText(/Copied\. Paste it into your family or society group/),
    ).toBeInTheDocument();
    writeText.mockRejectedValueOnce(new Error("denied"));
    await user.click(screen.getByRole("button", { name: "Copy message" }));
    expect(await screen.findByText(/Copying isn't allowed here/)).toBeInTheDocument();
  });
});

describe("AskPanel", () => {
  it("needs a real question, and shows the built-in answer's notice", async () => {
    const fetch = stubFetch(() =>
      json({ source: "fallback", data: { answer: "General guidance.", tips: [] } }),
    );
    const user = userEvent.setup();
    render(<AskPanel context={planRequest()} />);
    await user.type(screen.getByLabelText("Your question"), "Hi");
    await user.click(screen.getByRole("button", { name: "Ask" }));
    expect(fetch).not.toHaveBeenCalled();
    await user.type(screen.getByLabelText("Your question"), " there, is today ok?");
    await user.click(screen.getByRole("button", { name: "Ask" }));
    expect(await screen.findByText("General guidance.")).toBeInTheDocument();
    expect(screen.getByText("Built-in guidance.")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("shows errors", async () => {
    stubFetch(() => json({ error: "TOO_LARGE" }, 413));
    const user = userEvent.setup();
    render(<AskPanel context={planRequest()} />);
    await user.click(screen.getByRole("button", { name: "When should I open the windows today?" }));
    await user.click(screen.getByRole("button", { name: "Ask" }));
    expect(await screen.findByText(/That request is too long/)).toBeInTheDocument();
  });
});

describe("small pieces", () => {
  it("labels AI and built-in content", () => {
    render(<SourceNote source="fallback" />);
    expect(screen.getByText("Built-in guidance.")).toBeInTheDocument();
  });

  it("offers a retry when rendering fails", async () => {
    const reset = vi.fn();
    render(<ErrorScreen reset={reset} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Try again" }));
    expect(reset).toHaveBeenCalled();
  });
});
