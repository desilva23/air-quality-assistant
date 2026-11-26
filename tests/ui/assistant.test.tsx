import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AssistantApp } from "@/components/AssistantApp";
import { planFallback } from "@/lib/ai/fallbacks/plan";
import type { PlanRequest } from "@/lib/ai/contracts";
import { axeViolations } from "../support/axe";
import { bodyOf, json, stubFetch } from "../support/fetch";
import { report } from "../support/fixtures";

function stubApi() {
  return stubFetch((url, init) => {
    if (url.startsWith("/api/places")) {
      return json({
        places: [{ name: "Noida", region: "Uttar Pradesh", latitude: 28.58, longitude: 77.33 }],
      });
    }
    if (url.startsWith("/api/air")) return json(report());
    if (url === "/api/plan") {
      const request = bodyOf(init) as PlanRequest;
      return json({
        source: "fallback",
        data: planFallback(request),
        notice: "Built-in guidance for testing.",
      });
    }
    return json({
      source: "ai",
      data: { answer: "Not this evening; try 2 pm.", tips: ["Wear an N95."] },
    });
  });
}

describe("AssistantApp", () => {
  beforeEach(() => {
    stubApi();
  });

  it("goes from a sample household to live air, a plan and an answer", async () => {
    const user = userEvent.setup();
    const { container } = render(<AssistantApp aiEnabled={false} />);
    expect(screen.getByText("AI off: built-in guidance")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Build today's plan" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: /Delhi family/ }));
    expect(
      await screen.findByRole("heading", { name: "2. Air in New Delhi now" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("323")).toBeInTheDocument();
    expect(screen.getByLabelText("Children under 12")).toBeChecked();

    await user.click(screen.getByRole("button", { name: "Build today's plan" }));
    const plan = await screen.findByRole("heading", {
      level: 3,
      name: /Very poor air in New Delhi today/,
    });
    await waitFor(() => expect(plan).toHaveFocus());
    expect(screen.getByText("Built-in guidance for testing.")).toBeInTheDocument();

    await user.click(screen.getByLabelText("Adults over 60"));
    expect(screen.getByText(/changed since this plan was made/)).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Can my kids play outside this evening?" }),
    );
    await user.click(screen.getByRole("button", { name: "Ask" }));
    expect(await screen.findByText("Not this evening; try 2 pm.")).toBeInTheDocument();
    expect(screen.getByText(/Written by AI \(Groq\)/)).toBeInTheDocument();

    expect(await axeViolations(container)).toEqual([]);
  });

  it("searches for a town and loads its air", async () => {
    const user = userEvent.setup();
    render(<AssistantApp aiEnabled />);
    expect(screen.getByText("AI on (Groq)")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Town or city"), "Noida");
    await user.click(screen.getByRole("button", { name: "Search" }));
    const results = await screen.findByRole("list", { name: "Matching places" });
    await user.click(within(results).getByRole("button", { name: "Noida, Uttar Pradesh" }));
    expect(await screen.findByRole("heading", { name: "2. Air in Noida now" })).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Matching places" })).not.toBeInTheDocument();
  });

  it("offers a retry when live air can't be fetched", async () => {
    let fail = true;
    stubFetch(() => (fail ? json({ error: "DATA_UNAVAILABLE" }, 503) : json(report())));
    const user = userEvent.setup();
    render(<AssistantApp aiEnabled={false} />);
    await user.click(screen.getByRole("button", { name: /Mumbai commuter/ }));
    expect(
      await screen.findByText(/Live air data couldn't be fetched just now/),
    ).toBeInTheDocument();
    fail = false;
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("323")).toBeInTheDocument();
  });

  it("shows when a plan request fails", async () => {
    stubFetch((url) =>
      url.startsWith("/api/air") ? json(report()) : json({ error: "RATE_LIMITED" }, 429),
    );
    const user = userEvent.setup();
    render(<AssistantApp aiEnabled={false} />);
    await user.click(screen.getByRole("button", { name: /Kolkata seniors/ }));
    await screen.findByText("323");
    await user.click(screen.getByRole("button", { name: "Build today's plan" }));
    expect(await screen.findByText(/Too many requests in a short time/)).toBeInTheDocument();
    vi.restoreAllMocks();
  });
});
