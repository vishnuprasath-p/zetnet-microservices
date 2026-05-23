# Quick Start Guide

## ⚡ 5-Minute Setup

### Step 1: Clone the Repository
```bash
cd c:\Zetnetapp
git clone https://github.com/yourusername/zetnet-microservices.git
cd zetnet-microservices
```

### Step 2: Configure Environment
```bash
# Copy example environment file
copy .env.example .env

# Edit .env with your credentials:
# - SUPABASE_URL
# - SUPABASE_SERVICE_ROLE_KEY
# - JWT_SECRET (generate a strong secret)
# - TWILIO credentials (if using WhatsApp)
```

### Step 3: Install Dependencies
```bash
npm install
```

### Step 4: Setup Database
Open Supabase Dashboard and run migrations:
```sql
-- Auth Schema
CREATE SCHEMA auth;

CREATE TABLE auth.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);

CREATE TABLE auth.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'user',
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, role)
);

-- Similar for other schemas...
-- See DATABASE_SCHEMA.md for complete migrations
```

### Step 5: Start Services

**Option A: All in one (easiest)**
```bash
npm run dev
```

**Option B: Individual services (development)**
```bash
# Terminal 1
npm run dev --workspace=gateway

# Terminal 2
npm run dev --workspace=services/auth

# Continue for other services...
```

**Option C: Docker (production-like)**
```bash
docker-compose up -d
docker-compose logs -f
```

### Step 6: Test APIs

```bash
# Health check
curl http://localhost:3000/health

# Register user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#",
    "fullName": "Test User"
  }'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#"
  }'

# Get authenticated user (use token from login response)
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <your-token-here>"
```

## 🔧 Useful Commands

```bash
# Development
npm run dev                    # Run all services
npm run dev --workspace=services/auth  # Run single service

# Building
npm run build                  # Build all services
npm run build --workspace=services/auth

# Testing
npm run test                   # Run all tests
npm run lint                   # Lint all code
npm run format                 # Format code

# Docker
npm run docker:build           # Build images
npm run docker:up             # Start containers
npm run docker:down           # Stop containers
npm run docker:logs           # View logs
```

## 📍 Service Ports

| Service | Port | URL |
|---------|------|-----|
| API Gateway | 3000 | http://localhost:3000 |
| Auth | 3001 | http://localhost:3001 |
| Computer | 3002 | http://localhost:3002 |
| Travel | 3003 | http://localhost:3003 |
| Solutions | 3004 | http://localhost:3004 |
| Enquiry | 3005 | http://localhost:3005 |
| Notification | 3006 | http://localhost:3006 |

## 🆘 Troubleshooting

### Port Already in Use
```bash
# Find process using port
netstat -ano | findstr :3000

# Kill process (Windows)
taskkill /PID <PID> /F
```

### Missing Supabase Configuration
```bash
# Verify .env file exists
type .env

# Check SUPABASE_URL is set
echo %SUPABASE_URL%
```

### Node Modules Issues
```bash
# Clear and reinstall
rm -r node_modules
npm install
```

### Docker Issues
```bash
# Remove containers and volumes
docker-compose down -v

# Rebuild images
docker-compose build --no-cache

# Start fresh
docker-compose up
```

## 📖 Next Steps

1. **Read Architecture**: Open `MICROSERVICES_ARCHITECTURE.md`
2. **Check APIs**: Open `API_CONTRACTS.md`
3. **Review Database**: Open `DATABASE_SCHEMA.md`
4. **Start Coding**: Choose a service and create features
5. **Deploy**: Follow deployment guide in `IMPLEMENTATION_GUIDE.md`

## 🎓 Learning Path

Week 1:
- [ ] Understand microservices architecture
- [ ] Get familiar with codebase structure
- [ ] Setup development environment
- [ ] Run first API call

Week 2:
- [ ] Create your first API endpoint
- [ ] Add database integration
- [ ] Write tests
- [ ] Deploy to staging

Week 3:
- [ ] Add authentication to endpoints
- [ ] Implement service-to-service communication
- [ ] Setup CI/CD pipeline
- [ ] Production deployment

## 💡 Pro Tips

1. **Use Postman/Insomnia**: Import API specs for easier testing
2. **Watch Logs**: `docker-compose logs -f service-name`
3. **Check Health**: Visit `http://localhost:3000/health`
4. **Read Errors**: Check terminal output for detailed errors
5. **Document Changes**: Keep API docs in sync with code

## 🐛 Reporting Issues

Found a bug? Help us fix it:
1. Check existing issues on GitHub
2. Create detailed bug report with:
   - Steps to reproduce
   - Expected behavior
   - Actual behavior
   - Environment info
3. Include logs and screenshots

## 📞 Getting Help

- **Discord**: Join our community
- **Email**: support@zetnet.com
- **Docs**: Read comprehensive documentation
- **Issues**: GitHub Issues tab

---

**Happy Coding! 🚀**

Need more help? Read the full documentation in the `docs/` folder.
