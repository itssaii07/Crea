#!/usr/bin/env node

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials. Please check your .env file.');
    console.error('Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function testUserTableStructure() {
    try {
        console.log('Testing user table structure...');
        
        // Try to get a user record to see the current structure
        const { data: users, error } = await supabase
            .from('users')
            .select('*')
            .limit(1);

        if (error) {
            console.error('Error querying users table:', error);
            return false;
        }

        if (users && users.length > 0) {
            const user = users[0];
            console.log('Current user table columns:', Object.keys(user));
            
            const hasArtistMode = 'artist_mode_enabled' in user;
            const hasExperience = 'experience' in user;
            
            console.log('Has artist_mode_enabled column:', hasArtistMode);
            console.log('Has experience column:', hasExperience);
            
            return { hasArtistMode, hasExperience };
        } else {
            console.log('No users found in database');
            return { hasArtistMode: false, hasExperience: false };
        }
    } catch (error) {
        console.error('Error testing user table structure:', error);
        return false;
    }
}

async function addMissingColumns() {
    try {
        // Test if we can add a test record with the missing columns
        console.log('Testing if we can create a user with artist_mode_enabled...');
        
        const testUserData = {
            email: 'test_artist_mode_' + Date.now() + '@example.com',
            username: 'test_user_' + Date.now(),
            name: 'Test User',
            artist_mode_enabled: true,
            experience: 0
        };

        const { data, error } = await supabase
            .from('users')
            .insert([testUserData])
            .select()
            .single();

        if (error) {
            if (error.message.includes('column "artist_mode_enabled" of relation "users" does not exist')) {
                console.log('❌ Confirmed: artist_mode_enabled column is missing from users table');
                return false;
            } else if (error.message.includes('column "experience" of relation "users" does not exist')) {
                console.log('❌ Confirmed: experience column is missing from users table');
                return false;
            } else {
                console.log('Different error occurred:', error);
                return false;
            }
        }

        if (data) {
            console.log('✅ Test user created successfully with artist_mode_enabled column');
            // Clean up test user
            await supabase.from('users').delete().eq('id', data.id);
            console.log('✅ Test user cleaned up');
            return true;
        }
    } catch (error) {
        console.error('Error testing column creation:', error);
        return false;
    }
}

async function fixArtistMode() {
    console.log('🔍 Diagnosing artist mode toggle issue...\n');
    
    const structure = await testUserTableStructure();
    
    if (!structure) {
        console.log('❌ Could not analyze user table structure');
        return;
    }

    if (!structure.hasArtistMode || !structure.hasExperience) {
        console.log('\n❌ Missing required columns for artist mode functionality');
        console.log('\n📋 SOLUTION: Add the missing columns manually in your Supabase dashboard:');
        console.log('1. Go to your Supabase project dashboard');
        console.log('2. Navigate to SQL Editor');  
        console.log('3. Run the following SQL commands:\n');
        
        if (!structure.hasArtistMode) {
            console.log('ALTER TABLE users ADD COLUMN artist_mode_enabled BOOLEAN DEFAULT FALSE;');
        }
        if (!structure.hasExperience) {
            console.log('ALTER TABLE users ADD COLUMN experience INTEGER DEFAULT 0;');
        }
        
        console.log('\n4. Also create the sessions table:');
        console.log(`CREATE TABLE IF NOT EXISTS artist_mode_sessions (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    start_time TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);`);
        
        console.log('\n5. After running these commands, the artist mode toggle should work correctly.');
    } else {
        console.log('✅ All required columns exist. The issue might be elsewhere.');
        
        // Test if we can perform an update
        const canAdd = await addMissingColumns();
        if (canAdd) {
            console.log('✅ Database operations are working correctly');
            console.log('The issue might be in the authentication or API layer');
        }
    }
}

if (require.main === module) {
    fixArtistMode().then(() => {
        console.log('\n🏁 Artist mode diagnostic complete');
        process.exit(0);
    }).catch(error => {
        console.error('Error during diagnostic:', error);
        process.exit(1);
    });
}

module.exports = { testUserTableStructure, addMissingColumns, fixArtistMode };