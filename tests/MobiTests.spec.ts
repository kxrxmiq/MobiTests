import { test, expect } from '@playwright/test';

const baseDomain = 'https://esimplus.me';
const supportedLangs = ['en', 'ru', 'es', 'fr', 'de', 'pt', 'pl', 'it'] as const;

const localizeUrl = (pathname: string, locale: string = 'en') => {
  return locale === 'en' 
    ? `${baseDomain}/${pathname.replace(/^\//, '')}` 
    : `${baseDomain}/${locale}/${pathname.replace(/^\//, '')}`;
};

const testPages = [
  baseDomain,
  `${baseDomain}/virtual-phone-number/united-kingdom`
];

const requiredMetaTags = [
  'og:title',
  'og:description',
  'og:locale',
  'og:type',
  'og:url',
  'og:site_name',
  'og:image',
  'twitter:card',
  'twitter:title',
  'twitter:description',
  'twitter:image'
];

const testUrls = [
  '',
  'virtual-number',
  'esim',
  'esim-argentina',
  'virtual-phone-number/united-kingdom',
].map(path => localizeUrl(path));

testUrls.forEach(url => {
  test(`Check canonical link tag for ${url}`, async ({ page }) => {
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    const canonicalHref = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonicalHref).not.toBeNull();

    const normalizedActual = canonicalHref?.replace(/\/+$/, '').toLowerCase();
    const normalizedExpected = url.replace(/\/+$/, '').toLowerCase();
    expect(normalizedActual).toBe(normalizedExpected);
  });
});

test('Check favicon exists', async ({ page }) => {
  await page.goto(baseDomain, { waitUntil: 'domcontentloaded' });

  const favicon = page.locator('link[rel="icon"], link[rel="shortcut icon"]').first();
  await expect(favicon).toHaveAttribute('href', /\.ico$/i);
});

supportedLangs.forEach(locale => {
  test(`Check lang attribute for ${locale} locale`, async ({ page }) => {
    const url = localizeUrl('', locale);
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    const langAttr = await page.locator('html').getAttribute('lang');
    expect(langAttr?.toLowerCase()).toBe(locale);
  });
});

test('Check alternate language links', async ({ page }) => {
  await page.goto(localizeUrl('esim?showAll=true'), { waitUntil: 'domcontentloaded' });

  for (const locale of supportedLangs) {
    const expectedHref = localizeUrl('esim', locale);
    const locator = page.locator(`link[rel="alternate"][hreflang="${locale}"]`);
    await expect(locator).toHaveAttribute('href', expectedHref);
  }
});

testPages.forEach(url => {
  test(`Check meta tags on ${url}`, async ({ page }) => {
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    for (const tag of requiredMetaTags) {
      const selector = tag.startsWith('og:') 
        ? `meta[property="${tag}"]` 
        : `meta[name="${tag}"]`;
      
      const metaElement = page.locator(selector);
      await expect(metaElement).toHaveCount(1);
      
      const content = await metaElement.getAttribute('content');
      expect(content).toBeTruthy();
      
      if (tag === 'og:url' || tag === 'og:image') {
        expect(content).toMatch(new RegExp(`^https?://`));
      }
      
      if (tag === 'og:type') {
        expect(['website', 'article']).toContain(content?.toLowerCase());
      }
    }
  });
});

test('Check sitemap.xml exists and contains required URLs', async ({ request }) => {
  const sitemapUrl = `${baseDomain}/sitemap.xml`;
  const response = await request.get(sitemapUrl);
  
  expect(response.ok(), `Sitemap request failed with status ${response.status()}`).toBeTruthy();
  
  const sitemapContent = await response.text();
  
  expect(sitemapContent, 'Sitemap content is empty').toBeTruthy();
  expect(sitemapContent, 'Sitemap is not valid XML').toContain('<?xml');
  expect(sitemapContent, 'Sitemap is missing urlset').toContain('<urlset');
  
  const normalizeUrl = (url: string) => url.replace(/\/+$/, '').toLowerCase();
  
  const requiredUrls = [
    `${baseDomain}/`,
    `${baseDomain}/ru`,
    `${baseDomain}/es`
  ].map(normalizeUrl);
  
  const locElements = sitemapContent.match(/<loc>(.*?)<\/loc>/gi) || [];
  const sitemapUrls = locElements.map(el => {
    const url = el.replace(/<\/?loc>/gi, '').trim();
    return normalizeUrl(url);
  });
  
  for (const requiredUrl of requiredUrls) {
    expect(
      sitemapUrls, 
      `Sitemap is missing URL: ${requiredUrl}`
    ).toContain(requiredUrl);
  }
  
  if (sitemapUrls.length === 0) {
    console.warn('Sitemap contains no URLs:', sitemapContent);
  }
});

const pagesToCheck = [
  `${baseDomain}/`,
  `${baseDomain}/ru`,
  `${baseDomain}/virtual-phone-number/united-kingdom`
];

pagesToCheck.forEach(url => {
  test(`Check robots meta tag on ${url}`, async ({ page }) => {
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    const robotsMeta = page.locator('meta[name="robots"]');
    await expect(robotsMeta).toHaveCount(1);
    
    const contentValue = await robotsMeta.getAttribute('content');
    expect(contentValue?.toLowerCase()).toBe('index, follow');
  });
});