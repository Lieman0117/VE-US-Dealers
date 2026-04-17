// netlify/functions/create-checkout-session.js
//
// SETUP CHECKLIST:
// 1. Place this file at:  netlify/functions/create-checkout-session.js
// 2. In your project root, run:  npm install stripe
//    (or inside netlify/functions/: npm init -y && npm install stripe)
// 3. In Netlify dashboard → Site settings → Environment variables, add:
//    Key:   STRIPE_SECRET_KEY
//    Value: sk_test_xxxxxxxxxxxxxxxxxxxx   (your test secret key)
// 4. Redeploy your site
//
// Verify the function is live by visiting:
//   https://YOUR-SITE.netlify.app/.netlify/functions/create-checkout-session
// It should return {"error":"Method Not Allowed"} — that means it's working.

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
};

exports.handler = async function(event) {

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: CORS_HEADERS, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Method Not Allowed' }),
        };
    }

    if (!process.env.STRIPE_SECRET_KEY) {
        console.error('STRIPE_SECRET_KEY environment variable is not set');
        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({
                error: 'Stripe is not configured. Set STRIPE_SECRET_KEY in Netlify environment variables.'
            }),
        };
    }

    let body;
    try {
        body = JSON.parse(event.body);
    } catch (e) {
        return {
            statusCode: 400,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Invalid JSON in request body' }),
        };
    }

    const {
        lineItems = [],
        discountAmount = 0,
        promoCode = null,
        customerInfo = {},
        orderDate = '',
        successUrl,
        cancelUrl,
    } = body;

    if (!lineItems || lineItems.length === 0) {
        return {
            statusCode: 400,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'No line items provided' }),
        };
    }

    const stripeLineItems = lineItems.map(item => ({
        price_data: {
            currency: 'usd',
            product_data: { name: item.name },
            unit_amount: Math.round(item.unit_price * 100),
        },
        quantity: item.qty,
    }));

    if (discountAmount > 0) {
        stripeLineItems.push({
            price_data: {
                currency: 'usd',
                product_data: {
                    name: 'Promo Discount' + (promoCode ? ' (' + promoCode + ')' : ''),
                },
                unit_amount: -Math.round(discountAmount * 100),
            },
            quantity: 1,
        });
    }

    const defaultBase = successUrl
        ? new URL(successUrl).origin
        : 'https://yoursite.netlify.app';

    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: stripeLineItems,
            mode: 'payment',
            success_url: successUrl || defaultBase + '/order/?payment=success&session_id={CHECKOUT_SESSION_ID}',
            cancel_url:  cancelUrl  || defaultBase + '/order/?cancelled=1',
            customer_email: customerInfo.email || undefined,
            payment_intent_data: {
                metadata: {
                    order_date:     orderDate,
                    customer_name:  customerInfo.name    || '',
                    customer_phone: customerInfo.phone   || '',
                    ship_address:   [
                        customerInfo.address1,
                        customerInfo.address2,
                        customerInfo.city,
                        customerInfo.state,
                        customerInfo.zip,
                    ].filter(Boolean).join(', '),
                    promo_code:     promoCode || '',
                    payment_method: 'stripe',
                },
            },
        });

        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify({ sessionId: session.id, url: session.url }),
        };

    } catch (err) {
        console.error('Stripe API error:', err.message);
        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Stripe error: ' + err.message }),
        };
    }
};