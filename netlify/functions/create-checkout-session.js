// netlify/functions/create-payment-intent.js
//
// SETUP:
// 1. Place at: netlify/functions/create-payment-intent.js
// 2. npm install stripe  (in project root)
// 3. Netlify env var: STRIPE_SECRET_KEY = sk_test_...
//
// Replaces create-checkout-session.js — no more redirect needed.

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
        return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'STRIPE_SECRET_KEY not set' }) };
    }

    let body;
    try { body = JSON.parse(event.body); }
    catch { return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

    const { amount } = body; // amount in cents, sent from frontend

    if (!amount || amount < 100) {
        return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid amount' }) };
    }

    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount,           // already in cents from frontend
            currency: 'usd',
            automatic_payment_methods: { enabled: true },
        });

        return {
            statusCode: 200,
            headers: CORS,
            body: JSON.stringify({ clientSecret: paymentIntent.client_secret }),
        };
    } catch (err) {
        console.error('Stripe error:', err.message);
        return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: err.message }) };
    }
};