# Environment Configuration Guide

This guide explains how the Architecture Artifacts application handles environment-specific configuration using environment variables and `.env` files.

## Overview

The application supports different environments (development, production) with environment-specific configuration files and scripts.

## Environment Files

### 1. `.env.development`
Used for local development with hot reloading and debugging features enabled.

**Key settings:**
- `FILING_PROVIDER=local` - Uses local filesystem
- `GENERATE_SOURCEMAP=true` - Enables source maps for debugging
- `LOG_LEVEL=debug` - Verbose logging
- `SESSION_SECRET=dev-session-secret` - Development session secret

### 2. `.env.production`
Used for production deployment with security and performance optimizations.

**Key settings:**
- `FILING_PROVIDER=git` - Uses Git repository for content storage
- `GENERATE_SOURCEMAP=false` - Disables source maps for security
- `LOG_LEVEL=info` - Production logging level
- `SECURE_COOKIES=true` - Enables secure cookie settings

### 3. `.env.example`
Template file showing all available configuration options.

## Port Configuration

### Server Ports
```bash
# Development
PORT=5000                    # Server port (from .env.development)

# Production  
PORT=5000                    # Server port (from .env.production)
```

### Client Ports
```bash
# Development
PORT=3000                    # Client dev server (React default)
REACT_APP_API_URL=http://localhost:5000/api

# Production
# Client is built as static files served by server
REACT_APP_API_URL=https://your-domain.com/api
```

## How Environment Loading Works

### 1. Server Environment Loading
Located in `server/index.js`:

```javascript
// Determine environment
const NODE_ENV = process.env.NODE_ENV || 'development';
const envFile = path.join(__dirname, '..', `.env.${NODE_ENV}`);

// Load environment-specific file first
dotenv.config({ path: envFile });

// Load base .env as fallback
dotenv.config();
```

**Loading Priority:**
1. System environment variables (highest priority)
2. `.env.${NODE_ENV}` file (e.g., `.env.development`)
3. `.env` file (fallback)
4. Default values in code (lowest priority)

### 2. Client Environment Loading
React automatically loads environment files in this order:
1. `.env.development.local` (local overrides, git-ignored)
2. `.env.development`
3. `.env.local` (git-ignored)
4. `.env`

## Available Scripts

### Development Scripts
```bash
# Start with development environment
npm run dev                  # Uses .env.development

# Force specific filing provider
npm run dev:local           # Uses local filing provider
npm run dev:git             # Uses git filing provider

# Individual services
npm run server:dev          # Server only (development)
npm run client:dev          # Client only (development)
```

### Production Scripts
```bash
# Production server
npm run server:prod         # Uses .env.production
npm start                   # Alias for server:prod

# Build client for production
npm run build              # Creates production build
```

## Environment Variables Reference

### Server Configuration
| Variable | Development | Production | Description |
|----------|-------------|------------|-------------|
| `PORT` | 5000 | 5000 | Server port |
| `NODE_ENV` | development | production | Environment mode |
| `CLIENT_URL` | http://localhost:3000 | https://your-domain.com | CORS origin |

### Security Configuration
| Variable | Development | Production | Description |
|----------|-------------|------------|-------------|
| `SESSION_SECRET` | dev-session-secret | **CHANGE THIS** | Session encryption key |
| `JWT_SECRET` | dev-jwt-secret | **CHANGE THIS** | JWT signing key |
| `SECURE_COOKIES` | false | true | Enable secure cookies |

### Filing Provider Configuration
| Variable | Development | Production | Description |
|----------|-------------|------------|-------------|
| `FILING_PROVIDER` | local | git | Storage backend |
| `GIT_REPO_URL` | - | your-repo-url | Git repository URL |
| `GIT_BRANCH` | main | main | Git branch name |
| `CONTENT_PATH` | ./content | ./content | Content directory |

### Client Configuration
| Variable | Development | Production | Description |
|----------|-------------|------------|-------------|
| `REACT_APP_API_URL` | http://localhost:5000/api | https://your-domain.com/api | API endpoint |
| `GENERATE_SOURCEMAP` | true | false | Enable source maps |

## Setup Instructions

### 1. Development Setup
```bash
# Copy example file
cp .env.example .env.development

# Edit configuration
nano .env.development

# Start development server
npm run dev
```

### 2. Production Setup
```bash
# Copy example file
cp .env.example .env.production

# Edit configuration (IMPORTANT: Change secrets!)
nano .env.production

# Update these values:
SESSION_SECRET=your-super-secure-session-secret
JWT_SECRET=your-super-secure-jwt-secret
CLIENT_URL=https://your-domain.com
REACT_APP_API_URL=https://your-domain.com/api
GIT_REPO_URL=https://github.com/your-org/your-repo.git

# Build and start
npm run build
npm start
```

## Environment Switching

### Using NODE_ENV
```bash
# Development mode
NODE_ENV=development npm run server

# Production mode  
NODE_ENV=production npm run server
```

### Using Filing Provider Override
```bash
# Force local provider in development
FILING_PROVIDER=local npm run dev

# Force git provider in development
FILING_PROVIDER=git npm run dev
```

## Security Notes

### Development
- Uses non-secure session secrets
- CORS allows localhost
- Source maps enabled
- Verbose logging

### Production
- **MUST change default secrets**
- CORS restricted to production domain
- Source maps disabled
- Minimal logging
- Secure cookies enabled

## Troubleshooting

### Port Conflicts
```bash
# Check what's using port 5000
lsof -i :5000

# Use different port
PORT=8080 npm run dev
```

### Environment Not Loading
```bash
# Check if file exists
ls -la .env*

# Verify NODE_ENV
echo $NODE_ENV

# Check server logs for environment info
npm run server:dev
```

### Client API Connection Issues
1. Check `REACT_APP_API_URL` in client environment
2. Verify server `CLIENT_URL` for CORS
3. Ensure ports match between client and server

## Best Practices

1. **Never commit secrets** - Use `.env.local` for sensitive values
2. **Document environment changes** - Update this guide when adding variables
3. **Use environment-specific values** - Don't hardcode URLs or secrets
4. **Test environment switching** - Verify both development and production work
5. **Monitor environment loading** - Check server startup logs for confirmation