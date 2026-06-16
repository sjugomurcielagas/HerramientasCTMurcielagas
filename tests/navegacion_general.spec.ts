import { expect, Page, test } from '@playwright/test';

const BASE_URL =
  process.env.BASE_URL ?? 'https://sjugomurcielagas.github.io/HerramientasCTMurcielagas/';

const mainSections = [
  { name: 'Reportes', path: 'reportes/', heading: /Reportes/i },
  { name: 'Tactica', path: 'tactica/', heading: /T[aá]ctico|T[aá]ctica|Tablero/i },
  { name: 'Base de datos', path: 'base-datos/', heading: /Base de datos|Plantel/i },
  { name: 'Concentraciones', path: 'concentraciones/', heading: /Concentraciones/i },
  { name: 'Analisis', path: 'analisis/', heading: /An[aá]lisis|Analisis/i },
];

const analysisSections = [
  { name: 'Penales', path: 'analisis/penales/', heading: /Penales/i },
  { name: 'Partidos', path: 'analisis/partidos/', heading: /Partidos/i },
  { name: 'Rivales', path: 'analisis/rivales/', heading: /Rivales/i },
  { name: 'Pre-partido', path: 'analisis/precompetitivo/', heading: /Pre-partido|Precompetitivo/i },
];

function route(path = '') {
  return new URL(path, BASE_URL).toString();
}

function isRouteUrl(url: string, path = '') {
  const expected = new URL(path, BASE_URL);
  const current = new URL(url);
  return (
    current.origin === expected.origin &&
    current.pathname.replace(/index\.html$/, '') === expected.pathname.replace(/index\.html$/, '')
  );
}

async function waitForAppReady(page: Page) {
  await page.waitForLoadState('domcontentloaded');

  const app = page.locator('#appContent, main.app').first();
  if (await app.count()) {
    await app.waitFor({ state: 'attached', timeout: 15000 });
    await expect(app).not.toHaveClass(/hidden/, { timeout: 15000 });
    await expect(app).toBeVisible({ timeout: 15000 });
  }
}

async function login(page: Page) {
  await page.context().addInitScript(() => {
    localStorage.setItem('mrcl_auth', '1');
    localStorage.setItem('mrcl_auth_ts', String(Date.now()));
  });
  await page.goto(route());
  await waitForAppReady(page);
  await expect(page.locator('#loginView')).toBeHidden({ timeout: 15000 });
}

function monitorJavaScriptErrors(page: Page) {
  const errors: string[] = [];

  page.on('pageerror', error => {
    errors.push(error.message);
  });

  page.on('console', message => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (/ReferenceError|SyntaxError|Unhandled|Uncaught/i.test(text)) {
      errors.push(text);
    }
  });

  return {
    expectClean() {
      expect(errors, `Errores JavaScript detectados:\n${errors.join('\n')}`).toEqual([]);
    },
  };
}

