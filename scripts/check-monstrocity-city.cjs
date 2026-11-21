// Explicit integration smoke test: creates a disposable guest, never uses an existing player's token.
const origin = new URL(process.argv[2] || 'http://127.0.0.1:4300').origin;
async function json(path, options = {}) {
  const response = await fetch(origin + '/api' + path, { ...options, signal: AbortSignal.timeout(25000) });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.json();
}
(async () => {
  const guest = await json('/auth/anonymous', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: 'null' });
  if (!guest.token) throw new Error('Anonymous response did not include a session token');
  const bootstrap = await json('/monstrocity/bootstrap', { headers: { Authorization: `Bearer ${guest.token}` } });
  const config = bootstrap.config;
  console.log(JSON.stringify({ origin, configVersion: config?.version, mapVersion: config?.mapVersion }, null, 2));
  if (config?.mapVersion !== 'city-v3') throw new Error('Expanded city is NOT enabled: expected city-v3. Do not override the authoritative map in the client.');
  console.log('PASS: a new player receives city-v3. Existing-run migration and distant interaction checks are still required.');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
