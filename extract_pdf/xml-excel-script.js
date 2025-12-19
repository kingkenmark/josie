// Try to attach immediately if DOM is already loaded
function attachEventListener() {
    const button = document.getElementById('load-xml-excel-button');
    if (!button) {
        console.warn('Button "load-xml-excel-button" not found yet');
        return false;
    }

    button.addEventListener('click', handleXMLToExcel);
    console.log('Event listener attached to button');
    return true;
}

async function handleXMLToExcel() {
    const xmlFileInput = document.getElementById('xml-excel-upload');
    const xmlOutputDiv = document.getElementById('xml-excel-output');
    console.log('Button clicked - xmlFileInput:', xmlFileInput, 'xmlOutputDiv:', xmlOutputDiv);
    xmlOutputDiv.innerHTML = ''; // Clear previous output

    if (xmlFileInput.files.length === 0) {
        alert('Please select an XML file.');
        return;
    }

    try {
        const xmlFile = xmlFileInput.files[0];
        const xmlText = await xmlFile.text();
        console.log('XML file content:', xmlText.substring(0, 500)); // Log first 500 chars

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'application/xml');

        // Check for parsing errors
        if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
            const errorMsg = xmlDoc.documentElement.textContent;
            console.error('XML Parse Error:', errorMsg);
            xmlOutputDiv.innerHTML = `<div style="color: red; padding: 10px; background-color: #ffe0e0; border: 1px solid red;"><strong>Error parsing XML file:</strong><br>${errorMsg}</div>`;
            return;
        }

        // Check if document is valid and has content
        if (!xmlDoc.documentElement) {
            xmlOutputDiv.textContent = 'Error: Invalid XML document structure.';
            return;
        }

        // Regular expression to detect invalid Excel characters
        // Invalid characters: control characters (0x00-0x08, 0x0B-0x0C, 0x0E-0x1F), and some special characters
        const invalidCharPattern = /[\x00-\x08\x0B\x0C\x0E-\x1F]/g;

        // Function to detect invalid characters in a string
        const detectInvalidCharacters = (str) => {
            const matches = str.match(invalidCharPattern);
            return matches ? matches : [];
        };

        // Function to convert XML to data structure with validation
        const xmlToData = (xml) => {
            let rows = Array.from(xml.getElementsByTagName('row'));

            // If no 'row' elements found, try to find child elements of root
            if (rows.length === 0) {
                console.warn('No "row" elements found. Trying to parse root children.');
                rows = Array.from(xml.documentElement.children);
            }

            console.log(`Found ${rows.length} rows to process`);

            const data = [];
            const invalidCharacterLog = [];

            rows.forEach((row, rowIndex) => {
                const cells = Array.from(row.children);
                const rowData = {};
                const invalidCharsInRow = {};

                cells.forEach((cell, cellIndex) => {
                    const cellText = cell.textContent.trim();
                    const invalidChars = detectInvalidCharacters(cellText);

                    rowData[cell.tagName || `col${cellIndex}`] = cellText;

                    if (invalidChars.length > 0) {
                        if (!invalidCharsInRow[cell.tagName || `col${cellIndex}`]) {
                            invalidCharsInRow[cell.tagName || `col${cellIndex}`] = [];
                        }
                        invalidCharsInRow[cell.tagName || `col${cellIndex}`].push(...invalidChars);

                        invalidCharacterLog.push({
                            row: rowIndex + 1,
                            column: cell.tagName || `col${cellIndex}`,
                            invalidChars: invalidChars.map(c => `0x${c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')}`)
                        });
                    }
                });

                data.push(rowData);
            });

            return { data, invalidCharacterLog };
        };

        const { data, invalidCharacterLog } = xmlToData(xmlDoc);

        if (data.length === 0) {
            const errorMsg = 'No data found in the XML file. Make sure the XML has child elements with data.';
            console.warn(errorMsg);
            console.log('XML Root Element:', xmlDoc.documentElement.tagName);
            console.log('XML Root Children:', Array.from(xmlDoc.documentElement.children).map(el => el.tagName));
            xmlOutputDiv.innerHTML = `<div style="color: #d97706; padding: 10px; background-color: #fef3c7; border: 1px solid #f59e0b;"><strong>Warning:</strong><br>${errorMsg}<br><br><strong>XML Root Element:</strong> ${xmlDoc.documentElement.tagName}</div>`;
            return;
        }

        // Create a container for results
        const container = document.createElement('div');
        container.style.marginTop = '20px';

        // Display invalid characters report if found
        if (invalidCharacterLog.length > 0) {
            const reportDiv = document.createElement('div');
            reportDiv.style.backgroundColor = '#fff3cd';
            reportDiv.style.padding = '10px';
            reportDiv.style.marginBottom = '20px';
            reportDiv.style.border = '1px solid #ffc107';
            reportDiv.style.borderRadius = '4px';

            const reportTitle = document.createElement('h3');
            reportTitle.textContent = `⚠️ Found ${invalidCharacterLog.length} Invalid Character(s)`;
            reportTitle.style.color = '#856404';
            reportDiv.appendChild(reportTitle);

            const reportTable = document.createElement('table');
            reportTable.style.borderCollapse = 'collapse';
            reportTable.style.width = '100%';

            const reportHeaderTr = document.createElement('tr');
            ['Row', 'Column', 'Invalid Characters (Hex)'].forEach(header => {
                const th = document.createElement('th');
                th.textContent = header;
                th.style.border = '1px solid #ffc107';
                th.style.padding = '8px';
                th.style.backgroundColor = '#ffeaa7';
                th.style.textAlign = 'left';
                reportHeaderTr.appendChild(th);
            });
            reportTable.appendChild(reportHeaderTr);

            invalidCharacterLog.forEach(log => {
                const tr = document.createElement('tr');
                const cells = [
                    log.row.toString(),
                    log.column,
                    log.invalidChars.join(', ')
                ];

                cells.forEach(cellText => {
                    const td = document.createElement('td');
                    td.textContent = cellText;
                    td.style.border = '1px solid #ffc107';
                    td.style.padding = '8px';
                    tr.appendChild(td);
                });

                reportTable.appendChild(tr);
            });

            reportDiv.appendChild(reportTable);
            container.appendChild(reportDiv);
        } else {
            const noInvalidDiv = document.createElement('div');
            noInvalidDiv.style.backgroundColor = '#d4edda';
            noInvalidDiv.style.padding = '10px';
            noInvalidDiv.style.marginBottom = '20px';
            noInvalidDiv.style.border = '1px solid #28a745';
            noInvalidDiv.style.borderRadius = '4px';
            noInvalidDiv.style.color = '#155724';

            const noInvalidTitle = document.createElement('h3');
            noInvalidTitle.textContent = '✓ No invalid characters detected!';
            noInvalidDiv.appendChild(noInvalidTitle);
            container.appendChild(noInvalidDiv);
        }

        // Create a preview table
        const previewDiv = document.createElement('div');
        previewDiv.style.marginTop = '20px';

        const previewTitle = document.createElement('h3');
        previewTitle.textContent = 'Data Preview';
        previewDiv.appendChild(previewTitle);

        const table = document.createElement('table');
        table.style.borderCollapse = 'collapse';
        table.style.width = '100%';

        // Get headers from first row
        const headers = Object.keys(data[0]);
        const headerTr = document.createElement('tr');
        headers.forEach(header => {
            const th = document.createElement('th');
            th.textContent = header;
            th.style.border = '1px solid black';
            th.style.padding = '8px';
            th.style.backgroundColor = '#f2f2f2';
            th.style.fontWeight = 'bold';
            headerTr.appendChild(th);
        });
        table.appendChild(headerTr);

        // Add first 5 rows as preview
        data.slice(0, 5).forEach(row => {
            const tr = document.createElement('tr');
            headers.forEach(header => {
                const td = document.createElement('td');
                td.textContent = row[header] || '';
                td.style.border = '1px solid black';
                td.style.padding = '8px';
                tr.appendChild(td);
            });
            table.appendChild(tr);
        });

        previewDiv.appendChild(table);
        container.appendChild(previewDiv);

        // Add export button
        const exportButton = document.createElement('button');
        exportButton.textContent = 'Export to Excel';
        exportButton.style.marginTop = '20px';
        exportButton.style.padding = '10px 20px';
        exportButton.style.backgroundColor = '#4CAF50';
        exportButton.style.color = 'white';
        exportButton.style.border = 'none';
        exportButton.style.borderRadius = '4px';
        exportButton.style.cursor = 'pointer';
        exportButton.style.fontSize = '16px';

        exportButton.addEventListener('click', () => {
            // Create a new workbook
            const wb = XLSX.utils.book_new();

            // Add data sheet
            const ws_data = XLSX.utils.json_to_sheet(data);
            XLSX.utils.book_append_sheet(wb, ws_data, 'Data');

            // Add invalid characters log sheet if there are any
            if (invalidCharacterLog.length > 0) {
                const ws_invalid = XLSX.utils.json_to_sheet(invalidCharacterLog);
                XLSX.utils.book_append_sheet(wb, ws_invalid, 'Invalid Characters');
            }

            // Save the workbook
            XLSX.writeFile(wb, `data_${new Date().getTime()}.xlsx`);
        });

        container.appendChild(exportButton);
        xmlOutputDiv.appendChild(container);

    } catch (error) {
        xmlOutputDiv.textContent = `Error: ${error.message}`;
        console.error('Error processing XML file:', error);
    }
}

// Try to attach immediately
if (!attachEventListener()) {
    // If not attached, wait for DOMContentLoaded
    document.addEventListener('DOMContentLoaded', attachEventListener);
}

