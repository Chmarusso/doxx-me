This is a [Next.js](https://nextjs.org) project converted from a Vite project originally bootstrapped with [`@farcaster/create-mini-app`](https://github.com/farcasterxyz/miniapps/tree/main/packages/create-mini-app).

For documentation and guides, visit [miniapps.farcaster.xyz](https://miniapps.farcaster.xyz/docs/getting-started).

## Getting Started

First, install the dependencies:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## `farcaster.json`

The `/.well-known/farcaster.json` is served from the [public directory](https://nextjs.org/docs/app/building-your-application/optimizing/static-assets) and can be updated by editing `./public/.well-known/farcaster.json`.

You can also use the `public` directory to serve a static image for `splashBackgroundImageUrl`.

## Frame Embed

Add a the `fc:frame` in your app's metadata to make your root app URL sharable in feeds:

```tsx
// app/layout.tsx
export const metadata = {
  other: {
    'fc:frame': JSON.stringify({
      version: "next",
      imageUrl: "https://placehold.co/900x600.png?text=Frame%20Image",
      button: {
        title: "Open",
        action: {
          type: "launch_frame",
          name: "App Name",
          url: "https://app.com"
        }
      }
    })
  }
}
```

