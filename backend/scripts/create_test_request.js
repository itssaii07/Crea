// Script to create a test request
const { supabase, supabaseHelpers, TABLES } = require('../config/supabase');
const Request = require('../models/Request');
const User = require('../models/User');

async function createTestRequest() {
  try {
    console.log('Creating test request...\n');

    // Get the first user from the database
    const { data: users, error: usersError } = await supabase
      .from(TABLES.USERS)
      .select('*')
      .limit(1);
    
    if (usersError || !users || users.length === 0) {
      console.error('❌ No users found in database');
      return;
    }

    const user = users[0];
    console.log(`✓ Found user: ${user.email}`);

    // Create a test request
    const requestData = {
      title: 'Test Art Request',
      description: 'I need a custom painting for my living room. Something modern and colorful.',
      category: 'painting',
      keywords: ['modern', 'colorful', 'living room', 'custom'],
      location: 'Mumbai, India',
      price: 5000,
      imageUrl: 'https://placehold.co/400x300?text=Art+Request',
      requesterId: user.id,
      visibility: 'general',
      status: 'active'
    };

    const request = await Request.create(requestData);
    console.log('✅ Test request created successfully!');
    console.log('Request ID:', request.id);
    console.log('Request title:', request.title);

    // Verify it can be retrieved
    const generalRequests = await Request.getGeneralRequests({}, 10);
    console.log(`\n✓ getGeneralRequests now returns ${generalRequests.length} requests`);
    
    if (generalRequests.length > 0) {
      console.log('Sample request data:', generalRequests[0].toPublicJSON());
    }

  } catch (error) {
    console.error('❌ Error creating test request:', error);
  }
}

// Run the script
createTestRequest();
