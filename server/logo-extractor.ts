/**
 * Enhanced logo extraction for ATS platforms
 * Tries multiple approaches to find company logos
 */

import * as cheerio from 'cheerio';

interface LogoExtractionResult {
  logo: string | null;
  source: 'ats-page' | 'clearbit' | 'favicon' | 'meta';
}

/**
 * Extract company logo from various sources
 */
export function extractCompanyLogo(
  $: cheerio.CheerioAPI, 
  company: string, 
  url: string, 
  platform: string
): LogoExtractionResult {
  
  // Try Clearbit API first (most reliable and consistent)
  if (company) {
    const clearbitLogo = getClearbitLogo(company);
    if (clearbitLogo) {
      console.log(`✅ Using Clearbit logo for ${company}: ${clearbitLogo}`);
      return { logo: clearbitLogo, source: 'clearbit' };
    }
  }
  
  // Try to extract from ATS page as fallback
  const atsLogo = extractLogoFromATS($, platform, url);
  if (atsLogo) {
    return { logo: atsLogo, source: 'ats-page' };
  }
  
  // Try meta tags
  const metaLogo = extractLogoFromMeta($);
  if (metaLogo) {
    return { logo: metaLogo, source: 'meta' };
  }
  
  // Try favicon as final fallback
  const favicon = extractFavicon($, url);
  if (favicon) {
    return { logo: favicon, source: 'favicon' };
  }
  
  return { logo: null, source: 'clearbit' };
}

/**
 * Extract logo from ATS page using platform-specific selectors
 */
function extractLogoFromATS($: cheerio.CheerioAPI, platform: string, url: string): string | null {
  let logoSelectors: string[] = [];
  
  // Platform-specific logo selectors
  switch (platform.toLowerCase()) {
    case 'greenhouse':
    case 'greenhouse.io':
      logoSelectors = [
        '.company-logo img',
        '.header-company-logo img',
        '[data-qa="company-logo"] img',
        '.company-header img',
        'header img[alt*="logo" i]',
        'header img[src*="logo" i]',
        '.company-info img'
      ];
      break;
      
    case 'lever':
    case 'lever.co':
      logoSelectors = [
        '.company-logo img',
        '.posting-header img',
        '.header img',
        'img[alt*="logo" i]',
        '.company-img img'
      ];
      break;
      
    case 'ashby':
    case 'ashbyhq.com':
      logoSelectors = [
        '[data-testid="company-logo"] img',
        '[data-testid*="logo"] img',
        '[data-testid*="company"] img',
        '.company-logo img',
        'header img',
        'img[alt*="logo" i]',
        'img[src*="logo" i]'
      ];
      break;
      
    case 'workday':
    case 'myworkdayjobs.com':
      logoSelectors = [
        '.company-logo img',
        '[data-automation-id="company-logo"] img',
        'header img',
        '.wd-header img'
      ];
      break;
      
    case 'workable':
    case 'jobs.workable.com':
      logoSelectors = [
        '[data-ui="company-logo"] img',
        '[data-ui*="logo"] img',
        '.company-logo img',
        '.header-logo img',
        'header img[alt*="logo" i]',
        '.company-header img',
        'img[src*="logo" i]'
      ];
      break;
      
    case 'adp':
      logoSelectors = [
        '.company-logo img',
        '.header img',
        'img[alt*="logo" i]',
        '.company-branding img'
      ];
      break;
      
    default:
      // Generic selectors for unknown platforms
      logoSelectors = [
        '.company-logo img',
        '.logo img',
        'header img',
        'img[alt*="logo" i]',
        'img[src*="logo" i]',
        'img[class*="logo" i]',
        '.company img',
        '.brand img'
      ];
  }
  
  // Try each selector
  for (const selector of logoSelectors) {
    const logoElement = $(selector).first();
    if (logoElement.length) {
      let logoSrc = logoElement.attr('src') || logoElement.attr('data-src');
      
      if (logoSrc) {
        // Handle relative URLs
        logoSrc = makeAbsoluteUrl(logoSrc, url);
        
        // Validate that it's actually an image
        if (isValidImageUrl(logoSrc)) {
          console.log(`✅ Found logo from ATS page (${selector}): ${logoSrc}`);
          return logoSrc;
        }
      }
    }
  }
  
  return null;
}

/**
 * Extract logo from meta tags (Open Graph, Twitter, etc.)
 */
function extractLogoFromMeta($: cheerio.CheerioAPI): string | null {
  const metaSelectors = [
    'meta[property="og:image"]',
    'meta[name="twitter:image"]',
    'meta[property="og:image:url"]',
    'meta[name="image"]',
    'link[rel="apple-touch-icon"]',
    'link[rel="icon"][sizes*="192"]' // Larger icons
  ];
  
  for (const selector of metaSelectors) {
    const metaElement = $(selector);
    if (metaElement.length) {
      const logoUrl = metaElement.attr('content') || metaElement.attr('href');
      if (logoUrl && isValidImageUrl(logoUrl)) {
        console.log(`✅ Found logo from meta tags (${selector}): ${logoUrl}`);
        return logoUrl;
      }
    }
  }
  
  return null;
}

