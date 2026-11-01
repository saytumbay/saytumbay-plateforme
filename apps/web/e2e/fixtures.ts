import { test as base, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/** Tuiles de carte remplacées (pas de réseau externe en test) et erreurs console collectées. */
export const test = base.extend<{ errors: string[] }>({
  errors: async ({ page }, use) => {
    const errors: string[] = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route(/arcgisonline|tile\.openstreetmap/, (r) => r.fulfill({ status: 204 }));
    await use(errors);
  },
});
export { expect };

export async function demoLogin(page: Page, persona: "Responsable de coopérative" | "Technicien terrain" | "Équipe SaytuMbay") {
  await page.goto("/connexion");
  await page.getByRole("button", { name: new RegExp(persona) }).click();
  await page.waitForURL(/\/(app|admin)/);
}

/** Violations axe graves ou critiques (WCAG 2.1 A/AA). */
export async function axe(page: Page) {
  // Les notifications éphémères (en cours d'animation d'opacité) faussent le calcul de contraste : exclues.
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).exclude("[data-sonner-toaster]").analyze();
  return r.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id} (${v.nodes.length}) : ${v.nodes[0]?.target.join(" ")}`);
}

export async function noHorizontalScroll(page: Page) {
  // Le titre s'affiche avant les données : on attend la fin du chargement, sinon un tableau trop large passe inaperçu.
  await expect(page.locator('main [role="status"][aria-label="Chargement"]')).toHaveCount(0);
  // En émulation mobile, le navigateur dézoome une page trop large (innerWidth grandit) : on compare à la largeur d'écran.
  return page.evaluate(() => document.documentElement.scrollWidth <= Math.min(document.documentElement.clientWidth, window.screen.width) + 1);
}
