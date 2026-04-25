import { expect, test } from "@playwright/test";

test("keeps the consent shell contained and reaches world mode with mocked media", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const mediaDevices = {
      getUserMedia: async () => new MediaStream(),
    };
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: mediaDevices,
    });

    class MockWebSocket {
      static OPEN = 1;
      readyState = 1;
      private listeners: Record<string, Array<(event?: unknown) => void>> = {};

      constructor() {
        window.setTimeout(() => {
          this.emit("open");
          this.emit("message", {
            data: JSON.stringify({
              type: "session.accepted",
              payload: {
                session_id: "51d13dbf-8352-4c8b-a500-fcbf378ab6eb",
                room_id: "room_void_01",
              },
              ts: Date.now(),
            }),
          });
        }, 0);
      }

      addEventListener(type: string, handler: (event?: unknown) => void) {
        this.listeners[type] ??= [];
        this.listeners[type].push(handler);
      }

      send() {}

      close() {
        this.emit("close");
      }

      private emit(type: string, event?: unknown) {
        for (const handler of this.listeners[type] ?? []) {
          handler(event);
        }
      }
    }

    Object.defineProperty(window, "WebSocket", {
      configurable: true,
      value: MockWebSocket,
    });
  });

  await page.route("**/api/v1/sessions/init", async (route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        session_id: "51d13dbf-8352-4c8b-a500-fcbf378ab6eb",
        access_token: "token",
        expires_at: "2026-04-24T18:00:00Z",
        consent: {
          microphone: false,
          camera: false,
          local_biometrics: false,
          audio: false,
          presence: false,
        },
        room_id: "room_void_01",
        world_state: {
          mode: "void",
          seed: "seed",
          entropy: 0.2,
          fog_density: 0.5,
          bloom_strength: 0.3,
          particle_density: 0.4,
          gravity: 0.4,
          color_temperature: 0.3,
          palette: ["#000000", "#050507", "#72F7FF", "#8A5CFF", "#5FFFC2"],
          typography_weight: 400,
          audio_intensity: 0.2,
        },
        feature_flags: {
          webgpu_enabled: true,
          webgl_fallback_enabled: true,
          local_biometrics_enabled: true,
          audio_reactive_enabled: true,
          websocket_enabled: true,
          echoes_enabled: false,
        },
      }),
    });
  });

  await page.route("**/api/v1/sessions/consent", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        session_id: "51d13dbf-8352-4c8b-a500-fcbf378ab6eb",
        consent: {
          microphone: true,
          camera: true,
          local_biometrics: false,
          audio: true,
          presence: true,
        },
        world_state: {
          mode: "crystal",
          seed: "seed",
          entropy: 0.24,
          fog_density: 0.45,
          bloom_strength: 0.38,
          particle_density: 0.48,
          gravity: 0.42,
          color_temperature: 0.36,
          palette: ["#000000", "#050507", "#72F7FF", "#8A5CFF", "#5FFFC2"],
          typography_weight: 500,
          audio_intensity: 0.34,
        },
      }),
    });
  });

  await page.goto("/");
  await expect(page.locator(".hero-copy .eyebrow")).toHaveText("AETHERIS");
  await page.waitForSelector(".consent-card");

  const consentViewportMetrics = await page.evaluate(() => ({
    rootWidth: document.documentElement.clientWidth,
    rootHeight: document.documentElement.clientHeight,
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight,
    shellWidth: document.querySelector(".aetheris-root")?.scrollWidth ?? 0,
    shellHeight: document.querySelector(".aetheris-root")?.scrollHeight ?? 0,
  }));

  expect(consentViewportMetrics.scrollWidth).toBeLessThanOrEqual(consentViewportMetrics.rootWidth);
  expect(consentViewportMetrics.scrollHeight).toBeLessThanOrEqual(
    consentViewportMetrics.rootHeight,
  );
  expect(consentViewportMetrics.shellWidth).toBeLessThanOrEqual(consentViewportMetrics.rootWidth);
  expect(consentViewportMetrics.shellHeight).toBeLessThanOrEqual(
    consentViewportMetrics.rootHeight,
  );

  await page.getByLabel("Camera-based local framing").click();
  await page.getByRole("button", { name: "Begin calibration" }).click();
  await expect(page.locator(".detail-panel")).toBeVisible();
});
