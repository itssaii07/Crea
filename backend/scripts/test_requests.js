// Test script to check if requests are working
const { supabase, supabaseHelpers, TABLES } = require('../config/supabase');

async function testRequests() {
  try {
    console.log('Testing requests functionality...\n');

    // Test 1: Check if requests table exists and is accessible
    console.log('Test 1: Checking requests table...');
    const { data: requests, error: requestsError } = await supabase
      .from(TABLES.REQUESTS)
      .select('*')
      .limit(5);
    
    if (requestsError) {
      console.error('✗ Error accessing requests table:', requestsError.message);
      return;
    }

    console.log('✓ Requests table is accessible');
    console.log(`Found ${requests.length} requests in database`);
    
    if (requests.length > 0) {
      console.log('Sample request:', requests[0]);
    }

    // Test 2: Check if users table exists
    console.log('\nTest 2: Checking users table...');
    const { data: users, error: usersError } = await supabase
      .from(TABLES.USERS)
      .select('*')
      .limit(5);
    
    if (usersError) {
      console.error('✗ Error accessing users table:', usersError.message);
      return;
    }

    console.log('✓ Users table is accessible');
    console.log(`Found ${users.length} users in database`);

    // Test 3: Test the getGeneralRequests method
    console.log('\nTest 3: Testing getGeneralRequests method...');
    const Request = require('../models/Request');
    const generalRequests = await Request.getGeneralRequests({}, 10);
    console.log(`✓ getGeneralRequests returned ${generalRequests.length} requests`);
    
    if (generalRequests.length > 0) {
      console.log('Sample general request:', generalRequests[0].toPublicJSON());
    }

    console.log('\n✅ All tests passed! Requests functionality is working.');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testRequests();
