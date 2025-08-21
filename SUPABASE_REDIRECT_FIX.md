# Supabase Email Confirmation Redirect Fix

## Problem
Email confirmation links are redirecting to `localhost:3000` instead of the production domain `findhiddenjobs.com`.

## Root Cause
The redirect URLs are configured in the Supabase project settings, not in the application code. The Supabase project needs to be updated with the correct production URLs.

## Solution

### 1. Update Supabase Project Settings

Go to your Supabase project dashboard:

1. **Navigate to Authentication → URL Configuration**
2. **Update Site URL**: Set to `https://findhiddenjobs.com`
3. **Update Redirect URLs**: Add these URLs:
   ```
   https://findhiddenjobs.com
   https://findhiddenjobs.com/auth-callback
   https://findhiddenjobs.com/dashboard
   https://www.findhiddenjobs.com
   https://www.findhiddenjobs.com/auth-callback
   https://www.findhiddenjobs.com/dashboard
   ```

### 2. Email Template Configuration

In Supabase Dashboard → Authentication → Email Templates:

1. **Confirm signup template**: Update any hardcoded URLs to use `{{ .SiteURL }}`
2. **Reset password template**: Update any hardcoded URLs to use `{{ .SiteURL }}`
3. **Magic link template**: Update any hardcoded URLs to use `{{ .SiteURL }}`

### 3. Development vs Production URLs

The application code has been updated to automatically handle production URLs, but make sure these are set in Supabase:

**Development URLs** (for testing):
```
http://localhost:5000
http://localhost:5000/auth-callback
http://localhost:5000/dashboard
```

**Production URLs**:
```
https://findhiddenjobs.com
https://findhiddenjobs.com/auth-callback
https://findhiddenjobs.com/dashboard
https://www.findhiddenjobs.com
https://www.findhiddenjobs.com/auth-callback
https://www.findhiddenjobs.com/dashboard
```

### 4. Code Changes Made

Updated `/client/src/lib/supabase.ts` to:
- Automatically detect production environment
- Use `https://findhiddenjobs.com` as fallback for production
- Handle both development and production redirects

### 5. Testing

After updating Supabase settings:

1. **Test signup flow**: Create new account and verify email
2. **Test email confirmation**: Click confirmation link in email
3. **Verify redirect**: Should go to `findhiddenjobs.com` not `localhost:3000`
4. **Test password reset**: Verify reset links also redirect correctly

### 6. Environment Variables

Make sure these are set correctly in production:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NODE_ENV=production
```

## Verification

The email confirmation URL should look like:
```
https://findhiddenjobs.com/#access_token=...&type=signup
```

Instead of:
```
http://localhost:3000/#access_token=...&type=signup
```