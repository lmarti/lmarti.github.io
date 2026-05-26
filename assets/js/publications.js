// Progressive enhancement for /publications/.
// Without this script every entry stays visible and the controls stay hidden.
(function () {
  "use strict";

  var list = document.querySelector("ul.publications");
  var controls = document.querySelector(".pub-controls");
  if (!list || !controls) return;

  var items = Array.prototype.slice.call(list.querySelectorAll("li"));
  if (!items.length) return;

  function typeOf(li) {
    var pub = li.querySelector(".pub");
    return pub ? pub.getAttribute("data-type") : null;
  }
  function yearOf(li) {
    var pub = li.querySelector(".pub");
    var y = pub ? parseInt(pub.getAttribute("data-year"), 10) : NaN;
    return isNaN(y) ? 0 : y;
  }

  var chips = Array.prototype.slice.call(controls.querySelectorAll(".chip"));
  var sortBtn = controls.querySelector(".sort-toggle");
  var countEl = document.querySelector(".pub-count");

  var activeFilter = "all";
  var newestFirst = true;

  function applyFilter() {
    var visible = 0;
    items.forEach(function (li) {
      var match = activeFilter === "all" || typeOf(li) === activeFilter;
      li.classList.toggle("is-hidden", !match);
      if (match) visible++;
    });
    chips.forEach(function (c) {
      c.setAttribute("aria-pressed", String(c.getAttribute("data-filter") === activeFilter));
    });
    if (countEl) {
      countEl.textContent = visible + (visible === 1 ? " publication" : " publications");
    }
  }

  function applySort() {
    var sorted = items.slice().sort(function (a, b) {
      return newestFirst ? yearOf(b) - yearOf(a) : yearOf(a) - yearOf(b);
    });
    sorted.forEach(function (li) { list.appendChild(li); });
    if (sortBtn) {
      sortBtn.textContent = newestFirst ? "Sort: Newest first" : "Sort: Oldest first";
      sortBtn.setAttribute("aria-pressed", String(!newestFirst));
    }
  }

  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      activeFilter = chip.getAttribute("data-filter");
      applyFilter();
    });
  });

  if (sortBtn) {
    sortBtn.addEventListener("click", function () {
      newestFirst = !newestFirst;
      applySort();
    });
  }

  controls.hidden = false;
  applySort();
  applyFilter();
})();
