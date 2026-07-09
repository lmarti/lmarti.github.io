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
  var scroller = document.querySelector(".pub-scroll");

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
      if (scroller) scroller.scrollTop = 0;
    });
  });

  if (sortBtn) {
    sortBtn.addEventListener("click", function () {
      newestFirst = !newestFirst;
      applySort();
      if (scroller) scroller.scrollTop = 0;
    });
  }

  controls.hidden = false;
  applySort();
  applyFilter();
})();

// Abstract toggles. Without JS the abstract stays visible and no button shows;
// with JS we collapse each abstract and reveal a button that toggles it.
(function () {
  "use strict";

  var buttons = Array.prototype.slice.call(
    document.querySelectorAll(".abstract-toggle")
  );

  buttons.forEach(function (btn) {
    var panel = btn.nextElementSibling;
    if (!panel || !panel.classList.contains("abstract")) return;

    panel.hidden = true;
    btn.hidden = false;

    btn.addEventListener("click", function () {
      var open = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!open));
      panel.hidden = open;
      btn.textContent = open ? "Show abstract" : "Hide abstract";
    });
  });
})();

// BibTeX toggles. Without JS the BibTeX block stays visible and no buttons show;
// with JS we collapse each block, reveal a toggle, and reveal an in-block copy
// button that writes the citation to the clipboard.
(function () {
  "use strict";

  var buttons = Array.prototype.slice.call(
    document.querySelectorAll(".bibtex-toggle")
  );

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "absolute";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy") ? resolve() : reject();
      } catch (e) {
        reject(e);
      }
      document.body.removeChild(ta);
    });
  }

  buttons.forEach(function (btn) {
    var panel = btn.nextElementSibling;
    if (!panel || !panel.classList.contains("bibtex")) return;

    var copyBtn = panel.querySelector(".bibtex-copy");
    var code = panel.querySelector("code");

    panel.hidden = true;
    btn.hidden = false;

    btn.addEventListener("click", function () {
      var open = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!open));
      panel.hidden = open;
      btn.textContent = open ? "Show BibTeX" : "Hide BibTeX";
    });

    if (copyBtn && code) {
      copyBtn.hidden = false;
      var resetTimer;
      copyBtn.addEventListener("click", function () {
        copyText(code.textContent).then(function () {
          copyBtn.classList.add("is-copied");
          copyBtn.setAttribute("title", "Copied");
          clearTimeout(resetTimer);
          resetTimer = setTimeout(function () {
            copyBtn.classList.remove("is-copied");
            copyBtn.setAttribute("title", "Copy BibTeX");
          }, 1500);
        }, function () {});
      });
    }
  });
})();
