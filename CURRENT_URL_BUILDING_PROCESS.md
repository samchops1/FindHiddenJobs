# Current URL Building Process - Exact Implementation

## 1. Search Query Building Function

```javascript
function buildSearchQuery(query: string, site: string, location: string = "all"): string {
  // Add location filter to the search query
  let locationFilter = "";
  if (location === "remote") {
    locationFilter = " remote";
  } else if (location === "onsite") {
    locationFilter = " onsite";
  } else if (location === "hybrid") {
    locationFilter = " hybrid";
  } else if (location === "united-states") {
    locationFilter = " \"United States\"";
  }
  
  // Always wrap query in quotes for exact matching
  const quotedQuery = `"${query}"`;
  
  console.log(`🔍 Building search query for site: ${site}, query: "${quotedQuery}", location: "${locationFilter}"`);
  
  switch (site) {
    case "boards.greenhouse.io":
      const locationPart = location === "united-states" ? " united states" : locationFilter;
      const finalQuery = `site:boards.greenhouse.io${locationPart} ${quotedQuery}`;
      console.log(`🎯 Greenhouse search query: ${finalQuery}`);
      return finalQuery;
      
    case "jobs.lever.co":
      return `${quotedQuery} site:jobs.lever.co${locationFilter}`;
      
    case "jobs.ashbyhq.com":
      return `${quotedQuery} site:jobs.ashbyhq.com${locationFilter}`;
      
    case "jobs.workable.com":
      return `${quotedQuery} site:jobs.workable.com${locationFilter}`;
      
    case "myworkdayjobs.com":
      return `${quotedQuery} site:myworkdayjobs.com${locationFilter}`;
      
    case "adp":
      const adpQuery = `${quotedQuery} (site:workforcenow.adp.com OR site:myjobs.adp.com OR site:*.adp.com)${locationFilter}`;
      console.log(`🏢 ADP search query: ${adpQuery}`);
      return adpQuery;
      
    case "careers.*":
      return `${quotedQuery} (site:careers.* OR site:*/careers/* OR site:*/career/*)${locationFilter}`;
      
    case "other-pages":
      return `${quotedQuery} (site:*/employment/* OR site:*/opportunities/* OR site:*/openings/*)${locationFilter}`;
      
    default:
      return `${quotedQuery} site:${site}${locationFilter}`;
  }
}
```

## 2. Exact Query Examples

For query `"Director of Technology"` with location `"all"`:

- **Greenhouse**: `site:boards.greenhouse.io "Director of Technology"`
- **Lever**: `"Director of Technology" site:jobs.lever.co`
- **Ashby**: `"Director of Technology" site:jobs.ashbyhq.com`
- **Workable**: `"Director of Technology" site:jobs.workable.com`
- **Workday**: `"Director of Technology" site:myworkdayjobs.com`
- **ADP**: `"Director of Technology" (site:workforcenow.adp.com OR site:myjobs.adp.com OR site:*.adp.com)`
- **Careers**: `"Director of Technology" (site:careers.* OR site:*/careers/* OR site:*/career/*)`
- **Other**: `"Director of Technology" (site:*/employment/* OR site:*/opportunities/* OR site:*/openings/*)`

## 3. Location Handling

If location is `"united-states"`:
- **Greenhouse**: `site:boards.greenhouse.io united states "Director of Technology"`
- **Others**: `"Director of Technology" site:... "United States"`

If location is `"remote"`:
- **All**: `"Director of Technology" site:... remote`

## 4. URL Filtering Criteria

### Direct ATS URLs (Prioritized):
```javascript
// Greenhouse URLs
if (link.includes('boards.greenhouse.io')) {
  directGreenhouseUrls.push(link);
}

// Company Career Pages with gh_jid (Converted to Greenhouse)
if (link.includes('gh_jid=')) {
  // Convert: https://company.com/careers/?gh_jid=123
  // To: https://boards.greenhouse.io/company/jobs/123
}

// Other ATS Platforms
const isOtherJobPlatform = (
  (link.includes('jobs.lever.co') && link.includes('/posting/')) || 
  link.includes('jobs.ashbyhq.com') ||
  link.includes('myworkdayjobs.com') ||
  link.includes('jobs.workable.com') ||
  link.includes('workforcenow.adp.com') ||
  link.includes('myjobs.adp.com') ||
  (link.includes('.adp.com') && !link.includes('www.adp.com'))
);
```

## 5. Current ADP Detection Issues

**Current ADP Query**: `"Director of Technology" (site:workforcenow.adp.com OR site:myjobs.adp.com OR site:*.adp.com)`

**Potential Issues**:
1. Google might not return results for these specific ADP domains
2. ADP might use different URL patterns than expected
3. Job indicators might not match ADP page structure

## 6. Posting Date Extraction

```javascript
const datePatterns = [
  /posted\s+(\d+)\s+days?\s+ago/i,           // "posted 3 days ago"
  /(\d+)\s+days?\s+ago/i,                    // "3 days ago"  
  /posted\s+on\s+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i,  // "posted on January 15, 2024"
  /([A-Za-z]+\s+\d{1,2},?\s+\d{4})/,        // "January 15, 2024"
  /(\d{4}-\d{2}-\d{2})/                      // "2024-01-15"
];
```

## 7. Console Logging Added

The system now logs:
- `🔍 Building search query for site: ${site}`
- `🏢 ADP search query: ${query}`
- `🎯 Direct Greenhouse URL: ${link}`
- `✅ Added ADP job URL: ${link}`
- `❌ ADP URL rejected (missing job indicators): ${link}`

## 8. To Compare With Your Pasted Document

Please check if:
1. The query building matches your document exactly
2. The site patterns match what you expect
3. The location handling is consistent
4. The URL filtering criteria align with your requirements

**Key Question**: What specific differences do you see between this implementation and your pasted document?