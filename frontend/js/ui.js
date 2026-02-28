/**
 * Initializes a modal for displaying images.
 * @param {string} modalId - The ID of the modal container.
 * @param {string} triggerSelector - A CSS selector for elements that trigger the modal.
 */
export function initializeImageModal(modalId, triggerSelector) {
  const modal = document.getElementById(modalId);
  if (!modal) return;

  const modalImage = modal.querySelector('#modalImage');
  const modalItemName = modal.querySelector('#modalItemName');
  const modalArtistName = modal.querySelector('#modalArtistName');
  const closeModalBtn = modal.querySelector('#modalCloseBtn');

  function openModal(item) {
    if (!item || !modalImage || !modalItemName || !modalArtistName) return;

    // Get data from the clicked item's data attributes
    const imgSrc = item.dataset.imgSrc;
    const itemName = item.dataset.itemName || 'Creation';
    const artistName = item.dataset.artistName || 'Unknown Artist';
    const artistId = item.dataset.artistId;

    // Populate the modal with the data
    modalImage.src = imgSrc;
    modalImage.alt = `Enlarged view of ${itemName}`;
    modalItemName.textContent = itemName;
    modalArtistName.textContent = artistName;

    if (artistId) {
      modalArtistName.href = `artistsprofile.html?id=${artistId}`;
    } else {
      modalArtistName.removeAttribute('href');
    }

    // Show the modal and prevent background scrolling
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modal.classList.add('hidden');
    document.body.style.overflow = ''; // Restore background scrolling
  }

  // Use event delegation for dynamically added items
  document.body.addEventListener('click', (event) => {
    const triggerElement = event.target.closest(triggerSelector);
    if (triggerElement) {
      openModal(triggerElement);
    }
  });

  // Add listeners for closing the modal
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', closeModal);
  }

  // Close when clicking on the dark background overlay
  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      closeModal();
    }
  });

  // Close with the Escape key for accessibility
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !modal.classList.contains('hidden')) {
      closeModal();
    }
  });
}
