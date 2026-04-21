// netlify/functions/validate-promo.js
//
// Validates a Stripe promotion code against the Stripe API.
// Create promo codes in: Stripe Dashboard → Products → Coupons → Promotion codes
//
// Returns: { valid, discountPercent, message }

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

    let body;
    try { body = JSON.parse(event.body); }
    catch { return { statusCode: 400, headers: CORS, body: JSON.stringify({ valid: false, message: 'Invalid request' }) }; }

    const { code } = body;
    if (!code) return { statusCode: 400, headers: CORS, body: JSON.stringify({ valid: false, message: 'No code provided' }) };

    try {
        // Look up the promotion code in Stripe
        const promoCodes = await stripe.promotionCodes.list({
            code: code.trim().toUpperCase(),
            active: true,
            limit: 1,
        });

        if (!promoCodes.data.length) {
            return {
                statusCode: 200,
                headers: CORS,
                body: JSON.stringify({ valid: false, message: 'Invalid or expired promo code.' }),
            };
        }

        const promoCode = promoCodes.data[0];
        const coupon    = promoCode.coupon;

        // Only support percent_off coupons for now
        if (!coupon.valid) {
            return {
                statusCode: 200,
                headers: CORS,
                body: JSON.stringify({ valid: false, message: 'This promo code is no longer valid.' }),
            };
        }

        if (coupon.percent_off) {
            return {
                statusCode: 200,
                headers: CORS,
                body: JSON.stringify({
                    valid:           true,
                    discountPercent: coupon.percent_off / 100,   // e.g. 0.10 for 10%
                    promoId:         promoCode.id,                // used when creating PaymentIntent
                    message:         coupon.percent_off + '% discount applied!',
                }),
            };
        }

        if (coupon.amount_off) {
            // Fixed amount discount — return as a flat dollar amount
            return {
                statusCode: 200,
                headers: CORS,
                body: JSON.stringify({
                    valid:           true,
                    discountPercent: 0,
                    amountOff:       coupon.amount_off / 100,     // cents → dollars
                    promoId:         promoCode.id,
                    message:         '$' + (coupon.amount_off / 100).toFixed(2) + ' discount applied!',
                }),
            };
        }

        return {
            statusCode: 200,
            headers: CORS,
            body: JSON.stringify({ valid: false, message: 'Unsupported coupon type.' }),
        };

    } catch (err) {
        console.error('Stripe promo validation error:', err.message);
        return {
            statusCode: 500,
            headers: CORS,
            body: JSON.stringify({ valid: false, message: 'Could not validate code. Please try again.' }),
        };
    }
};