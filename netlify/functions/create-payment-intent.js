// netlify/functions/create-payment-intent.js
//
// Creates a Stripe PaymentIntent with optional promo code discount applied.
// Promo code must already be validated via validate-promo.js before calling this.

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
};

exports.handler = async function(event) {
    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };
    if (event.httpMethod !== 'POST') return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method Not Allowed' }) };

    if (!process.env.STRIPE_SECRET_KEY) {
        return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'STRIPE_SECRET_KEY not configured.' }) };
    }

    let body;
    try { body = JSON.parse(event.body); }
    catch { return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

    let { amount, promoCode } = body; // amount in cents

    if (!amount || amount < 50) {
        return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid amount' }) };
    }

    // If a promo code was provided, validate it and apply the discount
    let finalAmount   = amount;
    let discountApplied = 0;
    let promoDetails  = null;

    if (promoCode) {
        try {
            const promoCodes = await stripe.promotionCodes.list({
                code: promoCode.trim().toUpperCase(),
                active: true,
                limit: 1,
            });

            if (promoCodes.data.length) {
                const coupon = promoCodes.data[0].coupon;
                if (coupon.valid) {
                    if (coupon.percent_off) {
                        discountApplied = Math.round(amount * (coupon.percent_off / 100));
                    } else if (coupon.amount_off) {
                        discountApplied = coupon.amount_off; // already in cents
                    }
                    finalAmount  = Math.max(50, amount - discountApplied); // min 50 cents
                    promoDetails = { code: promoCode, discount_cents: discountApplied };
                }
            }
        } catch(promoErr) {
            console.warn('Promo validation warning (non-fatal):', promoErr.message);
            // Continue without discount if promo lookup fails
        }
    }

    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount:   finalAmount,
            currency: 'usd',
            automatic_payment_methods: { enabled: true },
            metadata: {
                original_amount_cents: amount,
                discount_cents:        discountApplied,
                promo_code:            promoCode || '',
                final_amount_cents:    finalAmount,
            },
        });

        return {
            statusCode: 200,
            headers: CORS,
            body: JSON.stringify({
                clientSecret:    paymentIntent.client_secret,
                finalAmount,
                discountApplied,
                promoDetails,
            }),
        };
    } catch (err) {
        console.error('Stripe PaymentIntent error:', err.message);
        return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: err.message }) };
    }
};