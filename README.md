### Live Queue App for Beneficent Coaching & Tarot

I built this app for a friend ([beneficent.coach](//beneficent.coach)) who was dealing with long queues of people waiting for one of his tarot card readings. One can scan a QR code to this website, fill in their email and name, and join a live queue, backed by an [airtable](//airtable.com) that he could manage invitations from. Mailing list signups were also gathered here.

* Frontend website for filling out a form and joining a mailing list.
* SMS integration. Users get notified of their turn when they've signed up, are up next, a 5 minute reminder, and marked as no-show + canceled.
* User invitations tracked names, telephones, signups to the mailing list (optional), and a link to the live event they attended.

----

This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
