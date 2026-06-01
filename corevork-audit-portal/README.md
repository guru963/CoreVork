# CoreVork Audit Portal

Professional audit management platform for workplace safety compliance.

## Stack
- **Frontend**: React.js + Tailwind CSS + Zustand
- **Backend**: Supabase (Auth, Database, Storage)
- **PDF**: Puppeteer (via backend service)
- **Deployment**: GitHub Actions

## Getting Started

### 1. Supabase Setup
1. Create a project at [supabase.com](https://supabase.com)
2. Run the SQL in `backend/supabase/schema.sql` in the Supabase SQL editor
3. Enable Storage and create a bucket named `audit-photos`
4. Copy your project URL and anon key

### 2. Frontend
```bash
cd frontend
cp .env.example .env
# Fill in your Supabase credentials
npm install
npm run dev
```

### 3. Backend (PDF Service)
```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

## Project Structure
```
corevork-audit-portal/
├── frontend/          # React app
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── store/
│       ├── hooks/
│       └── lib/
├── backend/           # PDF generation service
│   └── src/
│       ├── routes/
│       ├── controllers/
│       └── services/
└── README.md
```

## Roles
- **Admin**: Full access, manage users, view all audits
- **Inspector**: Create & submit audits
- **Viewer**: Read-only access to reports
