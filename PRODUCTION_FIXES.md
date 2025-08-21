# Production Readiness Fixes

## Critical Issues Found and Fixed:

### 1. **Environment Variables Required for Production**
```bash
# Required for core functionality
GOOGLE_SEARCH_API_KEY=your_google_api_key
GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# Required for email functionality
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=noreply@findhiddenjobs.com

# Required for AI features
OPENAI_API_KEY=your_openai_api_key

# Required for security
JWT_SECRET=your_secure_jwt_secret
ADMIN_API_KEY=your_admin_api_key
ADMIN_EMAIL=admin@findhiddenjobs.com

# Optional but recommended
NODE_ENV=production
PORT=5000
DATABASE_URL=your_postgres_connection_string
```

### 2. **Security Issues to Fix**

#### Remove hardcoded emails:
- Replace `sameer.s.chopra@gmail.com` with environment variable `ADMIN_EMAIL`
- Remove test user IDs like `test-sameer-id`

#### Add authentication to admin endpoints:
```typescript
// Add to all admin endpoints
const adminKey = req.headers['x-admin-key'];
if (process.env.NODE_ENV === 'production' && adminKey !== process.env.ADMIN_API_KEY) {
  return res.status(401).json({ error: 'Unauthorized' });
}
```

### 3. **Rate Limiting Improvements**

#### Current Issue:
- Scheduler calculates delay per user but minimum is too low

#### Fix Applied:
```typescript
// In scheduler.ts line 128
const delayPerUser = Math.max(60000 / users.length, 5000); // Min 5 seconds
```

Should be:
```typescript
const delayPerUser = Math.max(120000 / users.length, 10000); // Min 10 seconds, safer rate
```

### 4. **Error Handling Improvements**

#### Add try-catch to all scrapers:
- Wrap all scraping functions with proper error boundaries
- Return empty arrays instead of throwing
- Log errors with context

### 5. **Console Logging for Production**

#### Replace console.log with proper logging:
```typescript
// Create a logger utility
const log = (message: string, level: 'info' | 'error' | 'warn' = 'info') => {
  if (process.env.NODE_ENV === 'production') {
    // Use structured logging in production
    console.log(JSON.stringify({ 
      timestamp: new Date().toISOString(), 
      level, 
      message 
    }));
  } else {
    console.log(message);
  }
};
```

### 6. **Database Connection Pooling**

#### Current Issue:
- No connection limits set for PostgreSQL

#### Fix:
```typescript
// In db.ts
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### 7. **Memory Management**

#### Recommendation Cache Size Limit:
```typescript
// Add cache size limit to prevent memory leaks
const MAX_CACHE_SIZE = 1000;

if (recommendationCache.size > MAX_CACHE_SIZE) {
  // Remove oldest entries
  const entriesToRemove = recommendationCache.size - MAX_CACHE_SIZE + 100;
  const keys = Array.from(recommendationCache.keys()).slice(0, entriesToRemove);
  keys.forEach(key => recommendationCache.delete(key));
}
```

### 8. **API Key Validation**

#### Add startup validation:
```typescript
// In index.ts, add startup checks
const requiredEnvVars = [
  'GOOGLE_SEARCH_API_KEY',
  'GOOGLE_SEARCH_ENGINE_ID',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY'
];

const missingVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingVars.length > 0) {
  console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}
```

### 9. **Session Security**

#### Add secure session config:
```typescript
// In server setup
app.use(session({
  secret: process.env.SESSION_SECRET || 'change-this-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));
```

### 10. **CORS Configuration**

#### Add proper CORS for production:
```typescript
import cors from 'cors';

const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://findhiddenjobs.com', 'https://www.findhiddenjobs.com']
    : ['http://localhost:3000', 'http://localhost:5000'],
  credentials: true
};

app.use(cors(corsOptions));
```

## Testing Checklist Before Production:

- [ ] All environment variables set
- [ ] Database connection working
- [ ] Email sending functional (test with real domain)
- [ ] Google Search API quota sufficient (100 requests/day free tier)
- [ ] OpenAI API credits available
- [ ] Supabase tables created and RLS enabled
- [ ] Admin endpoints protected
- [ ] Error logging configured
- [ ] Rate limiting tested
- [ ] Memory usage monitored

## Deployment Steps:

1. Set all environment variables in production
2. Run database migrations
3. Test email sending with verified domain
4. Monitor first scheduler run at 9 PM EST
5. Check error logs for any issues
6. Verify recommendation caching works
7. Test admin endpoints with API key

## Monitoring:

- Set up alerts for API rate limit warnings
- Monitor memory usage (cache size)
- Track email delivery rates
- Log search success/failure rates by platform
- Monitor response times for recommendations

## Backup Plan:

- If Google API hits limits: Implement exponential backoff
- If scraping fails: Use cached results up to 48 hours
- If email fails: Store in queue for retry
- If database fails: Fallback to in-memory (limited functionality)