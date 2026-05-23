# Zetnet Microservices

Complete microservices architecture for Zetnet - All Services Under One Roof

## 📋 Project Structure

```
zetnet-microservices/
├── shared/                    # Shared library (types, middleware, utils)
├── gateway/                   # API Gateway (port 3000)
├── services/
│   ├── auth/                 # Auth Service (port 3001)
│   ├── computer/             # Computer Service (port 3002)
│   ├── travel/               # Travel Service (port 3003)
│   ├── solutions/            # Solutions Service (port 3004)
│   ├── enquiry/              # Enquiry Service (port 3005)
│   └── notification/         # Notification Service (port 3006)
├── infra/                     # Infrastructure (Docker, K8s, Terraform)
├── docker-compose.yml         # Local development
└── package.json               # Monorepo root
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm 9+
- Docker & Docker Compose (optional)
- Supabase account

### 1. Clone & Setup

```bash
git clone <repo-url>
cd zetnet-microservices

# Copy environment variables
cp .env.example .env

# Edit .env with your Supabase credentials
# SUPABASE_URL=https://your-project.supabase.co
# SUPABASE_SERVICE_ROLE_KEY=your-key
# SUPABASE_ANON_KEY=your-key
# JWT_SECRET=your-secret-key
# TWILIO_ACCOUNT_SID=your-twilio-sid
# TWILIO_AUTH_TOKEN=your-twilio-token
# TWILIO_WHATSAPP_FROM=whatsapp:+1234567890
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Database

Run the SQL migrations in Supabase:
1. Go to Supabase Dashboard
2. Open SQL Editor
3. Create each schema and table (see DATABASE_SCHEMA.md)

### 4. Run Services

#### Option A: Development Mode (separate terminals)

```bash
# Terminal 1: Gateway
npm run dev --workspace=gateway

# Terminal 2: Auth Service
npm run dev --workspace=services/auth

# Terminal 3: Computer Service
npm run dev --workspace=services/computer

# Terminal 4: Travel Service
npm run dev --workspace=services/travel

# Terminal 5: Solutions Service
npm run dev --workspace=services/solutions

# Terminal 6: Enquiry Service
npm run dev --workspace=services/enquiry

# Terminal 7: Notification Service
npm run dev --workspace=services/notification
```

#### Option B: All Services Together

```bash
npm run dev
```

#### Option C: Docker Compose

```bash
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

## 🔌 API Endpoints

### API Gateway (localhost:3000/api)

- `POST /auth/register` - Register user
- `POST /auth/login` - Login user
- `GET /auth/me` - Get current user
- `GET /computers` - Get all computers
- `POST /computers` - Create computer (Admin)
- `GET /tours` - Get all tours
- `POST /tours` - Create tour (Admin)
- `GET /solutions` - Get all solutions
- `POST /enquiries` - Create enquiry
- `GET /enquiries` - Get enquiries (Admin)
- `POST /notifications/send` - Send notification (Admin)

### Service-to-Service URLs

- Auth Service: `http://localhost:3001/api/auth`
- Computer Service: `http://localhost:3002/api/computers`
- Travel Service: `http://localhost:3003/api/tours`
- Solutions Service: `http://localhost:3004/api/solutions`
- Enquiry Service: `http://localhost:3005/api/enquiries`
- Notification Service: `http://localhost:3006/api/notifications`

## 📝 Testing APIs

### Register User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "Password123!",
    "fullName": "John Doe"
  }'
```

### Login User
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "Password123!"
  }'
```

### Get Current User
```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <token>"
```

### Get Computers
```bash
curl -X GET "http://localhost:3000/api/computers?page=1&limit=10"
```

### Create Enquiry
```bash
curl -X POST http://localhost:3000/api/enquiries \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "mobile": "+1234567890",
    "service": "computers",
    "message": "I am interested in your services"
  }'
```

## 🏗️ Architecture

