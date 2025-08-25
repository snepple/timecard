# Timesheet Management System

## Overview

This is a full-stack timesheet management system built with React, TypeScript, Express.js, and PostgreSQL. The application allows employees to create and manage weekly timesheets with digital signatures, PDF generation, and email functionality. The system is designed for emergency services or similar organizations that need to track weekly hours, rescue coverage duties, and generate professional timesheet reports.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Form Handling**: React Hook Form with Zod validation for robust form management
- **UI Components**: Shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens and CSS variables
- **PDF Generation**: jsPDF for client-side PDF creation with custom timesheet formatting

The frontend follows a component-based architecture with reusable UI components, custom hooks for business logic, and a clean separation between presentation and data layers.

### Backend Architecture
- **Framework**: Express.js with TypeScript for API endpoints
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Schema Validation**: Zod schemas shared between frontend and backend
- **Storage Pattern**: Repository pattern with interface abstraction (IStorage)
- **Development Setup**: Vite integration for hot module replacement in development

The backend implements a RESTful API with clear separation of concerns - routes handle HTTP concerns, storage handles data persistence, and shared schemas ensure type consistency.

### Database Design
- **Primary Database**: PostgreSQL with Neon serverless deployment
- **Schema Management**: Drizzle migrations for version control
- **Data Model**: Single timesheets table with comprehensive daily time tracking fields
- **Key Features**: 
  - UUID primary keys for scalability
  - Decimal precision for hour calculations
  - Text fields for flexible time format storage
  - Boolean flags for rescue coverage tracking
  - Signature data storage as base64 strings

### Authentication & Security
- Session-based authentication using connect-pg-simple for PostgreSQL session storage
- Environment variable configuration for database credentials
- Input validation at both client and server levels using Zod schemas

### External Integrations
- **Email Service**: Nodemailer integration for timesheet submission notifications
- **PDF Generation**: Client-side PDF creation with custom Oakland Fire Department branding
- **Development Tools**: Replit integration with runtime error overlays and cartographer mapping

## External Dependencies

### Core Framework Dependencies
- **React Ecosystem**: React 18, React DOM, React Hook Form, TanStack React Query
- **Backend**: Express.js, Node.js with ES modules
- **Database**: PostgreSQL via Neon serverless, Drizzle ORM, Drizzle Kit for migrations
- **TypeScript**: Full TypeScript support across frontend and backend

### UI and Styling
- **Component Library**: Radix UI primitives for accessible components
- **Styling**: Tailwind CSS with PostCSS for processing
- **Icons**: Lucide React for consistent iconography
- **Utilities**: clsx and tailwind-merge for conditional styling

### Development and Build Tools
- **Build Tool**: Vite for frontend bundling and development server
- **Backend Build**: ESBuild for server-side bundling
- **Process Management**: tsx for TypeScript execution in development
- **Replit Integration**: Custom Vite plugins for Replit environment

### Third-Party Services
- **Email**: Nodemailer for SMTP email delivery
- **PDF Generation**: jsPDF for client-side PDF creation
- **Session Storage**: connect-pg-simple for PostgreSQL session management
- **Database Hosting**: Neon serverless PostgreSQL platform

### Utility Libraries
- **Validation**: Zod for runtime type checking and validation
- **Date Handling**: date-fns for date manipulation and formatting
- **Canvas Drawing**: Custom signature pad implementation for digital signatures
- **Carousel**: Embla Carousel for image/content sliding components