import type { Page } from "playwright";
// Presentation-only banner lives outside <main>, which is the agent's observation source.
// It contains no controls and does not influence element IDs or evidence checks.
export async function showWatchStatus(
  page: Page,
  ghostName: string,
  phase: string,
  message: string,
) {
  await page.evaluate(
    ({ ghostName, phase, message }) => {
      let banner = document.getElementById("ghostqa-watch-banner");
      if (!banner) {
        banner = document.createElement("aside");
        banner.id = "ghostqa-watch-banner";
        banner.style.cssText =
          "position:fixed;bottom:18px;left:18px;right:18px;z-index:2147483647;padding:18px 22px;border:1px solid #78bd92;border-radius:12px;background:#10241ff5;color:#e3f7eb;font:14px/1.5 Arial,sans-serif;box-shadow:0 6px 30px #0004;pointer-events:none";
        document.body.appendChild(banner);
      }
      banner.replaceChildren();
      const heading = document.createElement("strong");
      heading.textContent = `👻 ${ghostName} · ${phase}`;
      heading.style.cssText = "display:block;color:#a4edbd;margin-bottom:5px";
      const detail = document.createElement("div");
      detail.textContent = message;
      banner.append(heading, detail);
    },
    { ghostName, phase, message },
  );
}
