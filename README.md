# Shindig Kitchen

Recipe site, canning guides and shop — built with Node.js, Express and PostgreSQL.

## Stack
- **Backend**: Node.js + Express
- **Database**: PostgreSQL
- **Hosting**: Railway
- **Payments**: Stripe (coming soon)
- **Images**: Multer + Sharp

## Local development

```bash
npm install
# Create a .env file with:
# DATABASE_URL=your_postgres_url
# SESSION_SECRET=any_random_string
node server.js
```

## Deploy
Connected to Railway via GitHub. Push to `main` branch to deploy automatically.
