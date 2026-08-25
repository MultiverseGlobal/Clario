import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder_key_for_build';
  return new Stripe(key, {
    apiVersion: '2026-07-29.dahlia' as any,
  });
}

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_KURO_OS_URL || 'https://placeholder.supabase.co';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key';
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  });
}

export async function POST(req: Request) {
  const stripe = getStripe();
  const supabase = getSupabase();
  const payload = await req.text();
  const signature = req.headers.get('stripe-signature') as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook secret is not configured' }, { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err: any) {
    console.error(`⚠️ Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Retrieve deal_id from metadata if passed during checkout creation
        const dealId = session.metadata?.deal_id;
        const amount = (session.amount_total || 0) / 100; // Convert cents to dollars
        const currency = session.currency || 'USD';

        if (session.payment_status === 'paid') {
          // Log revenue to Kuro OS business schema
          const { error } = await supabase
            .schema('business')
            .from('revenue')
            .insert({
              deal_id: dealId || null,
              amount: amount,
              currency: currency.toUpperCase(),
              stripe_charge_id: session.payment_intent as string,
              paid_at: new Date().toISOString(),
            });

          if (error) {
            console.error('Failed to log revenue to Kuro OS:', error);
            throw error;
          }

          // Automatically graduate the deal in Atlas if deal_id exists
          if (dealId) {
            await supabase
              .schema('business')
              .from('deals')
              .update({ stage: 'WON' })
              .eq('id', dealId);
          }
        }
        break;
      }
      // Add other event handlers here (e.g., invoice.payment_succeeded for subscriptions)
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook event:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
