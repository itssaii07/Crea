require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { supabase } = require('../config/supabase');

async function checkUsers() {
    try {
        console.log('Checking users in database...\n');
        
        // Get all users
        const { data: allUsers, error } = await supabase
            .from('users')
            .select('id, username, email, artist_mode_enabled, creations_count')
            .order('creations_count', { ascending: false });

        if (error) {
            console.error('Error fetching users:', error);
            return;
        }

        console.log(`Total users in database: ${allUsers.length}\n`);
        
        if (allUsers.length === 0) {
            console.log('No users found in database!');
            return;
        }

        console.log('Users details:');
        console.log('='.repeat(80));
        allUsers.forEach((user, index) => {
            console.log(`${index + 1}. Username: ${user.username || 'N/A'}`);
            console.log(`   Email: ${user.email}`);
            console.log(`   Artist Mode: ${user.artist_mode_enabled ? 'Yes' : 'No'}`);
            console.log(`   Creations Count: ${user.creations_count || 0}`);
            console.log('-'.repeat(80));
        });

        // Check artists with artist_mode_enabled
        const artistsWithMode = allUsers.filter(u => u.artist_mode_enabled);
        console.log(`\nArtists with artist_mode_enabled: ${artistsWithMode.length}`);
        
        // Check artists with creations
        const artistsWithCreations = allUsers.filter(u => u.artist_mode_enabled && u.creations_count > 0);
        console.log(`Artists with artist_mode_enabled AND creations: ${artistsWithCreations.length}`);

    } catch (error) {
        console.error('Error:', error);
    }
}

checkUsers();