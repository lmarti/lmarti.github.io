---
layout: page
title: Contact
permalink: /contact/
description: >-
  How to reach Luis Martí — email and academic profiles (Google Scholar,
  DBLP, GitHub, OpenReview, ResearchGate).
---

The best way to reach me is by email:

- **Email:** [luis_marti@dkl.digital](mailto:luis_marti@dkl.digital)

You can also find me on:

{% for p in site.profiles %}- [{{ p.name }}]({{ p.url }})
{% endfor %}
