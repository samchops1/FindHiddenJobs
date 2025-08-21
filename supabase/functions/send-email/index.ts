// Supabase Edge Function to send emails
// Deploy this to your Supabase project

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY')

serve(async (req) => {
  // Handle CORS for browser requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    })
  }

  try {
    const { to, subject, html, from } = await req.json()

    // Validate required fields
    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, subject, html' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    let result;

    // Try Resend first (recommended for Supabase)
    if (RESEND_API_KEY) {
      result = await sendWithResend({ to, subject, html, from });
    } 
    // Fallback to SendGrid
    else if (SENDGRID_API_KEY) {
      result = await sendWithSendGrid({ to, subject, html, from });
    }
    // No email service configured
    else {
      return new Response(
        JSON.stringify({ 
          error: 'No email service configured. Set RESEND_API_KEY or SENDGRID_API_KEY in Supabase secrets.' 
        }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    if (result.success) {
      return new Response(
        JSON.stringify({ success: true, messageId: result.messageId }),
        { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    } else {
      return new Response(
        JSON.stringify({ error: result.error }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

  } catch (error) {
    console.error('Error sending email:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
})

async function sendWithResend({ to, subject, html, from }: {
  to: string;
  subject: string;
  html: string;
  from: string;
}) {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: from || 'noreply@findhiddenjobs.com',
        to: [to],
        subject,
        html,
      }),
    })

    const data = await response.json()

    if (response.ok) {
      return { success: true, messageId: data.id }
    } else {
      return { success: false, error: data.message || 'Failed to send email via Resend' }
    }
  } catch (error) {
    return { success: false, error: `Resend error: ${error.message}` }
  }
}

async function sendWithSendGrid({ to, subject, html, from }: {
  to: string;
  subject: string;
  html: string;
  from: string;
}) {
  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: to }],
          subject,
        }],
        from: { email: from || 'noreply@findhiddenjobs.com' },
        content: [{
          type: 'text/html',
          value: html,
        }],
      }),
    })

    if (response.ok) {
      return { success: true, messageId: response.headers.get('x-message-id') }
    } else {
      const errorData = await response.text()
      return { success: false, error: `SendGrid error: ${errorData}` }
    }
  } catch (error) {
    return { success: false, error: `SendGrid error: ${error.message}` }
  }
}