# Chronicle

> A modern, full-stack blogging platform built for writers who care about the craft.

Chronicle is a self-hostable blogging platform with a rich Markdown editor, Google OAuth, private image hosting, and a clean reading experience — deployed as a single monolithic binary.

---

## ✨ Features

- **Rich Markdown Editor** — Split-pane editor with live preview, toolbar shortcuts (bold, italic, headings, code, tables, links, blockquotes), and resizable panels
- **Multiple Preview Themes** — Switch between Sans, Serif, Cyber, and Retro typography themes while writing
- **Mobile Preview Mode** — Preview how your post looks on mobile without leaving the editor
- **Draft & Publish Workflow** — Save posts as drafts, publish when ready
- **Google OAuth + Email/Password Auth** — Sign in with Google or create a local account
- **Private Image Storage** — Images are uploaded to a private S3-compatible bucket (Filebase) and proxied through the backend — no public bucket exposure
- **Comments** — Readers can comment; post authors can moderate (delete any comment on their post)
- **Tag System** — Tag posts for categorization
- **Dashboard** — Manage all your posts (drafts + published) from a single view
- **Monolithic Deployment** — Frontend is embedded into the Go binary's static file server; one port, one process

---

## 🛠️ Tech Stack

### Backend
| Technology | Purpose |
|---|---|
| [Go](https://go.dev/) + [Fiber v2](https://gofiber.io/) | HTTP server & API |
| [PostgreSQL](https://www.postgresql.org/) | User accounts & authentication |
| [MongoDB](https://www.mongodb.com/) | Blog posts & comments |
| [Filebase S3](https://filebase.com/) | Private image object storage |
| [golang-jwt/jwt](https://github.com/golang-jwt/jwt) | JWT session tokens |
| [bcrypt](https://pkg.go.dev/golang.org/x/crypto/bcrypt) | Password hashing |
| [Google OAuth2](https://pkg.go.dev/golang.org/x/oauth2) | Social login |

### Frontend
| Technology | Purpose |
|---|---|
| [React 19](https://react.dev/) | UI framework |
| [Vite 8](https://vite.dev/) | Build tool & dev server |
| [React Router v7](https://reactrouter.com/) | Client-side routing |
| [Marked](https://marked.js.org/) | Markdown rendering |
| [PrismJS](https://prismjs.com/) | Syntax highlighting |
| [Lucide React](https://lucide.dev/) | Icons |
| [oxlint](https://oxc.rs/docs/guide/usage/linter.html) | Fast Rust-based linter |

---

## 🏗️ Architecture

```
Chronicle/
├── backend/
│   ├── main.go              # Server entry point, routing
│   ├── config/              # Environment config loader
│   ├── db/
│   │   ├── postgres.go      # PostgreSQL connection (users)
│   │   └── mongo.go         # MongoDB connection (blogs, comments)
│   ├── handlers/
│   │   ├── auth.go          # Register, Login, Google OAuth, JWT middleware
│   │   ├── blogs.go         # CRUD for blog posts
│   │   ├── comments.go      # CRUD for comments
│   │   └── upload.go        # Image upload & proxy via Filebase S3
│   ├── internal/
│   │   └── auth/
│   │       └── google.go    # Google OAuth2 flow
│   └── models/
│       └── models.go        # User, Blog, Comment structs
│
└── frontend/
    └── src/
        ├── pages/
        │   ├── Home.jsx       # Post feed
        │   ├── PostDetail.jsx # Post reading view + comments
        │   ├── Editor.jsx     # Markdown editor (create/edit)
        │   ├── Dashboard.jsx  # Author's post management
        │   └── Auth.jsx       # Login / Register
        ├── components/        # Navbar, MarkdownRenderer, etc.
        └── context/
            └── AuthContext.jsx # Global auth state
```

**Why two databases?**
- **PostgreSQL** handles users — relational, consistent, safe for transactional auth operations.
- **MongoDB** handles blog content — flexible document model fits variable-length content, tags, and rich metadata without rigid schema migrations.

---

## 🚀 Getting Started

### Prerequisites

- [Go 1.21+](https://go.dev/dl/)
- [Node.js 18+](https://nodejs.org/)
- A running **PostgreSQL** instance
- A running **MongoDB** instance (or [MongoDB Atlas](https://www.mongodb.com/atlas) free tier)
- A [Filebase](https://filebase.com/) account (free tier works) — or swap for any S3-compatible provider
- A [Google Cloud](https://console.cloud.google.com/) project with OAuth2 credentials

### 1. Clone the repository

```bash
git clone https://github.com/sujal-wedev/Chronicle.git
cd Chronicle
```

### 2. Configure environment variables

Copy the example environment file and fill in your values:

```bash
cp .env.example backend/.env
```

```env
# Server
PORT=8080

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URL=http://localhost:8080/api/auth/google/callback

# JWT — use a long random string in production
JWT_SECRET=your-super-secret-jwt-key

# Frontend URL (leave empty when running monolithic on a single port)
FRONTEND_URL=

# PostgreSQL
DATABASE_URL=postgres://user:password@localhost:5432/chronicle?sslmode=disable

# MongoDB
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=blogapp

# Filebase S3-compatible Object Storage
FILEBASE_ACCESS_KEY=your-access-key
FILEBASE_SECRET_KEY=your-secret-key
FILEBASE_BUCKET=your-bucket-name
FILEBASE_ENDPOINT=https://s3.filebase.io
```

### 3. Set up the PostgreSQL schema

Run this SQL against your PostgreSQL database to create the users table:

```sql
CREATE TABLE users (
    id          SERIAL PRIMARY KEY,
    google_id   TEXT UNIQUE,
    username    TEXT NOT NULL UNIQUE,
    email       TEXT NOT NULL UNIQUE,
    password    TEXT,
    avatar_url  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 4. Build the frontend

```bash
cd frontend
npm install
npm run build
cd ..
```

This generates `frontend/dist/` which the Go server will serve as static files.

### 5. Run the backend

```bash
cd backend
go mod download
go run main.go
```

The application will be available at **http://localhost:8080**.

---

## 🌐 Deployment (Render)

The project includes a ready-to-use [`render.yaml`](./render.yaml) for one-click deployment to [Render](https://render.com/).

### Steps

1. Push the repository to GitHub.
2. Go to [Render Dashboard](https://dashboard.render.com/) → **New** → **Blueprint**.
3. Connect your GitHub repository — Render will auto-detect `render.yaml`.
4. Fill in the secret environment variables marked `sync: false` in the dashboard:
   - `MONGODB_URI`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REDIRECT_URL` (set to `https://your-app.onrender.com/api/auth/google/callback`)
   - `FILEBASE_ACCESS_KEY`
   - `FILEBASE_SECRET_KEY`
5. Deploy. Render will run `render-build.sh` to build both the frontend and Go binary.

> **Note:** `JWT_SECRET` is auto-generated by Render (`generateValue: true`) — no manual input needed.

---

## 📡 API Reference

All API routes are prefixed with `/api`.

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | — | Register with username, email, password |
| `POST` | `/api/auth/login` | — | Login with email and password |
| `GET` | `/api/auth/google` | — | Redirect to Google OAuth |
| `GET` | `/api/auth/google/callback` | — | Google OAuth callback |
| `GET` | `/api/auth/me` | ✅ JWT | Get current user profile |

### Blog Posts

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/posts` | — | Get all published posts |
| `GET` | `/api/posts/my-posts` | ✅ JWT | Get current user's posts (drafts + published) |
| `GET` | `/api/posts/:id` | — | Get a single post by ID |
| `POST` | `/api/posts` | ✅ JWT | Create a new post |
| `PUT` | `/api/posts/:id` | ✅ JWT | Update a post (owner only) |
| `DELETE` | `/api/posts/:id` | ✅ JWT | Delete a post (owner only) |

### Comments

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/comments/post/:id` | — | Get comments for a post |
| `POST` | `/api/comments/post/:id` | ✅ JWT | Add a comment to a post |
| `DELETE` | `/api/comments/:commentId` | ✅ JWT | Delete a comment (comment author or post author) |

### Images

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/upload` | ✅ JWT | Upload an image to Filebase S3 |
| `GET` | `/api/images/:filename` | — | Proxy-serve a private image |

**Auth header format:**
```
Authorization: Bearer <your-jwt-token>
```

---

## 🔐 Security Notes

- Passwords are hashed with **bcrypt** (default cost 10) — never stored in plaintext.
- JWTs expire after **24 hours**.
- Images are stored in a **private S3 bucket** and accessed only through the backend proxy — they cannot be hotlinked directly.
- CORS is restricted to known frontend origins.
- Route-level ownership checks prevent users from editing or deleting other users' content.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'Add my feature'`
4. Push and open a Pull Request

---

## 📄 License

This project is open source. Feel free to use it, fork it, and build on it.

---

<div align="center">
  Made with care, for every story worth telling. &nbsp;📖
</div>
