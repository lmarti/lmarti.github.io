lmarti.github.io
================

```sh
git subtree pull --prefix _bibliography/pubs https://github.com/lmarti/pubs-nspi-lm main --squash
```

Geo-targeted content
--------------------

Any element can be shown or hidden by the reader's country
(`assets/js/geo-content.js`, detected via geo-IP with a timezone
fallback, cached for a day):

```html
<p data-geo-show="ES PT">Only visible from Spain or Portugal.</p>
<p data-geo-hide="US">Hidden from readers in the United States.</p>
<span data-geo-show="LATAM">Group names (EU, LATAM) also work.</span>
```

Match the element to the text flow: `<span>` for words inside a
sentence, `<div>`/`<p>` only for standalone blocks. Never put a `<div>`
inside a `<p>` — that is invalid HTML and the browser splits the
paragraph, leaving line breaks and gaps whether or not the block is
shown.

Tokens are ISO 3166-1 alpha-2 codes or a group defined in `GROUPS`,
space- or comma-separated, case-insensitive. Non-matching elements are
deleted from the DOM after the country resolves, so hidden variants are
absent from the rendered page (find-in-page, inspector, copy, print).
They still exist in the raw HTML the server sends — a static host can't
strip content per reader — so never use this for anything private.
If the country cannot be determined the element is shown unless it has
`data-geo-fallback="hide"`. The detected code is also set on
`<html data-geo-country="…">` for CSS-only tweaks. Preview any region
with `?geo=br` (or `?geo=unknown`) appended to a page URL.