async function expectNoVisibleErrorPage(page: Page) {
  await expect(page.locator('body')).not.toContainText(/404|Page not found|There isn't a GitHub Pages site here/i);
}

async function expectHomeVisible(page: Page) {
  await expect(page.locator('#appContent, main.app')).toBeVisible();
  await expect(page.getByRole('link', { name: /reportes/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /tablero|tact/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /base de datos/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /concentraciones/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /analisis|an[aá]lisis/i })).toBeVisible();
}

async function openSectionFromHome(page: Page, section: (typeof mainSections)[number]) {
  await page.locator(`a[href="./${section.path}"]`).click();
  await page.waitForURL(new RegExp(`/${section.path.replace('/', '\\/')}$`), { timeout: 15000 });
  await expect(page.locator('body')).toContainText(section.heading);
  await expectNoVisibleErrorPage(page);
}

test.describe('navegacion general', () => {
  test('login muestra Home y tarjetas principales', async ({ page }) => {
    const jsErrors = monitorJavaScriptErrors(page);

    await login(page);
    await expectHomeVisible(page);

    jsErrors.expectClean();
  });

  test('navega desde Home a cada seccion principal y vuelve con Inicio', async ({ page }) => {
    const jsErrors = monitorJavaScriptErrors(page);

    await login(page);

    for (const section of mainSections) {
      await page.goto(route());
      await expectHomeVisible(page);

      await openSectionFromHome(page, section);

      await page.getByRole('link', { name: /inicio/i }).first().click();
      await page.waitForURL(url => isRouteUrl(url.toString()));
      await expectHomeVisible(page);
    }

    jsErrors.expectClean();
  });

  test('rutas principales cargan directo despues de autenticar', async ({ page }) => {
    const jsErrors = monitorJavaScriptErrors(page);

    await login(page);

    for (const section of mainSections) {
      await page.goto(route(section.path));
      await expect(page.locator('body')).toContainText(section.heading);
      await expect(page.getByRole('link', { name: /inicio/i })).toBeVisible();
      await expectNoVisibleErrorPage(page);
    }

    jsErrors.expectClean();
  });

  test('Analisis permite abrir subherramientas y volver', async ({ page }) => {
    const jsErrors = monitorJavaScriptErrors(page);

    await login(page);
    await page.goto(route('analisis/'));

    for (const section of analysisSections) {
      await page.goto(route('analisis/'));
      await page.locator(`a[href="./${section.path.replace('analisis/', '')}"]`).click();
      await page.waitForURL(new RegExp(`/${section.path.replaceAll('/', '\\/')}$`), { timeout: 15000 });
      await expect(page.locator('body')).toContainText(section.heading);
      await expect(page.getByRole('link', { name: /an[aá]lisis|analisis/i })).toBeVisible();
      await expectNoVisibleErrorPage(page);

      await page.getByRole('link', { name: /an[aá]lisis|analisis/i }).first().click();
      await page.waitForURL(url => isRouteUrl(url.toString(), 'analisis/'));
      await expect(page.locator('body')).toContainText(/Penales/i);
    }

    jsErrors.expectClean();
  });

  test('enlaces internos visibles de rutas principales responden sin 404', async ({ page, request }) => {
    await login(page);

    for (const path of ['', ...mainSections.map(section => section.path)]) {
      await page.goto(route(path));
      await expectNoVisibleErrorPage(page);

      const internalLinks = await page.locator('a:visible').evaluateAll((links, baseUrl) => {
        const base = new URL(String(baseUrl));
        return [...new Set(
          links
            .map(link => (link as HTMLAnchorElement).href)
            .filter(Boolean)
            .filter(href => {
              const url = new URL(href);
              return (
                url.origin === base.origin &&
                url.pathname.startsWith(base.pathname) &&
                !url.hash &&
                !url.href.startsWith('javascript:')
              );
            }),
        )];
      }, BASE_URL);

      for (const href of internalLinks) {
        const response = await request.get(href, { failOnStatusCode: false });
        expect(response.status(), `Link interno roto en ${path || 'Home'}: ${href}`).toBeLessThan(400);
      }
    }
  });

  test('smoke mobile no genera scroll horizontal ni oculta navegacion principal', async ({ page }) => {
    const jsErrors = monitorJavaScriptErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });

    await login(page);
    await expectHomeVisible(page);
    const homeHasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(homeHasHorizontalOverflow, 'Scroll horizontal inesperado en Home').toBe(false);

    for (const section of [mainSections[1], mainSections[3], mainSections[4]]) {
      await page.goto(route(section.path));
      await expect(page.locator('body')).toContainText(section.heading);
      await expect(page.getByRole('link', { name: /inicio/i })).toBeVisible();

      const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      expect(hasHorizontalOverflow, `Scroll horizontal inesperado en ${section.name}`).toBe(false);
    }

    jsErrors.expectClean();
  });
});
