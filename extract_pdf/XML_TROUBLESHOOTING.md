# XML to Excel Converter - Troubleshooting Guide

## Issue: "Error parsing XML file." appears in browser console

### Common Causes:

1. **Malformed XML**
   - Missing closing tags
   - Unclosed quotes in attributes
   - Invalid characters in text content
   - Improper XML declaration

2. **Encoding Issues**
   - File is saved in wrong encoding (should be UTF-8)
   - Special characters not properly encoded

3. **Incorrect XML Structure**
   - Root element is required
   - Child elements must be properly nested

### How to Debug:

**Step 1: Use the Debug Tool**
1. Open `debug_xml.html` in your browser
2. Either:
   - Paste your XML directly into the textarea
   - Or upload the XML file
3. Click "Test Parse" button
4. Look at the output to see what's happening

**Step 2: Expected XML Format**

The script expects XML with this basic structure:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<root>
    <row>
        <columnName>value1</columnName>
        <columnName2>value2</columnName2>
    </row>
    <row>
        <columnName>value3</columnName>
        <columnName2>value4</columnName2>
    </row>
</root>
```

Or with any root element name and child element names:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<data>
    <record>
        <name>John</name>
        <age>30</age>
    </record>
    <record>
        <name>Jane</name>
        <age>28</age>
    </record>
</data>
```

**Step 3: Check Console Logs**
1. Open browser Developer Tools (F12 or Cmd+Option+I on Mac)
2. Go to Console tab
3. Look for messages starting with:
   - "XML file content:" - shows the first 500 chars of your XML
   - "Found X rows to process" - shows how many rows were detected
   - "No 'row' elements found..." - means script is looking for different element names

**Step 4: Valid XML Checklist**
- [ ] XML declaration: `<?xml version="1.0" encoding="UTF-8"?>`
- [ ] Single root element wrapping all data
- [ ] All tags properly closed (no orphaned opening or closing tags)
- [ ] No special characters in tag names
- [ ] Proper nesting (no overlapping tags)
- [ ] UTF-8 encoding (or properly declared encoding)

### Example Valid Files:

See `test_data.xml` and `test_data_invalid.xml` in the same directory for working examples.

### Solutions:

1. **Validate your XML online**
   - Go to https://www.xmlvalidation.com/
   - Paste or upload your XML
   - Fix any reported errors

2. **Save with correct encoding**
   - Use UTF-8 encoding when saving XML files
   - Avoid BOM (Byte Order Mark) at the beginning

3. **Check for invisible characters**
   - Sometimes copy-pasting adds hidden characters
   - Try manually recreating the XML file

4. **Escape special characters**
   - `&` → `&amp;`
   - `<` → `&lt;`
   - `>` → `&gt;`
   - `"` → `&quot;`
   - `'` → `&apos;`

### Still Having Issues?

1. Use `debug_xml.html` to identify the exact error
2. Check browser console for detailed error messages
3. Try with `test_data.xml` first to confirm the feature works
4. Copy the structure of the working example file

