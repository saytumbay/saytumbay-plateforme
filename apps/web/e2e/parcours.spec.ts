import { axe, demoLogin, expect, noHorizontalScroll, test } from "./fixtures";

test.describe("site public", () => {
  test("accueil : contenu, accessibilité, pas d'erreur ni de débordement", async ({ page, errors }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Voir la perte");
    await expect(page.getByRole("img", { name: /sort un oignon rouge/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Simple comme un SMS." })).toBeAttached();
    expect(await noHorizontalScroll(page)).toBe(true);
    expect(await axe(page)).toEqual([]);
    expect(errors).toEqual([]);
  });

  test("thème sombre : accueil et « Notre histoire » restent lisibles", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Simple comme un SMS." })).toBeVisible();
    expect(await axe(page), "/").toEqual([]);
    await page.goto("/a-propos");
    await expect(page.getByRole("heading", { level: 3, name: "Investisseurs, bailleurs, incubateurs" })).toBeVisible();
    expect(await axe(page), "/a-propos").toEqual([]);
  });

  test("formulaire de contact : validation puis message rédigé dans WhatsApp (site sans serveur)", async ({ page }) => {
    // L'ouverture de WhatsApp est interceptée : on vérifie l'adresse rédigée sans quitter la page.
    await page.addInitScript(() => {
      (window as unknown as { opened: string[] }).opened = [];
      window.open = (u?: string | URL) => ((window as unknown as { opened: string[] }).opened.push(String(u)), null);
    });
    await page.goto("/#contact");
    await page.getByRole("button", { name: "Envoyer par WhatsApp" }).click();
    await expect(page.getByText("Indiquez votre nom")).toBeVisible();
    await page.getByLabel("Nom et prénom").fill("Awa Test");
    await page.getByLabel("Téléphone ou WhatsApp").fill("77 123 45 67");
    await page.getByLabel("Votre message", { exact: true }).fill("Trois parcelles d’oignon à Mboro, surveillance de l’humidité.");
    await page.getByRole("checkbox", { name: /J’accepte que SaytuMbay/ }).click();
    await page.getByRole("button", { name: "Envoyer par WhatsApp" }).click();
    await expect(page.getByRole("status")).toBeVisible();
    const url = decodeURIComponent(await page.evaluate(() => (window as unknown as { opened: string[] }).opened[0] ?? ""));
    expect(url).toContain("wa.me/221778335781");
    expect(url).toContain("Trois parcelles d’oignon à Mboro");
    expect(url).toContain("Téléphone : 77 123 45 67");
    await expect(page.getByRole("status")).toContainText("votre message est prêt dans WhatsApp");
    await expect(page.getByRole("link", { name: "Ouvrir WhatsApp" })).toHaveAttribute("href", /wa\.me\/221778335781\?text=/);
  });

  test("pages légales accessibles", async ({ page }) => {
    for (const path of ["/confidentialite", "/securite", "/cookies"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(await axe(page), path).toEqual([]);
    }
  });

  test("pages détaillées : AgriTech, Onion, Notre histoire", async ({ page, errors }) => {
    for (const [path, title] of [
      ["/agritech", /Arroser juste/],
      ["/onion", /Sauver le stock/],
      ["/a-propos", /Voir la perte/],
    ] as const) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toContainText(title);
      expect(await noHorizontalScroll(page), path).toBe(true);
      expect(await axe(page), path).toEqual([]);
    }
    expect(errors).toEqual([]);
  });
});

test.describe("connexion", () => {
  test("mauvais mot de passe : message clair, pas de fuite d'information", async ({ page }) => {
    await page.goto("/connexion");
    await page.getByLabel("Adresse e-mail").fill("awa.ndiaye@demo.saytumbay.com");
    await page.getByLabel("Mot de passe", { exact: true }).fill("mauvais");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page.getByRole("alert")).toContainText("E-mail ou mot de passe incorrect");
  });

  test("console : double authentification exigée", async ({ page }) => {
    await page.goto("/connexion");
    await page.getByLabel("Adresse e-mail").fill("mame.sow@demo.saytumbay.com");
    await page.getByLabel("Mot de passe", { exact: true }).fill("Demo-SaytuMbay-2026");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page.getByRole("heading", { name: "Vérification en deux étapes" })).toBeVisible();
    await page.getByLabel("Code de vérification").fill("246810");
    await page.waitForURL(/\/admin/);
    await expect(page.getByRole("heading", { name: "Clients et parc" })).toBeVisible();
  });
});

test.describe("espace client", () => {
  test("tableau de bord : alertes, parcelles, accessibilité", async ({ page, errors }) => {
    await demoLogin(page, "Responsable de coopérative");
    await expect(page.getByRole("heading", { name: /Bonjour Awa/ })).toBeVisible();
    await expect(page.getByText("Parcelle B est sèche").first()).toBeVisible();
    expect(await noHorizontalScroll(page)).toBe(true);
    expect(await axe(page)).toEqual([]);
    expect(errors).toEqual([]);
  });

  test("lancer puis arrêter une irrigation", async ({ page }) => {
    await demoLogin(page, "Responsable de coopérative");
    await page.goto("/app/irrigation");
    await page.getByRole("button", { name: /^Arroser/ }).first().click();
    const sheet = page.getByRole("dialog");
    await sheet.getByRole("button", { name: /^Arroser \d+ min/ }).click();
    await expect(sheet).toBeHidden();
    await expect(page.getByRole("button", { name: /^Arrêter/ }).first()).toBeVisible();
    await page.getByRole("button", { name: /^Arrêter/ }).first().click();
    await expect(page.getByText("Irrigation arrêtée. La vanne est fermée.")).toBeVisible();
  });

  test("pages principales sans erreur ni débordement", async ({ page, errors }) => {
    await demoLogin(page, "Responsable de coopérative");
    for (const path of ["/app/parcelles", "/app/parcelles/p-b", "/app/irrigation", "/app/capteurs", "/app/alertes", "/app/taches", "/app/membres", "/app/rapports", "/app/onion", "/app/onion/entrepots/wh-mboro", "/app/onion/lots", "/app/onion/rapports", "/app/parametres"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(await noHorizontalScroll(page), path).toBe(true);
    }
    expect(errors).toEqual([]);
  });

  test("un technicien ne voit pas les actions réservées", async ({ page }) => {
    await demoLogin(page, "Technicien terrain");
    await page.goto("/app/membres");
    await expect(page.getByRole("button", { name: /Inviter/ })).toHaveCount(0);
  });
});

test.describe("console", () => {
  test("pages de la console sans erreur ni débordement", async ({ page, errors }) => {
    await demoLogin(page, "Équipe SaytuMbay");
    for (const path of ["/admin/clients", "/admin/clients/org-thies", "/admin/parc", "/admin/facturation", "/admin/couts", "/admin/utilisateurs", "/admin/journal"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(await noHorizontalScroll(page), path).toBe(true);
    }
    // Écran d'ordinateur portable zoomé : la facturation (tableau le plus large) ne doit pas élargir la page.
    if (!test.info().project.name.includes("telephone")) {
      await page.goto("/admin/facturation");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      for (const width of [1280, 1024, 800]) {
        await page.setViewportSize({ width, height: 860 });
        expect(await noHorizontalScroll(page), `facturation à ${width} px`).toBe(true);
      }
    }
    expect(await axe(page)).toEqual([]);
    expect(errors).toEqual([]);
  });
});
