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
        // Search without active filter first so we can give a better error message
        const promoCodes = await stripe.promotionCodes.list({
            code:  normalized,
            limit: 5,
        });

        console.log('Promo codes found:', promoCodes.data.length, JSON.stringify(promoCodes.data.map(p => ({
            id: p.id,
            code: p.code,
            active: p.active,
            coupon: p.coupon?.id,
            coupon_valid: p.coupon?.valid,
            percent_off: p.coupon?.percent_off,
            amount_off: p.coupon?.amount_off,
        }))));

        if (!promoCodes.data.length) {
            return {
                statusCode: 200,
                headers: CORS,
                body: JSON.stringify({ valid: false, message: 'Promo code not found.' }),
            };
        }

        // Find an active one
        const promoCode = promoCodes.data.find(p => p.active) || promoCodes.data[0];

        if (!promoCode.active) {
            return {
                statusCode: 200,
                headers: CORS,
                body: JSON.stringify({ valid: false, message: 'This promo code has expired or is inactive.' }),
            };
        }

        const coupon = promoCode.coupon;

        if (!coupon.valid) {
            return {
                statusCode: 200,
                headers: CORS,
                body: JSON.stringify({ valid: false, message: 'The coupon attached to this code is no longer valid.' }),
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