# Change Log

All notable changes to the "Realm Explorer" extension will be documented in this file.

## [0.2.0] - 2026-05-06

### Added
- **Enhanced Query Interface**
  - Visual filter builder with drag-and-drop style interface
  - Support for multiple filter conditions with AND/OR logic
  - Tabbed interface to switch between Visual and Raw RQL modes
  - Field auto-complete in visual filter builder
  
- **Advanced Query Features**
  - Count Only mode for fast record counting without data fetching
  - Configurable page sizes (20, 50, 100, 500 records)
  - Smart pagination with page navigation controls
  - Export query results to JSON files
  
- **Results Display Improvements**
  - Sortable columns (click headers to sort)
  - Modern table design with VSCode theme integration
  - Status bar showing total count, displayed records, and execution time
  - Loading states with spinner animation
  - Empty state messages
  - Better null value handling
  
- **UI/UX Enhancements**
  - Modern, responsive design
  - Count badge in header showing total objects
  - Error messages with better formatting
  - Performance metrics display
  - Clear results button
  - Disabled state management for buttons

### Changed
- Completely redesigned webview UI with modern styling
- Improved error handling with proper TypeScript types
- Better VSCode theme integration (dark/light mode support)
- Enhanced code quality (fixed linting issues)

### Technical Improvements
- Added `countQuery` method in backend for efficient counting
- Improved TypeScript typing (replaced `any` with proper types)
- Better error message handling
- Code cleanup and ESLint compliance

## [0.1.0] - Initial Release

### Added
- Basic schema explorer in sidebar
- Simple query interface with RQL support
- Table view for results
- Open Realm file functionality
- Schema refresh command
