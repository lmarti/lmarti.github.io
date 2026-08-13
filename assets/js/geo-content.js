// Geo-targeted content: show or hide elements depending on the reader's
// country. Usage in any page or include:
//
//   <p data-geo-show="ES PT">Only readers in Spain or Portugal see this.</p>
//   <p data-geo-hide="US">Everyone except US readers sees this.</p>
//   <p data-geo-show="LATAM">Group names work too (see GROUPS below).</p>
//
// Tokens are ISO 3166-1 alpha-2 codes and/or group names, separated by
// spaces or commas, case-insensitive. Detection order: ?geo=XX URL
// override (for testing) → cached result → geo-IP lookup (geojs.io, then
// country.is) → IANA timezone heuristic. The detected country is cached
// in localStorage for a day so the network is hit at most once per day.
//
// Geo-targeted elements are pre-hidden by a style rule injected in
// _includes/head.html before first paint; once the country resolves the
// matching ones are revealed and the rest are DELETED from the DOM, so
// hidden variants are absent from the rendered page (find-in-page,
// inspector, copy, print, reader mode). They do remain in the raw HTML
// the server sends — a static host cannot strip them per reader.
// When the country cannot be determined (offline, ad-blocker), each
// element's data-geo-fallback attribute decides: "hide" removes it,
// anything else — the default — shows it, so a blocked lookup never
// silently loses content.
(function () {
  "use strict";

  var CACHE_KEY = "geo-country";
  var CACHE_TTL = 24 * 60 * 60 * 1000; // one day, in ms

  var GROUPS = {
    EU: [
      "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
      "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
      "PL", "PT", "RO", "SK", "SI", "ES", "SE",
    ],
    LATAM: [
      "AR", "BO", "BR", "CL", "CO", "CR", "CU", "DO", "EC", "SV",
      "GT", "HN", "MX", "NI", "PA", "PY", "PE", "PR", "UY", "VE",
    ],
  };

  // Last-resort country guess from the IANA timezone — covers the common
  // zones only, and travelers/VPN users will be misattributed. Used when
  // both geo-IP endpoints are unreachable (offline, ad-blockers).
  var TZ_COUNTRY = {
    "Europe/Madrid": "ES", "Atlantic/Canary": "ES", "Europe/Lisbon": "PT",
    "Europe/Paris": "FR", "Europe/London": "GB", "Europe/Dublin": "IE",
    "Europe/Berlin": "DE", "Europe/Vienna": "AT", "Europe/Zurich": "CH",
    "Europe/Rome": "IT", "Europe/Amsterdam": "NL", "Europe/Brussels": "BE",
    "Europe/Stockholm": "SE", "Europe/Oslo": "NO", "Europe/Copenhagen": "DK",
    "Europe/Helsinki": "FI", "Europe/Warsaw": "PL", "Europe/Prague": "CZ",
    "Europe/Athens": "GR", "Europe/Bucharest": "RO", "Europe/Budapest": "HU",
    "Europe/Kyiv": "UA", "Europe/Istanbul": "TR",
    "America/New_York": "US", "America/Chicago": "US", "America/Denver": "US",
    "America/Phoenix": "US", "America/Los_Angeles": "US", "America/Anchorage": "US",
    "America/Toronto": "CA", "America/Vancouver": "CA",
    "America/Mexico_City": "MX", "America/Bogota": "CO", "America/Lima": "PE",
    "America/Santiago": "CL", "America/Argentina/Buenos_Aires": "AR",
    "America/Sao_Paulo": "BR", "America/Caracas": "VE",
    "America/Montevideo": "UY", "America/La_Paz": "BO",
    "America/Guayaquil": "EC", "America/Asuncion": "PY",
    "America/Panama": "PA", "America/Havana": "CU",
    "America/Santo_Domingo": "DO", "America/Puerto_Rico": "PR",
    "Asia/Tokyo": "JP", "Asia/Shanghai": "CN", "Asia/Hong_Kong": "HK",
    "Asia/Singapore": "SG", "Asia/Seoul": "KR", "Asia/Kolkata": "IN",
    "Asia/Dubai": "AE", "Asia/Jerusalem": "IL", "Asia/Bangkok": "TH",
    "Asia/Jakarta": "ID",
    "Australia/Sydney": "AU", "Australia/Melbourne": "AU",
    "Pacific/Auckland": "NZ",
    "Africa/Cairo": "EG", "Africa/Johannesburg": "ZA", "Africa/Lagos": "NG",
    "Africa/Nairobi": "KE", "Africa/Casablanca": "MA",
  };

  // Free, keyless, HTTPS geo-IP endpoints; the second is a fallback.
  var SOURCES = [
    { url: "https://get.geojs.io/v1/ip/country.json", pick: function (d) { return d.country; } },
    { url: "https://api.country.is", pick: function (d) { return d.country; } },
  ];

  function readCache() {
    try {
      var raw = JSON.parse(localStorage.getItem(CACHE_KEY));
      if (raw && raw.country && Date.now() - raw.at < CACHE_TTL) return raw.country;
    } catch (e) {}
    return null;
  }

  function writeCache(country) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ country: country, at: Date.now() }));
    } catch (e) {
      /* private mode etc. — we just look it up again next visit */
    }
  }

  function tokens(value) {
    return value.toUpperCase().split(/[\s,]+/).filter(Boolean);
  }

  function matches(value, country) {
    return tokens(value).some(function (t) {
      return t === country || (GROUPS[t] && GROUPS[t].indexOf(country) !== -1);
    });
  }

  // country is an alpha-2 code, or null when detection failed.
  function apply(country) {
    document.documentElement.setAttribute("data-geo-country", country || "unknown");
    var els = document.querySelectorAll("[data-geo-show], [data-geo-hide]");
    Array.prototype.forEach.call(els, function (el) {
      var show = el.getAttribute("data-geo-show");
      var hide = el.getAttribute("data-geo-hide");
      var visible;
      if (!country) {
        visible = el.getAttribute("data-geo-fallback") !== "hide";
      } else if (show !== null) {
        // When both attributes are present, show must match and hide must not.
        visible = matches(show, country) && !(hide !== null && matches(hide, country));
      } else {
        visible = !matches(hide, country);
      }
      // "resolved" lifts the pre-paint hiding rule; non-matching elements
      // are deleted outright so their text is gone from the live DOM.
      if (visible) el.setAttribute("data-geo-resolved", "");
      else el.remove();
    });
  }

  function fetchWithTimeout(url) {
    // Everything geo-marked stays invisible until resolution, so bound the
    // wait: a hung endpoint must not blank content for more than ~3 s.
    var opts = {};
    try {
      opts.signal = AbortSignal.timeout(3000);
    } catch (e) {
      /* older browser without AbortSignal.timeout — no bound, still works */
    }
    return fetch(url, opts);
  }

  function lookup(i) {
    if (i >= SOURCES.length) return Promise.resolve(null);
    return fetchWithTimeout(SOURCES[i].url)
      .then(function (r) {
        if (!r.ok) throw new Error(r.status);
        return r.json();
      })
      .then(function (d) {
        var c = String(SOURCES[i].pick(d) || "").toUpperCase();
        if (!/^[A-Z]{2}$/.test(c)) throw new Error("bad payload");
        return c;
      })
      .catch(function () {
        return lookup(i + 1);
      });
  }

  // ?geo=BR previews the page as a Brazilian reader; ?geo=unknown previews
  // the failed-lookup state. One page load only — the cache is untouched.
  var override = new URLSearchParams(location.search).get("geo");
  if (override && /^([A-Za-z]{2}|unknown)$/.test(override)) {
    apply(override.toLowerCase() === "unknown" ? null : override.toUpperCase());
    return;
  }

  var cached = readCache();
  if (cached) {
    apply(cached);
    return;
  }

  lookup(0)
    .then(function (country) {
      if (country) return country;
      try {
        return TZ_COUNTRY[Intl.DateTimeFormat().resolvedOptions().timeZone] || null;
      } catch (e) {
        return null;
      }
    })
    .then(function (country) {
      if (country) writeCache(country);
      apply(country);
    });
})();
