# Motionify PM Portal - Dependency Map

## Service Dependencies

### External Services
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Neon PostgreSQL │    │  Amazon SES     │    │ Cloudflare R2   │
│   (Database)     │    │  (Email)        │    │ (File Storage)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Netlify Functions                            │
│                    (Backend API)                               │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    React Frontend                               │
│                    (Client UI)                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Component Dependencies

### Phase 1: Foundation
```
┌─────────────────┐
│   Database      │
│   Schema        │
└─────────────────┘
         │
         ▼
┌─────────────────┐    ┌─────────────────┐
│   JWT Utils     │    │   Email Utils   │
│   (Auth)        │    │   (Mailtrap)    │
└─────────────────┘    └─────────────────┘
         │                       │
         └───────────┬───────────┘
                     ▼
         ┌─────────────────┐
         │  Magic Link     │
         │  System         │
         └─────────────────┘
                     │
                     ▼
         ┌─────────────────┐
         │  Auth Context   │
         │  (Frontend)     │
         └─────────────────┘
```

### Phase 2: Core Features
```
┌─────────────────┐
│  Auth System    │
└─────────────────┘
         │
         ▼
┌─────────────────┐    ┌─────────────────┐
│  User Management│    │  Project Mgmt   │
│  API & UI       │    │  API & UI       │
└─────────────────┘    └─────────────────┘
         │                       │
         └───────────┬───────────┘
                     ▼
         ┌─────────────────┐
         │  Task Management│
         │  API & UI       │
         └─────────────────┘
```

### Phase 3: File & Communication
```
┌─────────────────┐    ┌─────────────────┐
│  Cloudflare R2  │    │  Project Mgmt   │
│  (File Storage) │    │  System         │
└─────────────────┘    └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│  File Upload    │    │  Messaging      │
│  API & UI       │    │  API & UI       │
└─────────────────┘    └─────────────────┘
         │                       │
         └───────────┬───────────┘
                     ▼
         ┌─────────────────┐
         │  Revision       │
         │  Requests       │
         └─────────────────┘
```

## Implementation Dependencies

### Critical Path Dependencies
1. **Database Schema** → All backend features
2. **Authentication System** → All protected features
3. **User Management** → Project and task management
4. **Project Management** → Task and file management
5. **File Storage Setup** → File upload and messaging

### Parallel Development Opportunities
- Frontend UI components can be developed in parallel with backend APIs
- Email templates can be created independently
- File upload UI can be built while R2 integration is in progress
- Analytics can be developed after core features are complete

## Service Integration Dependencies

### Neon PostgreSQL
**Dependencies**: None (foundational)
**Provides**: Data persistence for all features
**Required by**: All backend functions

### Amazon SES
**Dependencies**: Domain verification, production access
**Provides**: Email delivery for magic links and notifications
**Required by**: Authentication system, notification system

### Cloudflare R2
**Dependencies**: Bucket creation, CORS configuration
**Provides**: File storage and CDN
**Required by**: File management, message attachments

### Netlify Functions
**Dependencies**: All external services
**Provides**: Backend API endpoints
**Required by**: React frontend

## Development Environment Dependencies

### Local Development
```
┌─────────────────┐
│   Node.js       │
│   (v18+)        │
└─────────────────┘
         │
         ▼
┌─────────────────┐    ┌─────────────────┐
│   Vite          │    │   Netlify CLI   │
│   (Frontend)    │    │   (Backend)     │
└─────────────────┘    └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│   React App     │    │   Local Functions│
│   (Port 5173)   │    │   (Port 8888)   │
└─────────────────┘    └─────────────────┘
```

### Production Deployment
```
┌─────────────────┐
│   GitHub        │
│   Repository    │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│   Netlify       │
│   (Auto Deploy) │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│   Custom Domain │
│   (portal.motionify.studio)│
└─────────────────┘
```

## Data Flow Dependencies

### Authentication Flow
```
User Email → Magic Link Request → Email Service → User Clicks Link → 
Token Verification → JWT Generation → Session Creation → Dashboard Access
```

### File Upload Flow
```
User Selects File → Frontend Request → Backend Generate Presigned URL → 
Direct Upload to R2 → File Metadata Saved → Database Updated
```

### Project Creation Flow
```
User Creates Project → Project API → Database Insert → 
User Assignment → Notification Sent → Project Dashboard Updated
```

## Risk Dependencies

### High Risk Dependencies
1. **Database Connection**: All features depend on database availability
2. **Email Delivery**: Authentication depends on email service
3. **File Storage**: File features depend on R2 availability
4. **Domain Configuration**: Production depends on DNS setup

### Mitigation Strategies
1. **Database**: Use connection pooling, implement retry logic
2. **Email**: Have fallback email service, monitor delivery rates
3. **File Storage**: Implement local fallback, monitor storage usage
4. **Domain**: Test with Netlify subdomain first, gradual migration

## Testing Dependencies

### Unit Testing
- Each component can be tested independently
- Mock external service dependencies
- Test authentication logic in isolation

### Integration Testing
- Test service integrations in order of dependency
- Use test databases and sandbox services
- Verify end-to-end workflows

### End-to-End Testing
- Test complete user journeys
- Verify all service integrations
- Test production-like environment

## Monitoring Dependencies

### Application Monitoring
```
┌─────────────────┐
│   Netlify       │
│   Analytics     │
└─────────────────┘
         │
         ▼
┌─────────────────┐    ┌─────────────────┐
│   Function      │    │   Database      │
│   Logs          │    │   Monitoring    │
└─────────────────┘    └─────────────────┘
         │                       │
         └───────────┬───────────┘
                     ▼
         ┌─────────────────┐
         │   Error         │
         │   Tracking      │
         └─────────────────┘
```

### Service Health Monitoring
- Database connection status
- Email delivery rates
- File storage availability
- API response times

## Deployment Dependencies

### Development → Staging
1. Database schema migration
2. Environment variable configuration
3. Service account setup
4. Function deployment

### Staging → Production
1. Production service accounts
2. Custom domain configuration
3. SSL certificate setup
4. DNS propagation
5. Final testing and validation

## Rollback Dependencies

### Quick Rollback (Netlify)
- Revert to previous deployment
- No database changes required
- Immediate effect

### Full Rollback
- Revert code changes
- Database migration rollback
- Service configuration rollback
- DNS changes (if applicable)

---

**Last Updated**: 2025-01-11
**Status**: Implementation Ready
**Next Review**: After Phase 1 completion
