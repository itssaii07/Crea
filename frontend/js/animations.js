document.addEventListener('DOMContentLoaded', function() {
  // First make sure all elements are visible if user prefers reduced motion
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('.story-element').forEach(el => {
      el.style.opacity = 1;
      el.style.transform = 'none';
    });
    return;
  }

  const storySection = document.querySelector('.story-section');
  if (!storySection) return;

  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
  } else {
    console.warn('GSAP or ScrollTrigger not loaded');
    return;
  }

  // Set initial states
  gsap.set('.story-title, .story-heading, .story-tagline', { opacity: 0, y: 20 });
  gsap.set('.story-bunny', { opacity: 0, x: -20 });
  gsap.set('.story-pot', { opacity: 0, x: 20 });
  gsap.set('.story-cloth', { opacity: 0, scale: 0.9, rotation: -8 });

  // Create a single ScrollTrigger for all animations
  const trigger = {
    trigger: storySection,
    start: "top 70%",
    once: true // Only play once
  };

  // Title animation
  gsap.to('.story-title', {
    opacity: 1,
    y: 0,
    duration: 0.7,
    ease: "power2.out",
    scrollTrigger: trigger
  });

  // Heading animation
  gsap.to('.story-heading', {
    opacity: 1,
    y: 0,
    duration: 0.7,
    delay: 0.2,
    ease: "power2.out",
    scrollTrigger: trigger
  });

  // Tagline animation
  gsap.to('.story-tagline', {
    opacity: 1,
    y: 0,
    duration: 0.7,
    delay: 0.4,
    ease: "power2.out",
    scrollTrigger: trigger
  });

  // Bunny animation
  gsap.to('.story-bunny', {
    opacity: 1,
    x: 0,
    duration: 0.7,
    delay: 0.3,
    ease: "back.out(1.2)",
    scrollTrigger: trigger
  });

  // Pot animation
  gsap.to('.story-pot', {
    opacity: 1,
    x: 0,
    duration: 0.7,
    delay: 0.5,
    ease: "back.out(1.2)",
    scrollTrigger: trigger
  });

  // Cloth animation
  gsap.to('.story-cloth', {
    opacity: 1,
    scale: 1,
    rotation: -3,
    duration: 0.7,
    delay: 0.7,
    ease: "power2.out",
    scrollTrigger: trigger
  });
});

window.addEventListener('load', function () {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!(window.gsap && window.ScrollTrigger)) return;

  gsap.registerPlugin(ScrollTrigger);

  gsap.fromTo('.fade-in-section',
    { opacity: 0, y: 30 },
    {
      opacity: 1, y: 0, duration: 1.2, ease: 'power2.out',
      scrollTrigger: { trigger: '.animated-gradient', start: 'top 70%' }
    }
  );
});