# Quick Start Guide - Realm Explorer

## Installation

1. Install the extension from the VSCode marketplace (or from VSIX)
2. The Realm icon will appear in your Activity Bar (sidebar)

## Opening a Realm Database

1. Click the **Realm** icon in the Activity Bar
2. Click the **folder icon** (Open Realm File) in the Schema Explorer panel
3. Browse to and select your `.realm` file
4. The schema will load automatically

## Exploring the Schema

- The Schema Explorer shows all object types in your database
- Click the `>` arrow next to any object type to expand and see its properties
- Property types and optionality are displayed next to each field name

## Running Queries

### Quick Start
1. Click the **play icon** (Run Realm Query) in the Schema Explorer toolbar
2. Select an object type from the dropdown
3. Use the visual filter builder or write raw RQL
4. Click **▶ Run Query**

### Visual Filter Builder (Recommended for Beginners)

```
1. Select "Visual Filter" tab
2. Choose a field: e.g., "age"
3. Choose an operator: e.g., "greater than"
4. Enter a value: e.g., "25"
5. Click "+ Add" to add more conditions
6. Select AND/OR logic for multiple conditions
7. Click "▶ Run Query"
```

Example filters you can build:
- Age greater than 25 AND name contains "John"
- Status equals "active" OR status equals "pending"
- Created date greater than "2024-01-01"

### Raw RQL Mode (For Advanced Users)

```
1. Select "Raw RQL" tab
2. Write your filter expression directly
3. Click "▶ Run Query"
```

Example RQL queries:
```
age > 25 AND name BEGINSWITH 'J'
status == "active" OR priority == "high"
createdAt >= $0
tags.@count > 0
```

## Understanding the Results

### Status Bar (Top Right)
- **Total**: Total number of matching records
- **Showing**: Number of records currently displayed
- **Time**: Query execution time in milliseconds

### Pagination
- Use **Previous/Next** buttons to navigate pages
- Jump to specific page using the page number input
- Change page size (20, 50, 100, 500) in the dropdown

### Sorting
- Click any column header to sort by that column
- First click: ascending order (↑)
- Second click: descending order (↓)
- Third click: return to original order

## Count-Only Queries

For quick statistics without loading data:
1. Set up your filters as usual
2. Click **# Count Only** instead of Run Query
3. Get instant count with no data loading

Use cases:
- Check how many records match before fetching
- Quick data exploration
- Performance testing with large datasets

## Exporting Data

1. Run a query to get results
2. Adjust page size if needed (e.g., 500 for larger exports)
3. Click **📥 Export JSON**
4. The current page of results will be saved as a JSON file

> **Note**: Export saves only the currently loaded page. To export all data, increase the page size before exporting.

## Tips & Tricks

### Performance
- Use **Count Only** first to see how many records match
- Start with smaller page sizes (20-50) for faster loading
- Add specific filters to reduce result set size

### Filters
- String comparisons are case-sensitive by default
- Use CONTAINS for partial string matching
- BEGINSWITH and ENDSWITH for prefix/suffix matching
- Date comparisons work with ISO format strings

### Navigation
- Keep the Schema Explorer open while querying to reference field names
- Use the visual builder to learn RQL syntax
- Switch to raw RQL for complex nested queries

### Common Filter Examples

```
# Find active users over 18
status == "active" AND age >= 18

# Find recent records (last 7 days)
createdAt >= "2024-04-29T00:00:00Z"

# Find records with specific tags
tags CONTAINS "important"

# Find empty or null fields
email == nil OR email == ""

# Complex conditions
(status == "active" OR status == "pending") AND priority > 5
```

## Keyboard Shortcuts

Currently supported:
- Standard VSCode navigation shortcuts
- Copy/paste in filter fields

Coming soon:
- `Cmd/Ctrl + Enter`: Execute query from filter field

## Troubleshooting

### "Failed to open Realm"
- Ensure the file is a valid Realm database (.realm extension)
- Check file permissions (extension needs read access)
- Close the file in other applications if it's locked

### "Failed to execute query"
- Check your RQL syntax (especially in Raw mode)
- Verify field names match the schema exactly
- Ensure data types match (e.g., numbers without quotes)

### Slow Performance
- Reduce page size
- Add more specific filters
- Use Count Only for initial exploration
- Check if the Realm file is very large (>1GB)

### Display Issues
- Try clearing results and re-running the query
- Refresh the Schema Explorer
- Restart VSCode if the webview becomes unresponsive

## Need Help?

- Check the [README.md](README.md) for detailed documentation
- Review [CHANGELOG.md](CHANGELOG.md) for latest features
- Report issues on GitHub (if repository is public)

---

**Happy Querying!** 🚀
