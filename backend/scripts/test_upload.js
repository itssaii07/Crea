// Test script to verify upload functionality
const { supabase } = require('../config/supabase');

async function testUploadFunctionality() {
  try {
    console.log('Testing upload functionality...\n');

    // Test 1: Check if storage buckets exist
    console.log('Test 1: Checking storage buckets...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('✗ Error listing buckets:', bucketsError.message);
      return;
    }

    const requiredBuckets = ['avatars', 'creations', 'requests', 'messages', 'temp'];
    const existingBuckets = buckets.map(b => b.name);
    
    console.log('Existing buckets:', existingBuckets);
    
    const missingBuckets = requiredBuckets.filter(bucket => !existingBuckets.includes(bucket));
    
    if (missingBuckets.length > 0) {
      console.log('⚠️  Missing buckets:', missingBuckets);
      console.log('Please run the setup_storage_buckets.sql script to create missing buckets.');
    } else {
      console.log('✓ All required buckets exist');
    }

    // Test 2: Test bucket access
    console.log('\nTest 2: Testing bucket access...');
    for (const bucket of requiredBuckets) {
      if (existingBuckets.includes(bucket)) {
        const { data, error } = await supabase.storage.from(bucket).list('', { limit: 1 });
        if (error) {
          console.log(`✗ Cannot access ${bucket} bucket:`, error.message);
        } else {
          console.log(`✓ Can access ${bucket} bucket`);
        }
      }
    }

    // Test 3: Test upload permissions (this would require authentication)
    console.log('\nTest 3: Upload permissions test...');
    console.log('Note: Upload permissions test requires user authentication.');
    console.log('This test can only be performed through the frontend with a logged-in user.');

    console.log('\nUpload functionality test completed!');
    console.log('\nNext steps:');
    console.log('1. If buckets are missing, run: backend/scripts/setup_storage_buckets.sql');
    console.log('2. Restart your backend server');
    console.log('3. Test uploads through the frontend profile page');

  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testUploadFunctionality();
}

module.exports = { testUploadFunctionality };
