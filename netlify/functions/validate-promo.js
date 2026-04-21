// netlify/functions/validate-promo.js
//
// Looks up a Stripe coupon directly by ID (the code string IS the coupon ID in Stripe).
// In Stripe dashboard, when you create a coupon with "Use customer-facing coupon codes"
// checked, the CODE you enter becomes searchable as a promotion code.
// This function tries BOTH approaches: promotion code lookup AND direct coupon lookup.

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
};

function successResponse(coupon, promoId) {
    if (coupon.percent_off) {
        return {
            valid:           true,
            discountPercent: coupon.percent_off / 100,
            amountOff:       0,
            promoId:         promoId || coupon.id,
            message:         coupon.percent_off + '% discount applied!',
        };
    }
    if (coupon.amount_off) {
        return {
            valid:           true,
            discountPercent: 0,
            amountOff:       coupon.amount_off / 100,
            promoId:         promoId || coupon.id,
            message:         '$' + (coupon.amount_off / 100).toFixed(2) + ' discount applied!',
        };
    }
    return { valid: false, message: 'Unsupported coupon type.' };
}

exports.handler = async function(event) {
    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };
    if (event.httpMethod !== 'POST') return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method Not Allowed' }) };

    let body;
    try { body = JSON.parse(event.body); }
    catch { return { statusCode: 400, headers: CORS, body: JSON.stringify({ valid: false, message: 'Invalid request' }) }; }

    const { code } = body;
    if (!code) return { statusCode: 400, headers: CORS, body: JSON.stringify({ valid: false, message: 'No code provided' }) };

    const normalized = code.trim().toUpperCase();
    console.log('Validating:', normalized);

    // ── Approach 1: Direct coupon lookup by ID ──────────────────────────
    // When you create a coupon in Stripe, the coupon ID can be the code itself
    try {
        const coupon = await stripe.coupons.retrieve(normalized);
        console.log('Direct coupon lookup succeeded:', JSON.stringify(coupon));
        if (coupon && coupon.valid) {
            return {
                statusCode: 200,
                headers: CORS,
                body: JSON.stringify(successResponse(coupon, null)),
            };
        }
    } catch(e) {
        console.log('Direct coupon lookup failed (expected if using promo codes):', e.message);
    }

    // ── Approach 2: Promotion code lookup ──────────────────────────────
    try {
        const list = await stripe.promotionCodes.list({ code: normalized, limit: 10 });
        console.log('Promo code list count:', list.data.length);

        for (const promo of list.data) {
            console.log('Promo:', promo.id, 'active:', promo.active, 'coupon:', JSON.stringify(promo.coupon));
            if (!promo.active) continue;

            // coupon may be a string ID or object depending on Stripe version
            let coupon;
            if (typeof promo.coupon === 'object' && promo.coupon !== null) {
                coupon = promo.coupon;
            } else if (typeof promo.coupon === 'string') {
                coupon = await stripe.coupons.retrieve(promo.coupon);
            } else {
                // Last resort — list all coupons and match by name
                console.log('No coupon reference, skipping promo:', promo.id);
                continue;
            }

            if (coupon && coupon.valid) {
                return {
                    statusCode: 200,
                    headers: CORS,
                    body: JSON.stringify(successResponse(coupon, promo.id)),
                };
            }
        }
    } catch(e) {
        console.error('Promo code list error:', e.message);
    }

    // ── Approach 3: List all coupons and match by name ─────────────────
    // Fallback: match the code against coupon names (e.g. "FIRSTTIME10")
    try {
        const coupons = await stripe.coupons.list({ limit: 100 });
        console.log('Scanning', coupons.data.length, 'coupons for name match');
        const match = coupons.data.find(c =>
            c.valid && (
                (c.name  && c.name.toUpperCase()  === normalized) ||
                (c.id    && c.id.toUpperCase()    === normalized)
            )
        );
        if (match) {
            console.log('Matched by name/id:', match.id);
            return {
                statusCode: 200,
                headers: CORS,
                body: JSON.stringify(successResponse(match, null)),
            };
        }
    } catch(e) {
        console.error('Coupon list scan error:', e.message);
    }

    return {
        statusCode: 200,
        headers: CORS,
        body: JSON.stringify({ valid: false, message: 'Invalid or expired promo code.' }),
    };
};