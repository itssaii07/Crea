(function(){
  const mount = document.getElementById('navbar-mount');
  if (!mount) return;
  fetch('navbar.html')
    .then(r=>r.text())
    .then(html=>{
      mount.innerHTML = html;
      // Import and initialize navbar functionality
      import('../navbar.js').then(module => {
        if (window.initNavbar) {
          window.initNavbar();
        }
      });
    })
    .catch(()=>{});
})();