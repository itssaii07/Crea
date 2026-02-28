// Initialize navbar scroll functionality immediately without imports
const nav = document.querySelector("header#navbar");
if (nav) {
  nav.classList.add("show"); // initial state

  // Hide-on-scroll
  let lastY = window.scrollY, ticking = false;
  function onScroll() {
    const y = window.scrollY;
    if (y > lastY && y > 10) {
      nav.classList.remove("show");
      nav.classList.add("hide");
    } else {
      nav.classList.remove("hide");
      nav.classList.add("show");
    }
    lastY = y;
    ticking = false;
  }
  window.addEventListener("scroll", () => {
    if (!ticking) {
      requestAnimationFrame(onScroll);
      ticking = true;
    }
  }, { passive: true });
}

// Export the initialization function for manual initialization
window.initNavbar = function () {
  const nav = document.querySelector("header#navbar");
  if (nav) {
    nav.classList.add("show"); // initial state

    // Hide-on-scroll
    let lastY = window.scrollY, ticking = false;
    function onScroll() {
      const y = window.scrollY;
      if (y > lastY && y > 10) {
        nav.classList.remove("show");
        nav.classList.add("hide");
      } else {
        nav.classList.remove("hide");
        nav.classList.add("show");
      }
      lastY = y;
      ticking = false;
    }
    window.addEventListener("scroll", () => {
      if (!ticking) {
        requestAnimationFrame(onScroll);
        ticking = true;
      }
    }, { passive: true });
  }
};

// Dropdowns
let profileBtn = document.getElementById("profileBtn");
let dropdownMenu = document.getElementById("dropdownMenu");

if (profileBtn && dropdownMenu) {
  profileBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdownMenu.classList.toggle("hidden");
  });
}
// Delegated handler to survive re-injections
document.addEventListener('click', (e) => {
  const btn = e.target && e.target.closest ? e.target.closest('#profileBtn') : null;
  if (!btn) return;
  e.stopPropagation();
  profileBtn = document.getElementById('profileBtn');
  dropdownMenu = document.getElementById('dropdownMenu');
  if (dropdownMenu) dropdownMenu.classList.toggle('hidden');
}, true);

document.addEventListener("click", (e) => {
  if (dropdownMenu && !profileBtn.contains(e.target) && !dropdownMenu.contains(e.target)) {
    dropdownMenu.classList.add("hidden");
  }
});

// Mode switch - Initialize when page loads
function initializeModeSwitch() {
  const modeSwitch = document.getElementById("modeSwitch");
  const modeLabel = document.getElementById("modeLabel");

  if (!modeSwitch) return false;

  function updateModeUI(mode) {
    if (mode === "artist") {
      document.body.classList.add("artist-mode");
      document.body.classList.remove("user-mode");
      if (modeLabel) modeLabel.textContent = "Artist Mode";
    } else {
      document.body.classList.add("user-mode");
      document.body.classList.remove("artist-mode");
      if (modeLabel) modeLabel.textContent = "User Mode";
    }
  }

  const saved = localStorage.getItem("userMode") || "user";
  modeSwitch.checked = saved === "artist";
  updateModeUI(saved);

  // Remove any existing event listeners to prevent duplicates
  const existingHandler = modeSwitch._artistModeHandler;
  if (existingHandler) {
    modeSwitch.removeEventListener("change", existingHandler);
  }

  const handler = async () => {
    const mode = modeSwitch.checked ? "artist" : "user";
    localStorage.setItem("userMode", mode);
    updateModeUI(mode);

    try {
      // Get token directly from localStorage (don't rely on authService being loaded)
      const token = localStorage.getItem('token');

      if (!token) {
        throw new Error('Please log in to change artist mode.');
      }

      const response = await fetch('/api/user/artist-mode', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ enabled: modeSwitch.checked })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`Failed to update artist mode: ${errorData.error || 'Server error'}`);
      }

      const result = await response.json();
      console.log('Artist mode updated:', result);

      // Show success feedback
      if (modeLabel) {
        const originalText = modeLabel.textContent;
        modeLabel.textContent = "Updated!";
        setTimeout(() => {
          modeLabel.textContent = originalText;
        }, 1000);
      }

    } catch (error) {
      console.error('Error updating artist mode:', error);
      // Revert the switch on error
      modeSwitch.checked = !modeSwitch.checked;
      const revertedMode = modeSwitch.checked ? "artist" : "user";
      localStorage.setItem("userMode", revertedMode);
      updateModeUI(revertedMode);

      alert(error.message || 'Failed to update artist mode. Please try again.');
    }
  };

  modeSwitch._artistModeHandler = handler;
  modeSwitch.addEventListener("change", handler);
  return true;
}