/**
 * Extract favicon as fallback
 */
function extractFavicon($: cheerio.CheerioAPI, pageUrl: string): string | null {
  const faviconSelectors = [
    'link[rel="icon"]',
    'link[rel="shortcut icon"]',
    'link[rel="apple-touch-icon"]'
  ];
  
  for (const selector of faviconSelectors) {
    const faviconElement = $(selector);
    if (faviconElement.length) {
      let faviconUrl = faviconElement.attr('href');
      if (faviconUrl) {
        faviconUrl = makeAbsoluteUrl(faviconUrl, pageUrl);
        console.log(`✅ Found favicon: ${faviconUrl}`);
        return faviconUrl;
      }
    }
  }
  
  // Try default favicon location
  try {
    const baseUrl = new URL(pageUrl).origin;
    return `${baseUrl}/favicon.ico`;
  } catch (error) {
    return null;
  }
}

/**
 * Get Clearbit logo with multiple domain strategies
 */
function getClearbitLogo(company: string): string | null {
  if (!company || company.length < 2) {
    return null;
  }

  // Clean company name for domain extraction
  const cleanCompany = company
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\b(inc|llc|corp|corporation|ltd|limited|co|company|the|and|technologies|tech|solutions|group|systems|software|services)\b/g, '')
    .trim()
    .replace(/\s+/g, '');
    
  if (cleanCompany && cleanCompany.length > 1) {
    console.log(`🔍 Generating Clearbit logo for cleaned company: "${cleanCompany}" from original: "${company}"`);
    
    // Multiple domain strategies - Clearbit will try to find the best match
    const domains = [
      `${cleanCompany}.com`,
      `${cleanCompany}.io`,
      `${cleanCompany}.co`,
      `${cleanCompany}.net`,
      `${cleanCompany}.org`
    ];
    
    // Start with .com as most common
    const primaryDomain = domains[0];
    console.log(`🌐 Using primary Clearbit domain: ${primaryDomain}`);
    
    return `https://logo.clearbit.com/${primaryDomain}`;
  }
  
  return null;
}

/**
 * Convert relative URLs to absolute URLs
 */
function makeAbsoluteUrl(url: string, baseUrl: string): string {
  try {
    if (url.startsWith('http')) {
      return url; // Already absolute
    }
    
    if (url.startsWith('//')) {
      return `https:${url}`; // Protocol-relative
    }
    
    if (url.startsWith('/')) {
      const base = new URL(baseUrl);
      return `${base.origin}${url}`; // Absolute path
    }
    
    // Relative path
    const base = new URL(baseUrl);
    return new URL(url, base.href).href;
  } catch (error) {
    console.warn(`Failed to make absolute URL: ${url} with base ${baseUrl}`);
    return url; // Return as-is if URL parsing fails
  }
}

/**
 * Check if URL looks like a valid image
 */
function isValidImageUrl(url: string): boolean {
  if (!url) return false;
  
  // Check for image file extensions
  const imageExtensions = /\\.(jpg|jpeg|png|gif|svg|webp|ico)($|\\?)/i;
  if (imageExtensions.test(url)) {
    return true;
  }
  
  // Check for common image hosting patterns
  const imageHostingPatterns = [
    /logo\\.clearbit\\.com/,
    /gravatar\\.com/,
    /images\\.unsplash\\.com/,
    /cdn\\./,
    /assets\\./,
    /static\\./,
    /media\\./,
    /uploads\\./,
    /img\\./,
    /images\\./
  ];
  
  return imageHostingPatterns.some(pattern => pattern.test(url));
}

/**
 * Enhanced company name extraction with logo context
 */
export function extractCompanyWithLogo($: cheerio.CheerioAPI, url: string): { company: string; logoHint: string | null } {
  // Look for company info near logo elements
  const logoElements = $('img[alt*="logo" i], .logo img, .company-logo img, header img');
  let logoHint: string | null = null;
  
  logoElements.each((_, element) => {
    const $elem = $(element);
    const alt = $elem.attr('alt');
    const src = $elem.attr('src');
    
    if (alt && alt.toLowerCase().includes('logo')) {
      // Extract company name from alt text
      const companyFromAlt = alt.replace(/logo/gi, '').trim();
      if (companyFromAlt && companyFromAlt.length > 2) {
        logoHint = companyFromAlt;
      }
    }
    
    if (src && src.includes('logo')) {
      // Extract company name from URL
      const urlParts = src.split('/');
      const logoFile = urlParts[urlParts.length - 1];
      const companyFromUrl = logoFile.replace(/[-_.].*$/, '');
      if (companyFromUrl && companyFromUrl.length > 2) {
        logoHint = companyFromUrl;
      }
    }
  });
  
  // Use existing company extraction logic
  const company = $('.company-name').text().trim() ||
                  $('[data-automation="jobPostingCompany"]').text().trim() ||
                  $('.organization-name').text().trim() ||
                  logoHint ||
                  '';
                  
  return { company, logoHint };
}