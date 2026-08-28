// Automated Integration Test Suite for Infinity Operations on Cloudflare Pages
import fs from 'fs';

async function runTests() {
  const envContent = fs.existsSync('.dev.vars') ? fs.readFileSync('.dev.vars', 'utf8') : '';
  const codeMatch = envContent.match(/APP_ACCESS_CODE=["\x27]?([^"\x27\r\n]+)/);
  const accessCode = codeMatch ? codeMatch[1].trim() : 'AKfycbyA79X4pPhDd7N_TNTzD8gOBNN9IGoGmz-R1SU3GeAHwsUPAV7vj51Uf9BnmEh3a-TL';

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
  const routes = ['/', '/login/', '/videos/', '/editor-load/'];
  for (const r of routes) {
    const res = await fetch(`${baseUrl}${r}`);
    assert(res.status === 200 && (await res.text()).includes('Infinity Operations'), `Route ${r} renders 200 OK with HTML`);
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
    body: JSON.stringify({ accessCode })
  });
  const goodLoginData = await goodLoginRes.json();
  const setCookieHeader = goodLoginRes.headers.get('set-cookie');
  assert(goodLoginRes.status === 200 && goodLoginData.ok === true && Boolean(setCookieHeader), 'POST /api/auth/login valid code returns 200 + Set-Cookie');

  const sessionCookie = setCookieHeader ? setCookieHeader.split(';')[0] : '';

  // Test 5: Auth Session with cookie
  const sessionRes2 = await fetch(`${baseUrl}/api/auth/session`, {
    headers: { Cookie: sessionCookie }
  });
  const sessionData2 = await sessionRes2.json();
  assert(sessionRes2.status === 200 && sessionData2.authenticated === true, 'GET /api/auth/session with valid cookie returns authenticated: true');

  // Test 6: POST /api/infinity dashboard
  const dashRes = await fetch(`${baseUrl}/api/infinity`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
    body: JSON.stringify({ action: 'dashboard' })
  });
  const dashData = await dashRes.json();
  assert(dashRes.status === 200 && dashData.ok === true && dashData.result?.totalActive !== undefined, 'POST /api/infinity dashboard returns 200 OK');

  // Test 7: POST /api/infinity videos
  const videosRes = await fetch(`${baseUrl}/api/infinity`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
    body: JSON.stringify({ action: 'videos' })
  });
  const videosData = await videosRes.json();
  const videoItems = videosData.result?.items || videosData.result || [];
  assert(videosRes.status === 200 && Array.isArray(videoItems) && videoItems.length > 0, `POST /api/infinity videos returns ${videoItems.length} records`);

  // Test 8: POST /api/infinity video detail
  const videoDetailRes = await fetch(`${baseUrl}/api/infinity`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
    body: JSON.stringify({ action: 'video', videoId: '27/08-0001' })
  });
  const videoDetailData = await videoDetailRes.json();
  assert(videoDetailRes.status === 200 && videoDetailData.result?.videoId === '27/08-0001', 'POST /api/infinity video returns video detail');

  // Test 9: POST /api/infinity editor_load
  const editorRes = await fetch(`${baseUrl}/api/infinity`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
    body: JSON.stringify({ action: 'editor_load' })
  });
  const editorData = await editorRes.json();
  assert(editorRes.status === 200 && Array.isArray(editorData.result) && editorData.result.length > 0, `POST /api/infinity editor_load returns ${editorData.result?.length} editors`);

  // Test 10: POST /api/infinity without cookie -> 401
  const unauthProxyRes = await fetch(`${baseUrl}/api/infinity`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'dashboard' })
  });
  assert(unauthProxyRes.status === 401, 'POST /api/infinity without auth cookie returns 401 Unauthorized');

  // Test 11: POST /api/infinity with unsupported action -> 400
  const badActionRes = await fetch(`${baseUrl}/api/infinity`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: sessionCookie
    },
    body: JSON.stringify({ action: 'malicious_action' })
  });
  assert(badActionRes.status === 400, 'POST /api/infinity with unsupported action returns 400 Bad Request');

  // Test 12: POST /api/auth/logout -> clears cookie
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
