# Development & Testing Guide

## Development Setup

### Prerequisites
- Node.js (v16 or higher)
- npm (v7 or higher)
- Visual Studio Code (v1.80.0 or higher)

### Initial Setup

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch mode (for development)
npm run watch
```

## Running the Extension

### Method 1: Debug Mode (Recommended for Development)

1. Open the project in VSCode
2. Press `F5` or go to Run & Debug
3. Select "Run Extension" from the launch configuration
4. A new VSCode window (Extension Development Host) will open
5. The extension will be loaded in this window

### Method 2: Package and Install

```bash
# Install vsce (VSCode Extension CLI)
npm install -g @vscode/vsce

# Package the extension
vsce package

# This creates realm-vscode-0.2.0.vsix
# Install it in VSCode:
# 1. Open Extensions view (Cmd+Shift+X)
# 2. Click "..." menu → "Install from VSIX"
# 3. Select the .vsix file
```

## Testing the Extension

### Preparing Test Data

You'll need a Realm database file (.realm) for testing. If you don't have one:

1. **Option A**: Create a test Realm file using Realm Studio or SDK
2. **Option B**: Use a sample from Realm documentation
3. **Option C**: Use the Realm Node.js SDK to create test data:

```javascript
// create-test-realm.js
const Realm = require('realm');

const UserSchema = {
  name: 'User',
  properties: {
    _id: 'objectId',
    name: 'string',
    email: 'string',
    age: 'int',
    isActive: 'bool',
    createdAt: 'date'
  },
  primaryKey: '_id'
};

async function createTestRealm() {
  const realm = await Realm.open({
    path: './test-data.realm',
    schema: [UserSchema]
  });

  realm.write(() => {
    for (let i = 0; i < 100; i++) {
      realm.create('User', {
        _id: new Realm.BSON.ObjectId(),
        name: `User ${i}`,
        email: `user${i}@example.com`,
        age: 20 + (i % 50),
        isActive: i % 2 === 0,
        createdAt: new Date()
      });
    }
  });

  console.log('Test realm created with 100 users');
  realm.close();
}

createTestRealm();
```

### Manual Testing Checklist

#### Schema Explorer
- [ ] Open a Realm file
- [ ] Verify all object types appear in the tree
- [ ] Expand object types to see properties
- [ ] Verify property types and optionality are correct
- [ ] Click refresh to reload schema

#### Query Interface
- [ ] Click "Run Realm Query" to open the panel
- [ ] Verify object type dropdown is populated
- [ ] Test Visual Filter Builder:
  - [ ] Add single filter condition
  - [ ] Add multiple filter conditions with AND logic
  - [ ] Add multiple filter conditions with OR logic
  - [ ] Remove filter conditions
  - [ ] Verify field dropdown updates when object type changes
- [ ] Test Raw RQL Mode:
  - [ ] Write and execute simple RQL query
  - [ ] Write and execute complex RQL query
  - [ ] Test invalid syntax (should show error)

#### Query Execution
- [ ] Run query with no filters (should return all records)
- [ ] Run query with filters (should return filtered results)
- [ ] Test Count Only button
- [ ] Verify execution time is displayed
- [ ] Verify total count is accurate
- [ ] Verify record count matches displayed data

#### Pagination
- [ ] Test different page sizes (20, 50, 100, 500)
- [ ] Click Next button to go to next page
- [ ] Click Previous button to go to previous page
- [ ] Type a page number and verify it jumps to that page
- [ ] Verify page controls disable appropriately at boundaries

#### Results Display
- [ ] Verify table renders correctly
- [ ] Click column headers to sort ascending
- [ ] Click again to sort descending
- [ ] Verify null values display correctly
- [ ] Verify nested objects display as JSON
- [ ] Test with empty result set
- [ ] Test with large result set (500+ records)

#### Export
- [ ] Export results to JSON
- [ ] Verify file is downloaded
- [ ] Verify JSON format is correct
- [ ] Verify all displayed records are in the export

#### Error Handling
- [ ] Test invalid RQL syntax
- [ ] Test query on non-existent field
- [ ] Test with closed Realm file
- [ ] Test with corrupted Realm file
- [ ] Verify error messages are user-friendly

#### UI/UX
- [ ] Test in light theme
- [ ] Test in dark theme
- [ ] Resize the panel and verify responsiveness
- [ ] Test Clear Results button
- [ ] Verify status bar updates correctly
- [ ] Verify count badge in header updates
- [ ] Test loading states

## Code Quality

### Linting

```bash
# Run ESLint
npm run lint

# Auto-fix issues
npm run lint -- --fix
```

### TypeScript Compilation

```bash
# Check for TypeScript errors
npm run compile

# Watch mode
npm run watch
```

## Project Structure

```
realm-vscode/
├── src/
│   ├── extension.ts          # Extension entry point
│   ├── webview/
│   │   └── RealmPanel.ts     # Query UI webview
│   └── services/
│       └── realm-backend.ts  # Realm database interaction
├── media/
│   └── icon.svg              # Extension icon
├── out/                      # Compiled JavaScript (generated)
├── package.json              # Extension manifest
├── tsconfig.json             # TypeScript configuration
└── README.md                 # User documentation
```

## Key Components

### Extension.ts
- Registers commands and views
- Manages extension lifecycle
- Provides tree view for schema explorer

### RealmPanel.ts
- Creates and manages the webview panel
- Handles messages between webview and extension
- Renders the query interface HTML

### RealmBackend.ts
- Interfaces with Realm SDK
- Opens and manages Realm connections
- Executes queries and returns results
- Handles schema extraction

## Debugging

### Extension Host Debugging

1. Set breakpoints in TypeScript files
2. Press F5 to start debugging
3. Breakpoints will hit when code executes in Extension Development Host

### Webview Debugging

1. With Extension Development Host open
2. Press `Cmd+Shift+P` → "Developer: Toggle Developer Tools"
3. Use Console and Elements tabs to debug webview

### Common Issues

**Issue**: Extension doesn't activate
- Check `activationEvents` in package.json
- View Output → Extension Host log

**Issue**: Webview doesn't render
- Check browser console for errors
- Verify HTML template syntax

**Issue**: Realm queries fail
- Check Realm file is valid and accessible
- Verify RQL syntax
- Check extension host logs for detailed errors

## Performance Considerations

- Large result sets (>1000 records) may cause slow rendering
- Consider virtual scrolling for production use
- Client-side sorting only works on current page
- Count queries are faster than full queries

## Future Development Ideas

- [ ] Virtual scrolling for large result sets
- [ ] Server-side sorting and filtering
- [ ] Query history and saved queries
- [ ] Data editing capabilities
- [ ] Schema comparison between files
- [ ] Export all records (not just current page)
- [ ] Dark mode optimizations
- [ ] Keyboard shortcuts for common actions
- [ ] Query templates/snippets
- [ ] Auto-complete for RQL queries

## Contributing

When making changes:
1. Create a feature branch
2. Make changes and test thoroughly
3. Run `npm run compile` and fix any errors
4. Run `npm run lint` and fix any issues
5. Update CHANGELOG.md
6. Test in both light and dark themes
7. Submit pull request with description

## Release Process

1. Update version in `package.json`
2. Update `CHANGELOG.md` with new version
3. Run full test suite
4. Compile: `npm run compile`
5. Package: `vsce package`
6. Test the .vsix file in clean VSCode installation
7. Publish: `vsce publish` (if configured)
8. Tag release in git

---

**Happy Developing!** 🛠️
