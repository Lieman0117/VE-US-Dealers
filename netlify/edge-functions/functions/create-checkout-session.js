// netlify/functions/create-checkout-session.js
//
// Netlify serverless function — creates a Stripe Checkout Session
// and returns the sessionId (or url) to the frontend.
//
// Required env vars in Netlify dashboard:
//   STRIPE_SECRET_KEY  — your Stripe secret key (sk_test_... or sk_live_...)
//
// Deploy: place this file at netlify/functions/create-checkout-session.js
// It will be available at /.netlify/functions/create-checkout-session

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async function(event) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    let body;
    try {
        body = JSON.parse(event.body);
    } catch {
        return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
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

    if (!lineItems.length) {
        return { statusCode: 400, body: JSON.stringify({ error: 'No line items provided' }) };
    }

    // Build Stripe line_items array
    // Stripe amounts are in cents
    const stripeLineItems = lineItems.map(item => ({
        price_data: {
            currency: 'usd',
            product_data: {
                name: item.name,
            },
            unit_amount: Math.round(item.unit_price * 100), // dollars → cents
        },
        quantity: item.qty,
    }));

    // Add a discount line item if a promo was applied
    // (negative amount line item — simplest approach without Stripe Coupons)
    if (discountAmount > 0) {
        stripeLineItems.push({
            price_data: {
                currency: 'usd',
                product_data: {
                    name: `Promo Discount${promoCode ? ' (' + promoCode + ')' : ''}`,
                },
                unit_amount: -Math.round(discountAmount * 100), // negative = discount
            },
            quantity: 1,
        });
    }

    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],  // add 'us_bank_account' for ACH if desired
            line_items: stripeLineItems,
            mode: 'payment',
            success_url: successUrl || 'https://yoursite.com/order/?payment=success',
            cancel_url:  cancelUrl  || 'https://yoursite.com/order/?cancelled=1',
            // Pre-fill customer email in Stripe Checkout
            customer_email: customerInfo.email || undefined,
            // Store order details as metadata on the PaymentIntent
            payment_intent_data: {
                metadata: {
                    order_date:     orderDate,
                    customer_name:  customerInfo.name  || '',
                    customer_phone: customerInfo.phone || '',
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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: session.id, url: session.url }),
        };

    } catch (err) {
        console.error('Stripe error:', err);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: err.message }),
        };
    }
};