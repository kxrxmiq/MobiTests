import { test, expect } from '@playwright/test';

const urls = [
  'https://esimplus.me/',
  'https://esimplus.me/virtual-number',
  'https://esimplus.me/esim',
  'https://esimplus.me/esim-argentina',
  'https://esimplus.me/virtual-phone-number/united-kingdom',
];

const urlsLoc = [
  { url: 'https://esimplus.me/ru', expectedLang: 'ru', href: 'https://esimplus.me/ru/esim', lang: 'ru'},
  { url: 'https://esimplus.me/',  expectedLang: 'en', href: 'https://esimplus.me/esim', lang: 'en' },
  { url: 'https://esimplus.me/es', expectedLang: 'es', href: 'https://esimplus.me/es/esim', lang: 'es' },
  { url: 'https://esimplus.me/fr', expectedLang: 'fr', href: 'https://esimplus.me/fr/esim', lang: 'fr' },
  { url: 'https://esimplus.me/de', expectedLang: 'de', href: 'https://esimplus.me/de/esim', lang: 'de' },
  { url: 'https://esimplus.me/pt', expectedLang: 'pt', href: 'https://esimplus.me/pt/esim', lang: 'pt' },
  { url: 'https://esimplus.me/pl', expectedLang: 'pl', href: 'https://esimplus.me/pl/esim', lang: 'pl' },
  { url: 'https://esimplus.me/it', expectedLang: 'it', href: 'https://esimplus.me/it/esim', lang: 'it' },
];

for (const url of urls) {
  test(`Проверка на тег link с rel=canonical на ${url}`, async ({ page }) => {
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    const canonicalHref = await page.locator('link[rel="canonical"]').getAttribute('href');

    expect(canonicalHref).not.toBeNull();

    const normalizedActual = canonicalHref?.replace(/\/+$/, '').toLowerCase();
    const normalizedExpected = url.replace(/\/+$/, '').toLowerCase();

    expect(normalizedActual).toBe(normalizedExpected);

    console.log(`link с rel=canonical на ${url} имеется`);
  });
}

test('Проверка наличия favicon', async ({ page }) => {
  await page.goto('https://esimplus.me/', { waitUntil: 'domcontentloaded' });

  const faviconHref = await page
    .locator('link[rel="icon"], link[rel="shortcut icon"]')
    .first()
    .getAttribute('href');

  expect(faviconHref).not.toBeNull();
  console.log('Favicon имеется. Путь:', faviconHref);
});

for (const { url, expectedLang } of urlsLoc) {
  test(`lang атрибут на ${url} должен быть "${expectedLang}"`, async ({ page }) => {
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    const langAttr = await page.locator('html').getAttribute('lang');
    expect(langAttr).not.toBeNull();

    expect(langAttr?.toLowerCase()).toBe(expectedLang);

    console.log(`lang атрибут на ${url} : "${expectedLang}"`);
  });
}

test('Проверка наличия link alternate со всеми поддерживаемыми языками', async ({ page }) => {
  await page.goto('https://esimplus.me/esim?showAll=true', { waitUntil: 'domcontentloaded' });

  for (const { lang, href } of urlsLoc) {
    const locator = page.locator(`link[rel="alternate"][hreflang="${lang}"]`);
    await expect(locator).toHaveAttribute('href', href);
  }
});