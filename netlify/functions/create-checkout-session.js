const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { eventName, reference, customerName, customerEmail } = body;
  if (!eventName || !reference || !customerName || !customerEmail) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
  }

  const origin = event.headers.origin
    || (event.headers.host ? `https://${event.headers.host}` : 'https://localhost');

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'gbp',
          product_data: {
            name: `Event Photography Deposit — ${eventName}`,
            description: '2 photos at the pre-registered rate of £13 each. Deducted from your balance on the day.',
          },
          unit_amount: 2600,
        },
        quantity: 1,
      }],
      mode: 'payment',
      customer_email: customerEmail,
      success_url: `${origin}/?success=true&ref=${encodeURIComponent(reference)}&name=${encodeURIComponent(customerName)}#register`,
      cancel_url: `${origin}/#register`,
      metadata: { reference, eventName, customerName, customerEmail },
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    console.error('Stripe error:', err.message);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to create payment session' }),
    };
  }
};
