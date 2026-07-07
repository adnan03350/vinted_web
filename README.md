# ThriftAsia

ThriftAsia is an original marketplace MVP for second-hand buying and selling across Asia. The experience is built with Next.js, TypeScript, Tailwind CSS, and is ready for Supabase and Cloudinary integration.

## Features
- Home page with featured listings
- Browse products with keyword, category, country, condition, and price filters
- Product detail experience
- Sell/upload flow
- Seller profile, chat, orders, settings, and admin dashboard
- Responsive mobile-first UI

## Tech stack
- Next.js 14+
- TypeScript
- Tailwind CSS
- Supabase Auth and PostgreSQL
- Cloudinary for product media
- Vercel deployment ready

## Local setup
1. Install dependencies:
   npm install
2. Copy .env.example to .env.local and fill in your values.
3. Run the development server:
   npm run dev
4. Visit http://localhost:3000

## Supabase setup
1. Create a new Supabase project.
2. Run the SQL from supabase-schema.sql in the SQL editor.
3. Enable Supabase Auth and configure your redirect URLs.
4. Connect the app using NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.

## Cloudinary setup
1. Create a Cloudinary account.
2. Add your cloud name, API key, and API secret to the environment variables.
3. Use the upload flow from the sell page to post media.

## Deployment
1. Push the repository to GitHub.
2. Create a Vercel project and import the repository.
3. Add all environment variables from .env.example.
4. Deploy.

## Notes
Run all SQL migrations listed in `DEPLOYMENT.md` before going live. Use `/api/health` to verify environment and database connectivity in production.
