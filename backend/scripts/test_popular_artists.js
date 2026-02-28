require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { supabase } = require('../config/supabase');

async function testPopularArtists() {
    try {
        console.log('Testing Popular Artists Logic...\n');
        
        // First, try to get artists with artist_mode_enabled and creations
        let { data: artists, error } = await supabase
            .from('users')
            .select('*')
            .eq('artist_mode_enabled', true)
            .gt('creations_count', 0)
            .order('creations_count', { ascending: false })
            .limit(4);

        if (error) {
            throw error;
        }

        console.log(`Step 1: Artists with artist_mode AND creations: ${artists.length}`);
        artists.forEach((a, i) => console.log(`  ${i+1}. ${a.username} (${a.creations_count} creations)`));

        // If we don't have 4 artists, get more artists with artist_mode_enabled (even without creations)
        if (artists.length < 4) {
            console.log(`\nStep 2: Need more artists, fetching with artist_mode_enabled...`);
            const { data: moreArtists, error: error2 } = await supabase
                .from('users')
                .select('*')
                .eq('artist_mode_enabled', true)
                .order('creations_count', { ascending: false })
                .limit(4);

            if (error2) {
                throw error2;
            }

            console.log(`  Found ${moreArtists.length} artists with artist_mode_enabled`);

            // Merge and deduplicate
            const artistIds = new Set(artists.map(a => a.id));
            moreArtists.forEach(artist => {
                if (!artistIds.has(artist.id) && artists.length < 4) {
                    artists.push(artist);
                    artistIds.add(artist.id);
                    console.log(`  Added: ${artist.username} (${artist.creations_count} creations)`);
                }
            });
        }

        // If still not enough, get any users ordered by creations_count
        if (artists.length < 4) {
            console.log(`\nStep 3: Still need more, fetching any users...`);
            const { data: allUsers, error: error3 } = await supabase
                .from('users')
                .select('*')
                .order('creations_count', { ascending: false })
                .limit(10);

            if (error3) {
                throw error3;
            }

            console.log(`  Found ${allUsers.length} total users`);

            const artistIds = new Set(artists.map(a => a.id));
            allUsers.forEach(user => {
                if (!artistIds.has(user.id) && artists.length < 4) {
                    artists.push(user);
                    artistIds.add(user.id);
                    console.log(`  Added: ${user.username} (${user.creations_count} creations)`);
                }
            });
        }

        console.log(`\n${'='.repeat(80)}`);
        console.log(`FINAL RESULT: ${artists.length} artists will be shown`);
        console.log('='.repeat(80));
        artists.slice(0, 4).forEach((artist, i) => {
            console.log(`${i+1}. ${artist.username}`);
            console.log(`   Email: ${artist.email}`);
            console.log(`   Artist Mode: ${artist.artist_mode_enabled ? 'Yes' : 'No'}`);
            console.log(`   Creations: ${artist.creations_count || 0}`);
            console.log('-'.repeat(80));
        });

    } catch (error) {
        console.error('Error:', error);
    }
}

testPopularArtists();