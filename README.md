# ClashSync

ClashSync is a social web application for scheduling and discussing livestream "battles". It is built with Next.js, Firebase and Tailwind CSS.

## Features
- **Battle scheduling** – users can challenge others and accept or decline battle requests.
- **Direct messages** – chat privately in threads with another user.
- **Community chat** – public channels with moderation tools.
- **TikTok or email sign‑in** – authentication handled by Firebase.

More background and design notes can be found in [docs/blueprint.md](docs/blueprint.md).

## Development
Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

The project uses TypeScript and Tailwind CSS. Firebase configuration lives in `src/lib/firebase.ts` and Firestore security rules are in `firestore.rules`.
