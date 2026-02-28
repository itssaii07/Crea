// Comprehensive Feature Test Script
// Run with: node backend/scripts/test_all_features.js

const BASE_URL = 'http://localhost:3000';

let token = '';
let userId = '';
let testRequestId = '';

async function runTests() {
    console.log('='.repeat(60));
    console.log('CREA PLATFORM - COMPREHENSIVE FEATURE TEST');
    console.log('='.repeat(60));
    console.log('');

    // 1. AUTH TESTS
    console.log('1. AUTHENTICATION TESTS');
    console.log('-'.repeat(40));

    // Signup
    const testUser = {
        username: `testuser_${Date.now()}`,
        email: `test_${Date.now()}@example.com`,
        password: 'password123',
        name: 'Test User'
    };

    try {
        const signupRes = await fetch(`${BASE_URL}/api/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testUser)
        });
        const signupData = await signupRes.json();
        console.log(`✓ Signup: ${signupRes.status === 201 ? 'PASS' : 'FAIL'}`);

        if (signupRes.status === 201) {
            token = signupData.token;
            userId = signupData.user._id;
        }
    } catch (e) {
        console.log(`✗ Signup: ERROR - ${e.message}`);
    }

    // Login
    try {
        const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: testUser.email, password: testUser.password })
        });
        console.log(`✓ Login: ${loginRes.status === 200 ? 'PASS' : 'FAIL'}`);
    } catch (e) {
        console.log(`✗ Login: ERROR - ${e.message}`);
    }

    // Get current user
    try {
        const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log(`✓ Get Current User: ${meRes.status === 200 ? 'PASS' : 'FAIL'}`);
    } catch (e) {
        console.log(`✗ Get Current User: ERROR - ${e.message}`);
    }

    console.log('');

    // 2. USER/PROFILE TESTS
    console.log('2. USER/PROFILE TESTS');
    console.log('-'.repeat(40));

    // Get profile
    try {
        const profileRes = await fetch(`${BASE_URL}/api/user/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log(`✓ Get Profile: ${profileRes.status === 200 ? 'PASS' : 'FAIL'}`);
    } catch (e) {
        console.log(`✗ Get Profile: ERROR - ${e.message}`);
    }

    // Update profile
    try {
        const updateRes = await fetch(`${BASE_URL}/api/user/profile`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ bio: 'Test bio', categories: ['Art'] })
        });
        console.log(`✓ Update Profile: ${updateRes.status === 200 ? 'PASS' : 'FAIL'}`);
    } catch (e) {
        console.log(`✗ Update Profile: ERROR - ${e.message}`);
    }

    // Artist mode toggle
    try {
        const artistRes = await fetch(`${BASE_URL}/api/user/artist-mode`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ enabled: true })
        });
        console.log(`✓ Artist Mode Toggle: ${artistRes.status === 200 ? 'PASS' : 'FAIL'}`);
    } catch (e) {
        console.log(`✗ Artist Mode Toggle: ERROR - ${e.message}`);
    }

    console.log('');

    // 3. REQUEST TESTS
    console.log('3. REQUEST TESTS');
    console.log('-'.repeat(40));

    // Create request
    try {
        const createRes = await fetch(`${BASE_URL}/api/requests`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: 'Test Request',
                description: 'A test request',
                category: 'Art',
                keywords: ['test'],
                location: 'Test City',
                price: 100
            })
        });
        const reqData = await createRes.json();
        testRequestId = reqData._id;
        console.log(`✓ Create Request: ${createRes.status === 200 ? 'PASS' : 'FAIL'}`);
    } catch (e) {
        console.log(`✗ Create Request: ERROR - ${e.message}`);
    }

    // Get my requests
    try {
        const myReqRes = await fetch(`${BASE_URL}/api/requests/my`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log(`✓ Get My Requests: ${myReqRes.status === 200 ? 'PASS' : 'FAIL'}`);
    } catch (e) {
        console.log(`✗ Get My Requests: ERROR - ${e.message}`);
    }

    // Get general requests
    try {
        const genReqRes = await fetch(`${BASE_URL}/api/requests/general`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log(`✓ Get General Requests: ${genReqRes.status === 200 ? 'PASS' : 'FAIL'}`);
    } catch (e) {
        console.log(`✗ Get General Requests: ERROR - ${e.message}`);
    }

    console.log('');

    // 4. EXPLORE TESTS
    console.log('4. EXPLORE TESTS');
    console.log('-'.repeat(40));

    // Get artists
    try {
        const artistsRes = await fetch(`${BASE_URL}/api/explore/artists`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log(`✓ Get Artists: ${artistsRes.status === 200 ? 'PASS' : 'FAIL'}`);
    } catch (e) {
        console.log(`✗ Get Artists: ERROR - ${e.message}`);
    }

    // Get categories
    try {
        const catsRes = await fetch(`${BASE_URL}/api/explore/categories`);
        console.log(`✓ Get Categories: ${catsRes.status === 200 ? 'PASS' : 'FAIL'}`);
    } catch (e) {
        console.log(`✗ Get Categories: ERROR - ${e.message}`);
    }

    console.log('');

    // 5. REVIEW TESTS
    console.log('5. REVIEW TESTS');
    console.log('-'.repeat(40));

    // Get all reviews
    try {
        const reviewsRes = await fetch(`${BASE_URL}/api/reviews`);
        console.log(`✓ Get All Reviews: ${reviewsRes.status === 200 ? 'PASS' : 'FAIL'}`);
    } catch (e) {
        console.log(`✗ Get All Reviews: ERROR - ${e.message}`);
    }

    console.log('');

    // 6. ACTIVITY TESTS
    console.log('6. ACTIVITY TESTS');
    console.log('-'.repeat(40));

    // Get activity history
    try {
        const actRes = await fetch(`${BASE_URL}/api/activities/history`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log(`✓ Get Activity History: ${actRes.status === 200 ? 'PASS' : 'FAIL'}`);
    } catch (e) {
        console.log(`✗ Get Activity History: ERROR - ${e.message}`);
    }

    console.log('');

    // 7. NOTIFICATION TESTS
    console.log('7. NOTIFICATION TESTS');
    console.log('-'.repeat(40));

    // Get notifications
    try {
        const notifRes = await fetch(`${BASE_URL}/api/notifications`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log(`✓ Get Notifications: ${notifRes.status === 200 ? 'PASS' : 'FAIL'}`);
    } catch (e) {
        console.log(`✗ Get Notifications: ERROR - ${e.message}`);
    }

    console.log('');

    // 8. HOME TESTS
    console.log('8. HOME TESTS');
    console.log('-'.repeat(40));

    // Get home data
    try {
        const homeRes = await fetch(`${BASE_URL}/api/home`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log(`✓ Get Home Data: ${homeRes.status === 200 ? 'PASS' : 'FAIL'}`);
    } catch (e) {
        console.log(`✗ Get Home Data: ERROR - ${e.message}`);
    }

    console.log('');
    console.log('='.repeat(60));
    console.log('TEST COMPLETE');
    console.log('='.repeat(60));
}

runTests().catch(console.error);
