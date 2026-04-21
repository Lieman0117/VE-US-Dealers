// netlify/functions/validate-promo.js

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

    const normalized = code.trim().toUpperCase();
    console.log('Validating promo code:', normalized);

    try {
        // List promotion codes matching this code string
        const promoCodes = await stripe.promotionCodes.list({
            code: normalized,
            limit: 5,
        });

        console.log('Raw promo codes result:', JSON.stringify(promoCodes.data));

        if (!promoCodes.data.length) {
            return {
                statusCode: 200,
                headers: CORS,
                body: JSON.stringify({ valid: false, message: 'Promo code not found.' }),
            };
        }

        const promoCode = promoCodes.data.find(p => p.active) || promoCodes.data[0];
        console.log('Selected promo code keys:', Object.keys(promoCode));
        console.log('promoCode.coupon raw:', JSON.stringify(promoCode.coupon));
        console.log('promoCode.coupon_id:', promoCode.coupon_id);
        console.log('Full promoCode:', JSON.stringify(promoCode));

        if (!promoCode.active) {
            return {
                statusCode: 200,
                headers: CORS,
                body: JSON.stringify({ valid: false, message: 'This promo code has expired.' }),
            };
        }

        // Get coupon ID — handle all possible shapes Stripe might return
        const couponRef = promoCode.coupon || promoCode.coupon_id;
        if (!couponRef) {
            console.error('No coupon reference found on promo code. Full object:', JSON.stringify(promoCode));
            return {
                statusCode: 200,
                headers: CORS,
                body: JSON.stringify({ valid: false, message: 'Promo code has no coupon attached. Check Stripe dashboard.' }),
            };
        }
        const couponId = typeof couponRef === 'string' ? couponRef : couponRef.id;
        console.log('Fetching coupon ID:', couponId);

        // Fetch the coupon separately to guarantee we have the full object
        const coupon = await stripe.coupons.retrieve(couponId);
        console.log('Coupon:', JSON.stringify(coupon));

        if (!coupon || !coupon.valid) {
            return {
                statusCode: 200,
                headers: CORS,
                body: JSON.stringify({ valid: false, message: 'This coupon is no longer valid.' }),
            };
        }

        if (coupon.percent_off) {
            return {
                statusCode: 200,
                headers: CORS,
                body: JSON.stringify({
                    valid:           true,
                    discountPercent: coupon.percent_off / 100,
                    amountOff:       0,
                    promoId:         promoCode.id,
                    message:         coupon.percent_off + '% discount applied!',
                }),
            };
        }

        if (coupon.amount_off) {
            return {
                statusCode: 200,
                headers: CORS,
                body: JSON.stringify({
                    valid:           true,
                    discountPercent: 0,
                    amountOff:       coupon.amount_off / 100,
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
        console.error('Stripe promo error:', err.message);
        return {
            statusCode: 500,
            headers: CORS,
            body: JSON.stringify({ valid: false, message: 'Error: ' + err.message }),
        };
    }
};