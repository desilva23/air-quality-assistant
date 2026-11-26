import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import ErrorPage from "@/app/error";
import RootLayout, { metadata, viewport } from "@/app/layout";
import Home from "@/app/page";
import { ErrorScreen } from "@/components/ErrorScreen";

vi.mock("next/server", () => ({ connection: vi.fn(() => Promise.resolve()) }));
vi.mock("@/app/globals.css", () => ({}));
// next/font is a build-time transform; here each font is just its CSS variable class.
vi.mock("next/font/google", () => ({
  Baloo_2: () => ({ variable: "font-display" }),
  Mukta: () => ({ variable: "font-body" }),
}));

describe("app shell", () => {
  it("sets the language, a skip link and the page's description", () => {
    const html = renderToStaticMarkup(
      <RootLayout>
        <p>content</p>
      </RootLayout>,
    );
    expect(html).toContain('<html lang="en-IN" class="font-display font-body">');
    expect(html).toContain('<a href="#main" class="skip-link">Skip to content</a>');
    expect(metadata.title).toBe("Urban Air Quality Assistant");
    expect(viewport.themeColor).toHaveLength(2);
  });

  it("renders per request and tells the app whether AI is on", async () => {
    vi.stubEnv("GROQ_API_KEY", "");
    expect((await Home()).props.aiEnabled).toBe(false);
    vi.stubEnv("GROQ_API_KEY", "gsk-test");
    expect((await Home()).props.aiEnabled).toBe(true);
  });

  it("uses the error screen for render failures", () => {
    expect(ErrorPage).toBe(ErrorScreen);
  });
});
