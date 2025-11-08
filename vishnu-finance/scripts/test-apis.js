/**
 * Test script to verify all APIs work correctly
 * Run: node scripts/test-apis.js
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Test user credentials (adjust as needed)
const TEST_USER = {
  email: 'test@example.com',
  password: 'password123'
};

let authToken = null;

async function makeRequest(method, endpoint, body = null, useAuth = true) {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (useAuth && authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  
  const options = {
    method,
    headers,
  };
  
  if (body && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const data = await response.json();
    return { status: response.status, data, ok: response.ok };
  } catch (error) {
    return { status: 0, data: { error: error.message }, ok: false };
  }
}

async function login() {
  console.log('🔐 Testing login...');
  const result = await makeRequest('POST', '/api/auth/login', {
    email: TEST_USER.email,
    password: TEST_USER.password
  }, false);
  
  if (result.ok && result.data.token) {
    authToken = result.data.token;
    console.log('✅ Login successful');
    return true;
  } else {
    console.log('❌ Login failed:', result.data);
    return false;
  }
}

async function testEndpoint(name, method, endpoint, body = null) {
  console.log(`\n🧪 Testing ${name} (${method} ${endpoint})...`);
  const result = await makeRequest(method, endpoint, body);
  
  if (result.ok || result.status === 200) {
    console.log(`✅ ${name} - OK (Status: ${result.status})`);
    return true;
  } else {
    console.log(`❌ ${name} - FAILED (Status: ${result.status})`);
    console.log('   Error:', JSON.stringify(result.data, null, 2));
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting API Tests...\n');
  
  // Login first
  const loggedIn = await login();
  if (!loggedIn) {
    console.log('\n❌ Cannot proceed without authentication');
    return;
  }
  
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };
  
  // Test Dashboard API
  results.tests.push({
    name: 'Dashboard Simple API',
    passed: await testEndpoint('Dashboard', 'GET', '/api/dashboard-simple?start=2025-01-01&end=2025-12-31')
  });
  
  // Test Income API
  results.tests.push({
    name: 'Income GET',
    passed: await testEndpoint('Income GET', 'GET', '/api/income?startDate=2025-01-01&endDate=2025-12-31')
  });
  
  // Test Expenses API
  results.tests.push({
    name: 'Expenses GET',
    passed: await testEndpoint('Expenses GET', 'GET', '/api/expenses?startDate=2025-01-01&endDate=2025-12-31')
  });
  
  // Test Transactions Manage API
  results.tests.push({
    name: 'Transactions Manage GET',
    passed: await testEndpoint('Transactions Manage', 'GET', '/api/transactions/manage?limit=10')
  });
  
  // Test Goals API
  results.tests.push({
    name: 'Goals GET',
    passed: await testEndpoint('Goals', 'GET', '/api/goals')
  });
  
  // Test Deadlines API
  results.tests.push({
    name: 'Deadlines GET',
    passed: await testEndpoint('Deadlines', 'GET', '/api/deadlines')
  });
  
  // Test Categories API
  results.tests.push({
    name: 'Categories GET',
    passed: await testEndpoint('Categories', 'GET', '/api/categories')
  });
  
  // Calculate results
  results.tests.forEach(test => {
    if (test.passed) results.passed++;
    else results.failed++;
  });
  
  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📝 Total: ${results.tests.length}`);
  console.log('\nDetailed Results:');
  results.tests.forEach(test => {
    console.log(`  ${test.passed ? '✅' : '❌'} ${test.name}`);
  });
  console.log('='.repeat(50));
  
  if (results.failed === 0) {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('💥 Test runner error:', error);
  process.exit(1);
});

