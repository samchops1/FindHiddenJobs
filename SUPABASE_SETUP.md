# Supabase Setup Guide

## Required Environment Variables

To enable Supabase storage and real database functionality, you need to set these environment variables:

### In Replit Secrets (or .env file):

```bash
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Alternative names also supported:
# VITE_SUPABASE_URL=your_supabase_project_url
# VITE_SUPABASE_ANON_KEY=your_anon_key
```

## How to Get These Values:

1. **Go to your Supabase Dashboard**: https://supabase.com/dashboard
2. **Select your project** (or create a new one)
3. **Go to Settings → API**:
   - **Project URL** → use as `SUPABASE_URL`
   - **service_role secret** → use as `SUPABASE_SERVICE_ROLE_KEY`

## Database Setup:

1. **Run the SQL Schema**: Copy the contents of `supabase_schema_updated.sql` and run it in your Supabase SQL Editor
2. **Enable Row Level Security**: The schema includes RLS policies for security
3. **Test Connection**: Restart your app after setting the environment variables

## Current Status:
- ⚠️ **Supabase is NOT currently connected** (fallback to in-memory storage)
- ✅ **Schema is ready** (`supabase_schema_updated.sql`)
- ✅ **Storage layer supports both** (in-memory and Supabase)

## Email Service Setup (Optional):

For sending real emails, also set:

```bash
# Gmail Setup (recommended for testing)
EMAIL_SERVICE=gmail
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASSWORD=your_app_password  # Use App Password, not regular password
EMAIL_FROM=your_gmail@gmail.com

# Or use SendGrid (for production)
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=your_sendgrid_api_key
EMAIL_FROM=noreply@yourdomain.com
```

## OpenAI Setup (for Resume Analysis):

```bash
OPENAI_API_KEY=your_openai_api_key
```

---

Once you set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, restart your application and you should see:
```
✅ Supabase storage initialized
📚 Supabase tables initialized
```

Instead of:
```
⚠️ Missing Supabase credentials, falling back to in-memory storage
```