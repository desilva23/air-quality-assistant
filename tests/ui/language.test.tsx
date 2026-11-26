import { act, render, renderHook, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AssistantApp } from "@/components/AssistantApp";
import { ErrorScreen } from "@/components/ErrorScreen";
import { SourceNote } from "@/components/SourceNote";
import { LanguageProvider } from "@/components/i18n";
import { useSavedLanguage } from "@/lib/client/saved";
import { planFallback } from "@/lib/ai/fallbacks/plan";
import type { PlanRequest } from "@/lib/ai/contracts";
import { axeViolations } from "../support/axe";
import { bodyOf, json, stubFetch } from "../support/fetch";
import { report } from "../support/fixtures";

describe("Tamil", () => {
  it("switches the whole interface, the request and the plan to Tamil, and remembers it", async () => {
    const requests: PlanRequest[] = [];
    stubFetch((url, init) => {
      if (url.startsWith("/api/air")) return json(report());
      const request = bodyOf(init) as PlanRequest;
      requests.push(request);
      return json({ source: "fallback", data: planFallback(request), notice: "ai-off" });
    });
    const user = userEvent.setup();
    const { container, unmount } = render(<AssistantApp aiEnabled={false} />);
    const switcher = screen.getByRole("group", { name: "Language" });
    await user.click(within(switcher).getByRole("button", { name: "தமிழ்" }));

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("உங்கள் குடும்பத்துக்கான");
    expect(container.querySelector(".app")).toHaveAttribute("lang", "ta");
    expect(
      within(screen.getByRole("group", { name: "மொழி" })).getByRole("button", { name: "தமிழ்" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("AI அணைப்பில்: உள்ளமைந்த வழிகாட்டல்")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /சென்னைக் குடும்பம்/ }));
    expect(
      await screen.findByRole("heading", { name: "Chennai: இப்போதைய காற்று" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "இன்றைய திட்டத்தை உருவாக்கு" }));
    expect(
      await screen.findByText("இந்த சர்வரில் AI இயக்கப்படவில்லை; இது உள்ளமைந்த வழிகாட்டல்."),
    ).toBeInTheDocument();
    expect(requests[0]?.language).toBe("ta");
    expect(await axeViolations(container)).toEqual([]);

    unmount();
    render(<AssistantApp aiEnabled />);
    expect(screen.getByText("AI இயக்கத்தில் (Groq)")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "English" }));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Plan a cleaner-air day");
  });

  it("words the error screen and the built-in notices in the saved language", async () => {
    const saved = renderHook(() => useSavedLanguage());
    act(() => saved.result.current[1]("ta"));
    const reset = vi.fn();
    render(<ErrorScreen reset={reset} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "மீண்டும் முயல்க" }));
    expect(reset).toHaveBeenCalled();
    render(
      <LanguageProvider language="ta">
        <SourceNote source="fallback" notice="ai-failed" />
      </LanguageProvider>,
    );
    expect(screen.getByText("AI சேவை பதிலளிக்கவில்லை; இது உள்ளமைந்த வழிகாட்டல்.")).toBeInTheDocument();
  });
});
