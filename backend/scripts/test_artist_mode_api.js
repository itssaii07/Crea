#!/usr/bin/env node

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase credentials. Please check your .env file.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testArtistModeAPI() {
    try {
        console.log('🔍 Testing Artist Mode API endpoint...\n');

        // First, let's try to get an existing user for testing
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
            console.log('❌ No active session found. Let\'s test with a mock session.');
            
            // Test the API endpoint directly with a mock token
            console.log('Testing API endpoint structure...');
            
            const response = await fetch('http://localhost:3000/api/user/artist-mode', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer invalid_token_for_testing'
                },
                body: JSON.stringify({ enabled: true })
            });

            const result = await response.text();
            console.log('Response status:', response.status);
            console.log('Response body:', result);

            if (response.status === 401) {
                console.log('✅ API endpoint exists and properly requires authentication');
                return true;
            } else if (response.status === 404) {
                console.log('❌ API endpoint not found - route may not be registered');
                return false;
            }
        } else {
            console.log('✅ Found active session, testing with real token...');
            
            const response = await fetch('http://localhost:3000/api/user/artist-mode', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ enabled: true })
            });

            const result = await response.json();
            console.log('Response status:', response.status);
            console.log('Response body:', result);

            if (response.ok) {
                console.log('✅ Artist mode API is working correctly!');
                return true;
            } else {
                console.log('❌ Artist mode API returned an error');
                return false;
            }
        }
    } catch (error) {
        console.error('❌ Error testing artist mode API:', error);
        return false;
    }
}

async function checkServerStatus() {
    try {
        console.log('🔍 Checking if server is running...\n');
        
        const response = await fetch('http://localhost:3000/');
        
        if (response.ok) {
            console.log('✅ Server is running on http://localhost:3000');
            return true;
        } else {
            console.log('❌ Server responded with status:', response.status);
            return false;
        }
    } catch (error) {
        console.log('❌ Server is not running or not accessible:', error.message);
        return false;
    }
}

async function fullDiagnostic() {
    console.log('🔍 Running full diagnostic for artist mode toggle issue...\n');
    
    // Check server
    const serverRunning = await checkServerStatus();
    if (!serverRunning) {
        console.log('\n🚨 SERVER ISSUE: Start the server first with: npm run dev');
        return;
    }
    
    // Check API endpoint
    await testArtistModeAPI();
    
    console.log('\n📋 DEBUGGING STEPS:');
    console.log('1. Check browser console for JavaScript errors when toggling');
    console.log('2. Check network tab in browser dev tools for the PATCH request');
    console.log('3. Verify that window.supabase is available in the browser');
    console.log('4. Check server logs for any error messages');
    
    console.log('\n🔧 POTENTIAL FIXES:');
    console.log('1. Clear browser localStorage and cookies');
    console.log('2. Refresh the page and try again');
    console.log('3. Check if user is properly authenticated');
    console.log('4. Verify Supabase configuration matches between frontend and backend');
}

if (require.main === module) {
    fullDiagnostic().then(() => {
        process.exit(0);
    }).catch(error => {
        console.error('Error during diagnostic:', error);
        process.exit(1);
    });
}