// Try to initialize immediately if elements exist
setTimeout(() => {
  if (!initializeModeSwitch()) {
    // If not ready, set up observer to try when DOM changes
    const observer = new MutationObserver(() => {
      if (initializeModeSwitch()) {
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Stop observing after 10 seconds
    setTimeout(() => observer.disconnect(), 10000);
  }
}, 100);


// Auth-aware navbar controls
(function () {
  // On about page, do not enforce login-required interception
  try {
    const hrefNow = (window.location && window.location.href || '').toLowerCase();
    if (hrefNow.includes('about.html')) {
      return; // allow all clicks on about page
    }
  } catch (_) { }
  function byId(id) { return document.getElementById(id); }
  function show(el, yes) { if (!el) return; el.classList.toggle('hidden', !yes); }

  function updateNavbarForAuth(user) {
    const profileBtnEl = byId('profileBtn');
    const chatLinks = Array.from(document.querySelectorAll('a[href$="chatbox.html"]'));

    const isIn = !!user;
    // hide/show only protected controls; no login/signup button concept
    show(profileBtnEl, isIn);
    chatLinks.forEach(a => { a.classList.toggle('hidden', !isIn); });

    if (isIn) {
      // Dynamically load realtime service
      import('./js/realtime.js').then(module => {
        const realtimeService = module.default;
        realtimeService.subscribeToNotifications(user.id, (notification) => {
        });
      }).catch(err => {
        console.warn('Realtime service not available:', err);
      });
    } else {
      // Dynamically handle unsubscribe
      import('./js/realtime.js').then(module => {
        const realtimeService = module.default;
        realtimeService.unsubscribeAll();
      }).catch(err => {
        console.warn('Realtime service not available for unsubscribe:', err);
      });
    }
  }

  // listen for auth state updates from pages
  window.addEventListener('auth:state', function (e) {
    updateNavbarForAuth(e.detail && e.detail.user);
  });

  // Initialize once in case page sets user before this runs
  if (window.__authUser !== undefined) {
    updateNavbarForAuth(window.__authUser);
  }

  // Login-required popup disabled site-wide
  function ensureLoginPopup() { }
  function showLoginRequired() { }
  // Disabled click interception when logged out
})();

// Logout interception: handle any link to logout.html
(function () {
  try {
    const handleLogoutIntent = async (e, el) => {
      e.preventDefault();
      try {
        if (window.performLogout) { await window.performLogout(); } else { window.location.href = 'entry.html'; }
      } catch (err) { window.location.href = 'entry.html'; }
    };

    const attachDirect = () => {
      const logoutLinks = Array.from(document.querySelectorAll('a[href*="logout" i], #logoutBtn'));
      logoutLinks.forEach(link => {
        link.addEventListener('pointerdown', (e) => handleLogoutIntent(e, link));
        link.addEventListener('click', (e) => handleLogoutIntent(e, link));
      });
    };

    // Attach to existing elements
    attachDirect();

    // Delegated handler for future/injected elements
    const delegate = async (e) => {
      const a = e.target && e.target.closest ? e.target.closest('a[href], button#logoutBtn, #logoutBtn') : null;
      if (!a) return;
      const hrefRaw = a.getAttribute && a.getAttribute('href');
      const href = (hrefRaw || '').toLowerCase();
      const isLogout = (href.includes('logout')) || a.id === 'logoutBtn';
      if (!isLogout) return;
      await handleLogoutIntent(e, a);
    };

    document.addEventListener('pointerdown', delegate, true);
    document.addEventListener('click', delegate, true);
  } catch (e) { }
})();