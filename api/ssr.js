import server from '../admin/dist/server/server.js';

export default async function handler(req, res) {
  try {
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host || 'localhost';
    const url = new URL(req.url, `${proto}://${host}`);

    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers || {})) {
      if (v === undefined) continue;
      headers.set(k, Array.isArray(v) ? v.join(',') : String(v));
    }

    const chunks = [];
    for await (const chunk of req) chunks.push(chunk instanceof Buffer ? chunk : Buffer.from(chunk));
    const body = chunks.length ? Buffer.concat(chunks) : undefined;

    const request = new Request(url.toString(), {
      method: req.method,
      headers,
      body: body && body.length ? body : undefined
    });

    const response = await server.fetch(request, {}, {});

    res.statusCode = response.status;
    for (const [k, v] of response.headers) res.setHeader(k, v);
    const buf = Buffer.from(await response.arrayBuffer());
    res.end(buf);
  } catch (err) {
    console.error(err);
    res.statusCode = 500;
    res.end('Internal Server Error');
  }
}
