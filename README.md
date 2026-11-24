# StudyLimitless (StudyBooth)

A virtual study room platform where students join rooms and study together with real-time collaboration, Pomodoro timers, and community features.

## ✨ Features

### Core Features
- **Virtual Study Rooms** - Create and join topic-specific rooms (public, private, invite-only)
- **Real-time Collaboration** - Video, voice chat, text chat, screen share, whiteboard
- **Smart Pomodoro Timer** - Synced server-authoritative timer with focus/break phases, notifications
- **Room Roles** - Host, moderator, participant with permissions (mute, remove, ban)
- **Invite System** - Private rooms with invite codes/links

### Productivity & Tracking
- **Study Sessions** - Log focus time, breaks, cycles completed
- **Profile Analytics** - Total hours, daily goals, streaks, weekly charts (Chart.js)
- **Leaderboards** - Weekly per-room and global (with privacy opt-out)
- **Personal & Shared Todos** - Track tasks individually and as a group

### Community
- **Follow System** - Follow other learners, see their activity
- **Room Invitations** - Invite friends to private rooms
- **Topic Discovery** - Browse rooms by subject/category

### Shared Resources
- **Room Notes** - Collaborative notepad with autosave
- **File/Link Sharing** - Upload resources with size/type validation
- **Ambient Sounds** - Rain, café, lo-fi (local playback)

### Safety & Moderation
- **Reports & Blocks** - User/message reporting with admin dashboard
- **Profanity Filter** - On chat messages and room names
- **Terms of Service & Privacy Policy** - With age notice (18+)

### UX & Accessibility
- **Dark/Light/System Theme** - Persisted preference
- **Mobile Responsive** - All pages work on mobile
- **Accessible** - Labels, alt text, keyboard navigation, contrast
- **Custom Error Pages** - 404, 500 with friendly messaging

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Django 6.1 |
| Database | SQLite (dev), PostgreSQL (prod) via `dj-database-url` |
| Real-time | Django Channels 4 + Redis |
| Auth | django-allauth (email login, email verification) |
| Static Files | WhiteNoise (production) |
| Config | django-environ |
| Rate Limiting | django-ratelimit |
| Frontend | Vanilla JS (ES6), CSS Custom Properties, Chart.js |
| Testing | pytest, pytest-django, factory-boy |
| CI/CD | GitHub Actions |
| Deployment | Docker, Gunicorn + Daphne |

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Redis (for Channels) - `brew install redis` / `sudo apt install redis`
- PostgreSQL (optional for production)

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/ishantsahu118-a11y/StudyBooth.git
cd StudyBooth

# 2. Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure environment
cp .env.example .env
# Edit .env with your values (see Environment Variables below)

# 5. Run migrations
python manage.py migrate

# 6. Create superuser (optional)
python manage.py createsuperuser

# 7. Seed initial data (topics, demo rooms)
python manage.py seed_data

# 8. Start Redis (required for real-time features)
redis-server

# 9. Run development server
python manage.py runserver

# 10. In another terminal, run Daphne for WebSockets
daphne -b 0.0.0.0 -p 8001 studylimitless.asgi:application
```

Visit `http://localhost:8000` for the app and `http://localhost:8001` for WebSocket connections.

### Development with Docker (Alternative)

```bash
docker-compose up --build
# Access at http://localhost:8000
```

## ⚙️ Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DJANGO_SECRET_KEY` | Yes | - | Django secret key (generate with `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"`) |
| `DJANGO_DEBUG` | No | `True` | Set to `False` in production |
| `DJANGO_ALLOWED_HOSTS` | No | `localhost,127.0.0.1` | Comma-separated allowed hosts |
| `DATABASE_URL` | No | `sqlite:///db.sqlite3` | PostgreSQL URL for production (e.g., `postgres://user:pass@localhost:5432/db`) |
| `REDIS_URL` | No | `redis://localhost:6379/0` | Redis connection for Channels |
| `EMAIL_HOST` | No | - | SMTP host for production emails |
| `EMAIL_PORT` | No | `587` | SMTP port |
| `EMAIL_USE_TLS` | No | `True` | Use TLS for email |
| `EMAIL_HOST_USER` | No | - | SMTP username |
| `EMAIL_HOST_PASSWORD` | No | - | SMTP password |
| `DEFAULT_FROM_EMAIL` | No | `StudyLimitless <noreply@studylimitless.com>` | From email address |
| `GITHUB_CLIENT_ID` | No | - | GitHub OAuth client ID |
| `GITHUB_CLIENT_SECRET` | No | - | GitHub OAuth secret |
| `GOOGLE_CLIENT_ID` | No | - | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | - | Google OAuth secret |

See `.env.example` for a template.

## 📁 Project Structure

```
studylimitless/
├── base/                    # Main app
│   ├── models.py           # 7 models (Topic, StudyRoom, RoomParticipant, StudySession, UserProfile, Follow, RoomInvitation)
│   ├── views.py            # 8 views (home, rooms, room_detail, create_room, profile, join/leave, follow)
│   ├── urls.py             # App URL patterns
│   ├── admin.py            # Admin configuration
│   ├── signals.py          # Auto-create UserProfile on User creation
│   ├── adapters.py         # Custom allauth adapter
│   ├── migrations/         # Database migrations
│   ├── management/         # seed_data command
│   ├── static/base/        # CSS/JS assets
│   │   ├── css/pages/      # Page-specific styles
│   │   └── js/pages/       # Page-specific scripts
│   └── tests.py            # Tests (to be expanded)
├── studylimitless/         # Project settings
│   ├── settings.py         # Main settings (env-configured)
│   ├── urls.py             # Root URL config
│   ├── asgi.py             # ASGI for Channels
│   └── wsgi.py             # WSGI for Gunicorn
├── templates/              # Django templates
│   ├── account/            # Allauth auth templates
│   ├── *.html              # Page templates
├── requirements.txt        # Pinned dependencies
├── .env.example            # Environment template
├── Dockerfile              # Production image
├── docker-compose.yml      # Local dev stack (web, postgres, redis)
├── Procfile                # Process types for deployment
└── manage.py               # Django management script
```

## 🧪 Testing

```bash
# Run tests with coverage
pytest --cov=base --cov-report=term-missing

# Run specific test file
pytest base/tests.py -v

# Django check
python manage.py check
```

## 📦 Deployment

### Docker (Recommended)
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Manual (Gunicorn + Daphne)
```bash
# Web server (HTTP)
gunicorn studylimitless.wsgi:application --bind 0.0.0.0:8000 --workers 3

# WebSocket server
daphne -b 0.0.0.0 -p 8001 studylimitless.asgi:application
```

### Static Files
```bash
python manage.py collectstatic --noinput
# Served by WhiteNoise in production
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 👨‍💻 Author

**Ishant Sahu**
- Email: ishantsahu118@gmail.com
- LinkedIn: https://www.linkedin.com/in/ishant-sahu-8767b1370/
- GitHub: https://github.com/ishantsahu118-a11y

---

*Built with ❤️ for students everywhere*