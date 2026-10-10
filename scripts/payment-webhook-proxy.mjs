import http from 'node:http';

const server = http.createServer(async (request, response) => {
  if (request.url?.split('?')[0] !== '/razorpay-webhook') {
    response.writeHead(404); response.end(); return;
  }
  if (request.method !== 'POST') {
    response.writeHead(405, { Allow: 'POST' }); response.end(); return;
  }
  try {
    const chunks = [];
    let bytes = 0;
    for await (const chunk of request) {
      bytes += chunk.length;
      if (bytes > 1024 * 1024) {
        response.writeHead(413); response.end(); return;
      }
      chunks.push(chunk);
    }
    const upstream = await fetch('http://127.0.0.1:8903/.netlify/functions/razorpay-webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': String(request.headers['x-razorpay-signature'] || ''),
        'x-razorpay-event-id': String(request.headers['x-razorpay-event-id'] || ''),
      },
      body: Buffer.concat(chunks),
      signal: AbortSignal.timeout(25_000),
    });
    response.writeHead(upstream.status, { 'Content-Type': 'application/json' });
    response.end(await upstream.text());
  } catch {
    response.writeHead(502, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ error: 'Test webhook receiver unavailable' }));
  }
});

server.listen(8906, '127.0.0.1', () => console.log('Test webhook proxy accepts only POST /razorpay-webhook on port 8906.'));
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => {
  server.closeAllConnections();
  server.close();
});
