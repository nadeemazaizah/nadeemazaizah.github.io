# nadeemazaizah.github.io

Personal website of **Nadeem Azaizah, PhD**, Senior Data Scientist at Microsoft (Applied AI, GenAI and Graph AI).

Live: https://nadeemazaizah.github.io

## Stack

Plain HTML, CSS and JavaScript. No build step, no frameworks, no trackers.

| File | Purpose |
| --- | --- |
| `index.html` | All page content |
| `assets/css/style.css` | Design tokens, text styles and layout |
| `assets/js/graph.js` | Interactive knowledge graph in the hero |
| `assets/js/main.js` | Scroll reveals, navigation, tagline reveal, commit graph lines |
| `404.html` | Custom not found page |

## Editing content

* **Hero graph nodes:** edit the `hubs` and `cross` objects at the top of `assets/js/graph.js`.
* **Career (commit graph):** each `<li class="commit">` in the `#journey` section is one commit. Use `data-lane="main"` for industry and `data-lane="acad"` for academia. A research branch is drawn from a `data-branch="key"` commit up to the matching `data-merge="key"` commit.
* **Publications:** add an `<li class="pub">` in the `#research` section. Update citation counts from Google Scholar.
* **Projects:** add an `<a class="repo">` card in the `#workshops` section when private repositories become public.
* **Photo:** replace `assets/img/profile.jpg` (square, at least 400 × 400).

## Local preview

```powershell
python -m http.server 8000
```

Then open http://localhost:8000.

## Deploy

GitHub Pages serves the `main` branch root. Push to `main` and the site updates within a minute.
