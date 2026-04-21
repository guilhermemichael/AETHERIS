import { expect, test } from "@playwright/test";

test("loads the ritual shell", async ({ page }) => {
  await page.route("**/api/v1/sessions/init", async (route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        session_id: "sess_playwright",
        access_token: "token",
        seed: "seed",
        room_id: "room_void_01",
        consent_required: ["audio_reactive"],
        world_state: {
          mode: "ritual",
          fog_density: 0.5,
          gravity: 0.4,
          bloom: 0.3,
          entropy: 0.2,
          particle_count: 1000,
          palette: ["#05070B", "#68F0DA", "#8E6CFF", "#72D4A4"],
          typography_weight: 400,
          soundscape: "silent_depth",
          reveal_radius: 0.2,
          collective_luminosity: 0.3,
        },
        feature_flags: {
          webgpu_preferred: true,
          reactive_audio: true,
          brush_reveal: true,
          social_presence: false,
          temporal_echoes: false,
        },
      }),
    });
  });

  await page.goto("/");
  await expect(page.locator(".hero-copy .eyebrow")).toHaveText("AETHERIS");
  await page.waitForSelector(".consent-panel");

  const consentViewportMetrics = await page.evaluate(() => ({
    rootWidth: document.documentElement.clientWidth,
    rootHeight: document.documentElement.clientHeight,
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight,
    shellWidth: document.querySelector(".app-shell")?.scrollWidth ?? 0,
    shellHeight: document.querySelector(".app-shell")?.scrollHeight ?? 0,
  }));

  expect(consentViewportMetrics.scrollWidth).toBeLessThanOrEqual(consentViewportMetrics.rootWidth);
  expect(consentViewportMetrics.scrollHeight).toBeLessThanOrEqual(
    consentViewportMetrics.rootHeight,
  );
  expect(consentViewportMetrics.shellWidth).toBeLessThanOrEqual(consentViewportMetrics.rootWidth);
  expect(consentViewportMetrics.shellHeight).toBeLessThanOrEqual(
    consentViewportMetrics.rootHeight,
  );
});

