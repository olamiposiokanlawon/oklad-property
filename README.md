# Oklad Property

A multi-page property marketing site for Oklad Property. Visitors can browse the portfolio, read full property details, and contact the team to ask questions or arrange a viewing. The site is not an online store: it has no cart, checkout or payment flow.

## Pages

- `/` — editorial home page and selected properties
- `/properties` — filterable portfolio
- `/property/:id` — property detail page with photo gallery and enquiry options
- `/about`, `/services`, `/contact` — company, service and contact pages
- `/admin` — password-protected listing and site management

Older shared links in the `/#/p/:id` format still open the matching property page.

## Run locally

Requires Node.js 18 or newer.

```sh
npm install
npm run server
```

Open `http://localhost:3000`. The first start creates a local `data/` folder and seeds it with the supplied sample listings and photos. If `ADMIN_PASSWORD` is not set, the server prints a generated password in the terminal. Set a chosen password in `.env` before first start by copying `.env.example` to `.env`.

For frontend development with hot reload, use two terminals:

```sh
npm run server
npm run dev
```

Then open `http://localhost:5173`. The API is proxied to the local server.

## Admin features

At `/admin`, staff can add, edit, publish, hide, feature and delete listings; upload, remove and reorder listing photos; manage plot details; review and manage enquiries; update contact and social links; and change the admin password.

Add the business WhatsApp, phone, email, office address and social links under **Settings**. These details appear on the public pages.

## Go live

```sh
npm install
npm run build
npm start
```

The Node server serves the built website, API and uploaded images from one process. Host it on Node 18+ with persistent storage and point `DATA_DIR` at that storage. Back up `DATA_DIR`, which holds listing data, uploaded photos, enquiries and the password hash. Use HTTPS in production. Set `TRUST_PROXY=1` when running behind a trusted reverse proxy.