### Service Communication
- **Synchronous**: REST APIs via HTTP
- **Asynchronous**: Event Bus (Redis/RabbitMQ) for notifications

### Database
- Supabase PostgreSQL
- Separate schemas per service
- Row-level security for data isolation

### Authentication
- JWT tokens
- Role-based access control (RBAC)
- Refresh token rotation

## 📚 Documentation

- [MICROSERVICES_ARCHITECTURE.md](../MICROSERVICES_ARCHITECTURE.md) - Complete system design
- [API_CONTRACTS.md](../API_CONTRACTS.md) - REST API specifications
- [DATABASE_SCHEMA.md](../DATABASE_SCHEMA.md) - Database design
- [IMPLEMENTATION_GUIDE.md](../IMPLEMENTATION_GUIDE.md) - Step-by-step guide

## 🔐 Environment Variables

See `.env.example` for all available variables:

### Critical Variables
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key
- `JWT_SECRET` - JWT signing secret
- `TWILIO_ACCOUNT_SID` - Twilio account ID
- `TWILIO_AUTH_TOKEN` - Twilio auth token

## 🧪 Testing

```bash
# Run all tests
npm run test

# Watch mode
npm run test:watch

# Lint code
npm run lint

# Format code
npm run format
```

## 🐳 Docker Commands

```bash
# Build images
npm run docker:build

# Start containers
npm run docker:up

# View logs
npm run docker:logs

# Stop containers
npm run docker:down

# Clean up (remove volumes)
npm run docker:clean
```

## 📦 Services

### Auth Service (3001)
- User registration & login
- JWT token generation
- Role management
- User verification

### Computer Service (3002)
- Product catalog
- Hardware listings
- Software packages
- Specifications

### Travel Service (3003)
- Tour packages
- Destinations
- Itineraries
- Bookings info

### Solutions Service (3004)
- Digital solutions
- Consulting services
- Case studies
- Technology stack

### Enquiry Service (3005)
- Lead management
- Enquiry tracking
- Follow-up management
- Status updates

### Notification Service (3006)
- WhatsApp notifications (Twilio)
- Email notifications
- SMS notifications
- Notification templates

## 🚀 Deployment

### Production Deployment
```bash
# Build for production
npm run build

# Push to container registry
docker build -t zetnet-gateway ./gateway
docker push your-registry/zetnet-gateway:1.0.0

# Deploy to Kubernetes
kubectl apply -f infra/kubernetes/
```

### Cloud Deployment
- **AWS**: ECS, Fargate, RDS
- **GCP**: Cloud Run, Cloud SQL
- **Azure**: AKS, Azure Database
- **Render**: Simple deployment with git integration

## 📊 Monitoring

- Health checks: `GET /health` on each service
- Request IDs: Tracked across services
- Logging: Structured logs with timestamps
- Tracing: Via X-Request-ID header

## 🤝 Contributing

1. Create feature branch: `git checkout -b feature/feature-name`
2. Commit changes: `git commit -am 'Add feature'`
3. Push to branch: `git push origin feature/feature-name`
4. Create Pull Request

## 📄 License

Proprietary - CherryCraft

## 💬 Support

For issues and questions:
- Create an issue on GitHub
- Contact: support@zetnet.com
- Documentation: See `/docs` folder

## 🎯 Roadmap

- [ ] Event bus (Redis/RabbitMQ) integration
- [ ] Service mesh (Istio) setup
- [ ] GraphQL gateway option
- [ ] Caching layer (Redis)
- [ ] API rate limiting
- [ ] Advanced authentication (OAuth2, SAML)
- [ ] Mobile app integration
- [ ] Analytics dashboard
- [ ] Admin panel redesign
- [ ] Real-time notifications (WebSocket)

## 📞 Contact

Created by **CherryCraft**
- Website: https://cherrycraft.tech
- Email: contact@cherrycraft.tech

---

**Last Updated**: May 23, 2026
**Version**: 1.0.0
