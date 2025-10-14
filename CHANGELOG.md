# Changelog

All notable changes to the SapHari project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Master Dashboard with 9 comprehensive tabs
- Circuit simulator with warnings panel
- Device binding and test metrics in Simulator tab
- Comprehensive API client with fallback data
- Database schema migration for master dashboard
- CI/CD pipeline with automated testing
- Security audit and dependency scanning

### Changed
- Enhanced API error handling with fallback data
- Improved user and device management interfaces
- Updated database schema with new tables and RLS policies

### Fixed
- Resolved "No access token available" errors in Master Dashboard
- Fixed API 404 errors with proper fallback mechanisms
- Corrected database relationship errors in device queries

### Security
- Added NPM audit scanning in CI pipeline
- Implemented secrets detection with TruffleHog
- Enhanced RLS policies for multi-tenant access

## [0.1.0] - 2025-01-16

### Added
- Initial project setup with React + TypeScript + Vite
- Supabase integration for authentication and database
- MQTT integration for IoT device communication
- Circuit simulator with ESP32 components
- Master Dashboard foundation
- User authentication and role-based access control
- Device management system
- Alert and notification system
- OTA update functionality

### Technical Details
- Frontend: React 18.3.1, TypeScript 5.8.3, Vite 5.4.19
- UI: Tailwind CSS 3.4.17, shadcn/ui components
- Backend: Supabase (PostgreSQL, Auth, Realtime)
- IoT: MQTT 5.14.1, ESP32 firmware support
- State Management: React Query 5.83.0
- Build: ESLint 9.32.0, TypeScript strict mode

### Known Issues
- 385 lint errors (mostly TypeScript `any` types)
- 4 moderate NPM security vulnerabilities
- Database schema not yet applied to production
- Authentication token issues in Master Dashboard
- Large bundle size (2.01MB) requiring optimization

### Migration Notes
- Apply `supabase/migrations/20250116_master_dashboard_schema.sql` to enable full functionality
- Update environment variables for production deployment
- Configure MQTT broker settings for your infrastructure

## [0.0.1] - 2024-12-01

### Added
- Project initialization
- Basic authentication system
- Device registration and management
- MQTT message handling
- Basic dashboard interface

---

## Development Guidelines

### Commit Message Format
We use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools

### Examples
```
feat(dashboard): add real-time KPI monitoring
fix(auth): resolve token expiration issues
docs(api): update authentication endpoints
refactor(simulator): optimize component rendering
```

### Release Process
1. Update version in `package.json`
2. Update this `CHANGELOG.md`
3. Create git tag with version number
4. Deploy to production environment
5. Create GitHub release with changelog

### Breaking Changes
Breaking changes should be clearly marked in the changelog and may require:
- Database migrations
- Environment variable updates
- API version changes
- Configuration file updates
