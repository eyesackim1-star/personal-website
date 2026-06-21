# Isaac Kim — Personal Website

A clean, responsive single-page portfolio for Isaac Kim, EIT — structural
engineering intern at Hohbach-Lewin.

## Stack

Plain static site — no build step, no dependencies.

- `index.html` — page content and structure
- `styles.css` — styling (responsive, mobile nav)
- `main.js` — mobile nav toggle and footer year
- `images/` — portrait (`isaac.jpg`) and assets

## Running locally

Open `index.html` directly in a browser, or serve the folder:

```sh
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Customizing

Most content lives in `index.html` (bio, experience, education, contact).
The portrait is `images/isaac.jpg` — swap in a higher-resolution headshot
under the same name to upgrade it. Colors and fonts are defined as CSS
variables at the top of `styles.css`.

## Deploying

Any static host works (GitHub Pages, Netlify, Vercel, Cloudflare Pages). For
GitHub Pages, enable Pages on the repo and point it at the `main` branch root.
