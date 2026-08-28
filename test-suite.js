// Automated Integration Test Suite for Infinity Operations

async function runTests() {
  const baseUrl = 'http://localhost:8788';
  let passed = 0;
  let failed = 0;

  function assert(condition, name) {
    if (condition) {
      console.log(`✅ PASS: ${name}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${name}`);
      failed++;
    }
  }

  console.log('--- Starting Integration Test Suite ---');

  // Test 1: Static Route Delivery
  const routes = ['/', '/login', '/videos', '/editor-load'];
  for (const r of routes) {
    const res = await fetch(`${baseUrl}${r}`);
    assert(res.status === 200 && (await res.text()).includes('Infinity Operations'), `Route ${r} renders 200 OK`);
  }

  // Test 2: Auth Session without cookie
  const sessionRes1 = await fetch(`${baseUrl}/api/auth/session`);
  const sessionData1 = await sessionRes1.json();
  assert(sessionRes1.status === 200 && sessionData1.authenticated === false, 'GET /api/auth/session unauthenticated returns false');

  // Test 3: Login with invalid access code
  const badLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessCode: 'wrong-code-123' })
  });
  const badLoginData = await badLoginRes.json();
  assert(badLoginRes.status === 401 && badLoginData.ok === false, 'POST /api/auth/login invalid code returns 401');

  // Test 4: Login with valid access code
  const goodLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessCode: 'infinity2026' })
  });
  const goodLoginData = await goodLoginRes.json();
  const setCookieHeader = goodLoginRes.headers.get('set-cookie');
  assert(goodLoginRes.status === 200 && goodLoginData.ok === true && setCookieHeader && setCookieHeader.includes('infinity_session='), 'POST /api/auth/login valid code returns 200 + Set-Cookie');

  const sessionCookie = setCookieHeader ? setCookieHeader.split(';')[0] : '';

  // Test 5: Auth Session with cookie
  const sessionRes2 = await fetch(`${baseUrl}/api/auth/session`, {
    headers: { Cookie: sessionCookie }
  });
  const sessionData2 = await sessionRes2.json();
  assert(sessionRes2.status === 200 && sessionData2.authenticated === true, 'GET /api/auth/session with valid cookie returns authenticated: true');

  // Test 6: POST /api/infinity without cookie -> 401
  const unauthProxyRes = await fetch(`${baseUrl}/api/infinity`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'dashboard' })
  });
  assert(unauthProxyRes.status === 401, 'POST /api/infinity without auth cookie returns 401 Unauthorized');

  // Test 7: POST /api/infinity with unsupported action -> 400
  const badActionRes = await fetch(`${baseUrl}/api/infinity`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: sessionCookie
    },
    body: JSON.stringify({ action: 'malicious_action' })
  });
  assert(badActionRes.status === 400, 'POST /api/infinity with unsupported action returns 400 Bad Request');

  // Test 8: POST /api/auth/logout -> clears cookie
  const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
    method: 'POST',
    headers: { Cookie: sessionCookie }
  });
  const logoutCookie = logoutRes.headers.get('set-cookie');
  assert(logoutRes.status === 200 && logoutCookie && logoutCookie.includes('Max-Age=0'), 'POST /api/auth/logout clears cookie');

  console.log(`\nResults: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
