const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testCreationsGallery() {
  console.log('=== Testing Creations Gallery ===\n');
  
  // Get all users
  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .eq('is_artist', true)
    .limit(10);

  if (error) {
    console.error('Error:', error);
    return;
  }

  for (const user of users) {
    console.log(`=== ${user.name} ===`);
    console.log('Database creations_count:', user.creations_count);
    console.log('creationsGallery field:', user.creationsGallery);
    
    if (user.creationsGallery && Array.isArray(user.creationsGallery)) {
      console.log('creationsGallery.length:', user.creationsGallery.length);
    }
    
    // Also check storage bucket
    const { data: files, error: storageError } = await supabase
      .storage
      .from('creations')
      .list(user.id);
    
    if (!storageError && files) {
      const actualFiles = files.filter(f => f.name !== '.emptyFolderPlaceholder');
      console.log('Storage files count (excluding placeholder):', actualFiles.length);
      console.log('Storage files:', actualFiles.map(f => f.name));
    }
    
    console.log('');
  }
}

testCreationsGallery();