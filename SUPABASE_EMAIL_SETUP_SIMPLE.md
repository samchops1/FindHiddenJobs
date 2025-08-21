# How to Set Up Supabase Email

## Step 1: Deploy the Email Function

1. **Install Supabase CLI** (if not already done):
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**:
   ```bash
   supabase login
   ```

3. **Link your project** (get your project ref from Supabase dashboard URL):
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```
   Example: If your Supabase URL is `https://zyhtnowbmeazztyvnlcv.supabase.co`, then your project ref is `zyhtnowbmeazztyvnlcv`

4. **Deploy the email function**:
   ```bash
   supabase functions deploy send-email
   ```

## Step 2: Get an Email Provider API Key

**Option A: Resend (Recommended - Easy Setup)**
1. Go to [resend.com](https://resend.com)
2. Sign up for free account
3. Go to API Keys → Create API Key
4. Copy your API key (starts with `re_`)

**Option B: SendGrid (Alternative)**
1. Go to [sendgrid.com](https://sendgrid.com)
2. Sign up for free account
3. Go to Settings → API Keys → Create API Key
4. Copy your API key (starts with `SG.`)

## Step 3: Set the API Key in Supabase

**For Resend:**
```bash
supabase secrets set RESEND_API_KEY=re_your_actual_api_key_here
```

**For SendGrid:**
```bash
supabase secrets set SENDGRID_API_KEY=SG.your_actual_api_key_here
```

## Step 4: Set Your From Email (Optional)

```bash
# Set this environment variable in your app
EMAIL_FROM=noreply@yourdomain.com
```

If not set, emails will come from `noreply@findhiddenjobs.com`

## That's It! 🎉

Your application will now send emails through Supabase. Test it by:

1. Signing up a new user
2. Checking the console logs for email confirmations
3. Daily digest emails will be sent at 9 PM EST

## Troubleshooting

**Issue: Function not found**
- Make sure you deployed: `supabase functions deploy send-email`

**Issue: Email not sending**
- Check your API key is correct
- Verify it's set in Supabase: `supabase secrets list`

**Issue: "From" domain not verified**
- With Resend: Add and verify your domain in Resend dashboard
- With SendGrid: Use a verified sender email

## Costs

- **Resend**: 3,000 emails/month free, then $0.0002 per email
- **SendGrid**: 100 emails/day free, then pay-as-you-go

Both are very affordable for a job search platform!