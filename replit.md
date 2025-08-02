# Floor Plan Processor Application

## Project Overview
A sophisticated floor plan processing application that allows users to upload CAD files (DXF, DWG, PDF), analyze floor plans, and automatically place "îlots" (display islands) with intelligent corridor generation. The application uses React Konva for visualization and provides professional-grade layout optimization.

## Key Features
- **CAD File Processing**: Supports DXF, DWG, and PDF floor plan uploads
- **Intelligent Îlot Placement**: Automated placement algorithms with configurable density profiles (10%, 25%, 30%, 35%)
- **Smart Corridor Generation**: Automatic corridor network creation between îlots
- **Interactive Visualization**: Real-time floor plan rendering with React Konva
- **Configuration Panel**: Professional layout parameters for optimal space utilization
- **Progress Tracking**: Real-time processing feedback with detailed stage information

## Architecture
- **Frontend**: React with TypeScript using Wouter for routing
- **Backend**: Express.js server with Drizzle ORM
- **Database**: PostgreSQL with floor plan storage
- **UI Components**: Shadcn/ui with Tailwind CSS
- **Canvas Rendering**: React Konva for 2D graphics
- **File Processing**: Advanced CAD parsing utilities

## Tech Stack
- React 18 with TypeScript
- Wouter for routing (migrated from React Router)
- Express.js server
- PostgreSQL database with Drizzle ORM
- React Konva for canvas rendering
- Shadcn/ui components with Tailwind CSS
- TanStack Query for state management

## Database Schema
The application stores floor plans with the following structure:
- `users` table for user management
- `floor_plans` table storing complete floor plan data including:
  - Walls, rooms, restricted areas, entrances
  - Placed îlots and generated corridors
  - Processing configuration and metadata
  - Bounds, scale, and unit information

## Recent Changes
- **2025-01-02**: Migrated from Lovable to Replit environment
  - Removed Supabase dependencies (unused in original application)
  - Updated routing from React Router to Wouter for Replit compatibility
  - Added PostgreSQL database schema for floor plan storage
  - Created API routes for floor plan CRUD operations
  - Fixed import dependencies and package installations
  - Maintained all original floor plan processing functionality

## User Preferences
- Professional-grade application for architectural/retail space planning
- Focus on intelligent algorithms and optimization
- Maintain sophisticated CAD processing capabilities
- Clean, modern UI with detailed configuration options

## Development Notes
- The application is purely client-side for file processing, with server-side storage for persistence
- No external API dependencies - all processing happens locally
- Extensible architecture for adding new CAD formats or processing algorithms
- Professional visualization with detailed measurements and annotations