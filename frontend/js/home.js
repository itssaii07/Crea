async function loadCraftCollage() {
  const craftCollageContainer = document.querySelector('.craft-collage');
  if (!craftCollageContainer) return;

  try {
    // 1. Fetch a larger pool of random creations
    const response = await fetch('/api/home/random-creations?limit=50');
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    const creations = await response.json();

    if (!creations || creations.length === 0) {
      craftCollageContainer.innerHTML = '<p class="text-center text-gray-500 col-span-full">No creations found.</p>';
      return;
    }

    // 2. Filter for unique artists and limit the count
    const uniqueArtistCreations = [];
    const artistIds = new Set();
    for (const creation of creations) {
      if (creation.user && !artistIds.has(creation.user.id)) {
        uniqueArtistCreations.push(creation);
        artistIds.add(creation.user.id);
      }
      if (uniqueArtistCreations.length >= 10) {
        break;
      }
    }

    // 3. Create the HTML for the image grid
    const creationsHTML = uniqueArtistCreations.map(creation => {
      return `
        <div class="craft-box" data-image-url="${creation.image_url}" data-caption="${creation.caption || 'Creation'}" data-artist-name="${creation.user.username}" data-artist-id="${creation.user.id}">
          <img src="${creation.image_url}" alt="${creation.caption || 'User creation'}" class="w-full h-48 object-cover rounded-lg">
        </div>
      `;
    }).join('');

    // 4. Inject the HTML into the container
    craftCollageContainer.innerHTML = `
      <div class="grid grid-cols-5 gap-4">
        ${creationsHTML}
      </div>
    `;

    // 5. Add event listeners for the modal
    addModalEventListeners();

  } catch (error) {
    console.error('Error loading craft collage:', error);
    craftCollageContainer.innerHTML = '<p class="text-center text-red-500 col-span-full">Could not load creations.</p>';
  }
}

function addModalEventListeners() {
    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const modalItemName = document.getElementById('modalItemName');
    const modalArtistName = document.getElementById('modalArtistName');
    const modalCloseBtn = document.getElementById('modalCloseBtn');

    if (!modal || !modalImage || !modalItemName || !modalArtistName || !modalCloseBtn) {
        return;
    }

    document.querySelectorAll('.craft-box').forEach(box => {
        box.addEventListener('click', () => {
            const imageUrl = box.dataset.imageUrl;
            const caption = box.dataset.caption;
            const artistName = box.dataset.artistName;
            const artistId = box.dataset.artistId;

            modalImage.src = imageUrl;
            modalItemName.textContent = caption;
            if (artistName && artistId) {
                modalArtistName.textContent = artistName;
                modalArtistName.href = `artistprofile.html?id=${artistId}`;
            } else {
                modalArtistName.textContent = 'Unknown Artist';
                modalArtistName.href = '#';
            }

            modal.classList.remove('hidden');
        });
    });

    modalCloseBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
  loadCraftCollage();
});