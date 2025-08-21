# Supabase Email Setup Guide

## Overview
Your application now supports sending emails through Supabase Edge Functions, which is more reliable and scalable than traditional SMTP.

## Setup Steps

### 1. Deploy the Edge Function
1. **Install Supabase CLI** (if not already installed):
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**:
   ```bash
   supabase login
   ```

3. **Link your project**:
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```

4. **Deploy the email function**:
   ```bash
   supabase functions deploy send-email
   ```

### 2. Set Email Service Secrets

**Option A: Resend (Recommended)**
1. Sign up at [resend.com](https://resend.com) 
2. Get your API key
3. Set the secret in Supabase:
   ```bash
   supabase secrets set RESEND_API_KEY=your_resend_api_key
   ```

**Option B: SendGrid**
1. Get your SendGrid API key
2. Set the secret:
   ```bash
   supabase secrets set SENDGRID_API_KEY=your_sendgrid_api_key
   ```

### 3. Configure Your Application

Set this environment variable to use Supabase for emails:
```bash
EMAIL_SERVICE=supabase
EMAIL_FROM=noreply@yourdomain.com  # Optional, defaults to noreply@findhiddenjobs.com
```

## Testing

Test the email functionality:
```bash
# Set EMAIL_SERVICE=supabase in your environment
npm run dev

# Then test with:
npx tsx -e "
import { emailService } from './server/email-service.ts';
await emailService.sendWelcomeEmail('test@example.com', 'Test User');
"
```

## Benefits of Supabase Email

✅ **Reliable**: Better delivery rates than SMTP  
✅ **Scalable**: Handle high email volumes  
✅ **Secure**: API keys stored in Supabase secrets  
✅ **Analytics**: Track email delivery and opens  
✅ **Cost-effective**: Pay per email sent  

## Fallback Options

If Supabase email fails, the system will:
1. Log the email details to console
2. Continue normal operation
3. Still track the email in the database

## Current Status

- ✅ **Supabase email service code**: Ready
- ✅ **Edge function**: Created (`supabase/functions/send-email/index.ts`)
- ⚠️ **Deployment**: You need to deploy the function
- ⚠️ **API keys**: You need to set email service secrets

Once deployed, your daily digest emails will be sent through Supabase instead of SMTP!