// Keeps the stacked background pages (.wrap::before / ::after) protruding by a
// roughly constant amount regardless of how long the page is.
//
// A rectangle of height H rotated by angle θ about its centre pushes its
// corners sideways by ≈ (H/2)·sin θ. With a fixed angle, a long page (e.g.
// publications) makes the stacked pages fan out far more than a short one.
// Holding the protrusion constant means sin(θ) must scale as REF_HEIGHT / H,
// so the angle shrinks as the page grows. Without this script the SCSS
// fallbacks (-2.5deg / 1.4deg) apply unchanged.
(function () {
  "use strict";

  var wrap = document.querySelector(".wrap");
  if (!wrap) return;

  // Reference height at which the original fixed angles are reproduced exactly.
  var REF_HEIGHT = 900;
  var layers = [
    { prop: "--rot-before", refDeg: -2.5, maxDeg: 4 },
    { prop: "--rot-after", refDeg: 1.4, maxDeg: 3 }
  ];

  var raf = 0;

  function update() {
    raf = 0;
    var h = wrap.offsetHeight;
    if (!h) return;
    layers.forEach(function (layer) {
      var sin = Math.sin(layer.refDeg * Math.PI / 180) * REF_HEIGHT / h;
      sin = Math.max(-1, Math.min(1, sin));
      var deg = Math.asin(sin) * 180 / Math.PI;
      if (deg > layer.maxDeg) deg = layer.maxDeg;
      if (deg < -layer.maxDeg) deg = -layer.maxDeg;
      wrap.style.setProperty(layer.prop, deg.toFixed(3) + "deg");
    });
  }

  function schedule() {
    if (!raf) raf = requestAnimationFrame(update);
  }

  update();
  window.addEventListener("resize", schedule);
  window.addEventListener("load", update);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(update);
  }
})();
