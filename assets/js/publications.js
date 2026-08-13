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
      c.setAttribute(
        "aria-pressed",
        String(c.getAttribute("data-filter") === activeFilter),
      );
    });
    if (countEl) {
      // countEl.textContent =
      //  visible + (visible === 1 ? " publication" : " publications");
      countEl.textContent = "[" + visible + "] ";
    }
    document.dispatchEvent(new CustomEvent("pubs:changed"));
  }

  function applySort() {
    var sorted = items.slice().sort(function (a, b) {
      return newestFirst ? yearOf(b) - yearOf(a) : yearOf(a) - yearOf(b);
    });
    sorted.forEach(function (li) {
      list.appendChild(li);
    });
    if (sortBtn) {
      sortBtn.textContent = newestFirst ? "⬇Date" : "⬆Date";
      sortBtn.setAttribute("aria-pressed", String(!newestFirst));
    }
    document.dispatchEvent(new CustomEvent("pubs:changed"));
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
    document.querySelectorAll(".abstract-toggle"),
  );

  buttons.forEach(function (btn) {
    var item = btn.closest("li");
    var panel = item && item.querySelector(".abstract");
    if (!panel) return;

    panel.hidden = true;
    btn.hidden = false;

    btn.addEventListener("click", function () {
      var open = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!open));
      panel.hidden = open;
    });
  });
})();

// Year landmarks. On the first visible entry of each year, hang a small
// year label in the left gutter. Re-renders whenever the list is filtered
// or re-sorted (the controls script fires "pubs:changed").
(function () {
  "use strict";

  var lists = Array.prototype.slice.call(
    document.querySelectorAll("ul.publications"),
  );
  if (!lists.length) return;

  function render() {
    lists.forEach(function (list) {
      Array.prototype.slice
        .call(list.querySelectorAll(".pub-year"))
        .forEach(function (el) {
          el.remove();
        });
      var lastYear = null;
      Array.prototype.slice
        .call(list.querySelectorAll("li:not(.is-hidden)"))
        .forEach(function (li) {
          var pub = li.querySelector(".pub");
          var year = pub ? pub.getAttribute("data-year") : null;
          if (!year || year === lastYear) return;
          lastYear = year;
          var mark = document.createElement("span");
          mark.className = "pub-year";
          mark.setAttribute("aria-hidden", "true");
          mark.textContent = year;
          li.insertBefore(mark, li.firstChild);
        });
    });
  }

  document.addEventListener("pubs:changed", render);
  render();
})();

// Identifiers, not URLs. The APA reference prints bare URLs as body text;
// re-set each as a compact labeled link: arXiv IDs, DOIs, or the bare
// hostname for anything else. Without JS the plain URL stays readable.
(function () {
  "use strict";

  var URL_RE = /https?:\/\/[^\s<>()]*[^\s<>().,;:]/g;

  function labelFor(url) {
    var m = url.match(/^https?:\/\/arxiv\.org\/abs\/(.+)$/i);
    if (m) return "arXiv:" + m[1];
    m = url.match(/^https?:\/\/(?:dx\.)?doi\.org\/(.+)$/i);
    if (m) return "doi:" + decodeURIComponent(m[1]);
    try {
      return new URL(url).hostname.replace(/^www\./, "") + "";
    } catch (e) {
      return url;
    }
  }

  function linkify(node) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      if (node.tagName === "A") return;
      Array.prototype.slice.call(node.childNodes).forEach(linkify);
      return;
    }
    if (node.nodeType !== Node.TEXT_NODE) return;
    var text = node.nodeValue;
    if (!URL_RE.test(text)) return;
    URL_RE.lastIndex = 0;

    var frag = document.createDocumentFragment();
    var last = 0;
    var m;
    while ((m = URL_RE.exec(text)) !== null) {
      frag.appendChild(document.createTextNode(text.slice(last, m.index)));
      var a = document.createElement("a");
      a.className = "pub-id";
      a.href = m[0];
      a.textContent = labelFor(m[0]);
      frag.appendChild(a);
      last = m.index + m[0].length;
    }
    frag.appendChild(document.createTextNode(text.slice(last)));
    node.parentNode.replaceChild(frag, node);
  }

  Array.prototype.slice
    .call(document.querySelectorAll(".pub"))
    .forEach(linkify);
})();

// BibTeX toggles. Without JS the BibTeX block stays visible and no buttons show;
// with JS we collapse each block, reveal a toggle, and reveal an in-block copy
// button that writes the citation to the clipboard.
(function () {
  "use strict";

  var buttons = Array.prototype.slice.call(
    document.querySelectorAll(".bibtex-toggle"),
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
    var item = btn.closest("li");
    var panel = item && item.querySelector(".bibtex");
    if (!panel) return;

    var copyBtn = panel.querySelector(".bibtex-copy");
    var code = panel.querySelector("code");

    panel.hidden = true;
    btn.hidden = false;

    btn.addEventListener("click", function () {
      var open = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!open));
      panel.hidden = open;
    });

    if (copyBtn && code) {
      copyBtn.hidden = false;
      var resetTimer;
      copyBtn.addEventListener("click", function () {
        copyText(code.textContent).then(
          function () {
            copyBtn.classList.add("is-copied");
            copyBtn.setAttribute("title", "Copied");
            clearTimeout(resetTimer);
            resetTimer = setTimeout(function () {
              copyBtn.classList.remove("is-copied");
              copyBtn.setAttribute("title", "Copy BibTeX");
            }, 1500);
          },
          function () {},
        );
      });
    }
  });
})();
