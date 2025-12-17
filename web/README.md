# Developer Journal Web App

A beautiful React-based web interface for viewing and editing your developer journal entries, powered by Kronus AI.

## Features

- 🔐 **Simple Authentication** - Password-based login
- 📚 **Journal Reader** - Browse entries by repository, branch, or view all
- ✏️ **Direct Editing** - Manually edit entry fields
- 🤖 **Kronus AI Integration** - Chat with Kronus to regenerate or refine entries
- 📎 **Attachment Support** - View file attachments for entries
- 🎨 **Modern UI** - Clean, responsive design with Tailwind CSS

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment Variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and set:
   - `JWT_SECRET` - Secret key for JWT tokens
   - `ADMIN_PASSWORD_HASH` - Optional: bcrypt hash of your password (defaults to 'admin')
   - `JOURNAL_DB_PATH` - Optional: Path to journal.db (defaults to parent directory)
   - At least one AI API key: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, or `GOOGLE_API_KEY`
   - `SOUL_XML_PATH` - Optional: Path to custom Soul.xml

3. **Generate Password Hash (Optional)**
   ```bash
   node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('your-password', 10).then(h => console.log(h))"
   ```
   Copy the output to `ADMIN_PASSWORD_HASH` in `.env`.

4. **Run Development Server**
   ```bash
   npm run dev
   ```

5. **Open Browser**
   Navigate to `http://localhost:3000`

## Default Login

- **Password**: `admin` (unless `ADMIN_PASSWORD_HASH` is set)

## Usage

### Viewing Entries

1. Log in with your password
2. Browse entries on the home page
3. Filter by repository using the dropdown
4. Click an entry to view details

### Editing Entries

1. Open an entry
2. Click **Edit** to manually edit fields
3. Click **Kronus** to chat with AI for regeneration

### Kronus Chat

The Kronus interface allows you to:
- **Regenerate Entry**: Re-analyze the original agent report
- **Edit with Context**: Provide new context or instructions for Kronus to refine the entry

Kronus will generate updated fields that you can review and apply.

## Deployment to Vercel

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Add web app"
   git push
   ```

2. **Import to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Import your repository
   - Set environment variables in Vercel dashboard
   - Deploy!

3. **Environment Variables in Vercel**
   - `JWT_SECRET` - Generate a secure random string
   - `ADMIN_PASSWORD_HASH` - Your password hash
   - `ANTHROPIC_API_KEY` (or OpenAI/Google)
   - `JOURNAL_DB_PATH` - If using a remote database
   - `SOUL_XML_PATH` - If using custom Soul.xml

**Note**: For Vercel deployment, you'll need to host your SQLite database elsewhere (e.g., AWS S3, or use a remote database). The web app expects the database to be accessible via `JOURNAL_DB_PATH`.

## Architecture

- **Next.js 16** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **better-sqlite3** - Database access (shared with MCP server)
- **Vercel AI SDK** - AI integration (same as MCP server)

## API Routes

- `POST /api/auth/login` - Authenticate user
- `POST /api/auth/logout` - Logout user
- `GET /api/entries` - List entries (with filters)
- `GET /api/entries/[commitHash]` - Get entry details
- `PATCH /api/entries/[commitHash]` - Update entry
- `GET /api/repositories` - List repositories
- `POST /api/kronus/generate` - Generate/regenerate entry with Kronus

## Security Notes

- Passwords are hashed with bcrypt
- JWT tokens are httpOnly cookies
- Database access is read-write (ensure proper access controls)
- In production, use HTTPS and secure environment variables
