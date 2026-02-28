const { supabase } = require('../config/supabase');

async function fixMissingAssignedArtist() {
  console.log('Starting script to fix missing assigned_artist_id...');

  try {
    // 1. Get all requests with status = 'assigned' and assigned_artist_id IS NULL
    const { data: requests, error: requestsError } = await supabase
      .from('requests')
      .select('id, requester_id')
      .eq('status', 'assigned')
      .is('assigned_artist_id', null);

    if (requestsError) {
      throw new Error(`Error fetching requests: ${requestsError.message}`);
    }

    if (!requests || requests.length === 0) {
      console.log('No requests found that need fixing.');
      return;
    }

    console.log(`Found ${requests.length} requests to fix.`);

    let fixedCount = 0;
    for (const request of requests) {
      // 2. For each request, find the associated chat
      const { data: chat, error: chatError } = await supabase
        .from('chats')
        .select('participants')
        .eq('request_id', request.id)
        .limit(1)
        .single();

      if (chatError || !chat || !chat.participants || chat.participants.length < 2) {
        console.warn(`Could not find a valid chat for request ${request.id}. Skipping.`);
        continue;
      }

      // 3. Identify the artist from the participants
      const requesterId = request.requester_id;
      const participants = Array.isArray(chat.participants) ? chat.participants : JSON.parse(chat.participants);
      const artistId = participants.find(p => p !== requesterId);

      if (!artistId) {
        console.warn(`Could not determine artist from chat participants for request ${request.id}. Skipping.`);
        continue;
      }

      // 4. Update the assigned_artist_id in the requests table
      const { error: updateError } = await supabase
        .from('requests')
        .update({ assigned_artist_id: artistId })
        .eq('id', request.id);

      if (updateError) {
        console.error(`Failed to update request ${request.id}: ${updateError.message}`);
      } else {
        console.log(`Successfully fixed request ${request.id}. Set assigned_artist_id to ${artistId}`);
        fixedCount++;
      }
    }

    console.log(`Script finished. Successfully fixed ${fixedCount} out of ${requests.length} requests.`);

  } catch (error) {
    console.error('An error occurred during the script execution:', error.message);
  }
}

fixMissingAssignedArtist();