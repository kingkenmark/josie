// XML Fixer - Auto-detects and removes invalid characters
function attachXMLFixerEventListener() {
    const button = document.getElementById('fix-xml-button');
    if (!button) {
        console.warn('Button "fix-xml-button" not found yet');
        return false;
    }

    button.addEventListener('click', handleXMLFixer);
    console.log('XML Fixer event listener attached');
    return true;
}

async function handleXMLFixer() {
    const xmlFileInput = document.getElementById('xml-excel-upload');
    const xmlOutputDiv = document.getElementById('xml-excel-output');
    console.log('Fix XML button clicked');
    xmlOutputDiv.innerHTML = ''; // Clear previous output

    if (xmlFileInput.files.length === 0) {
        alert('Please select an XML file.');
        return;
    }

    try {
        const xmlFile = xmlFileInput.files[0];
        let xmlText = await xmlFile.text();
        const originalFileName = xmlFile.name.replace('.xml', '_fixed.xml');

        // Show processing message
        const processingDiv = document.createElement('div');
        processingDiv.style.padding = '10px';
        processingDiv.style.backgroundColor = '#e3f2fd';
        processingDiv.style.border = '1px solid #2196F3';
        processingDiv.style.borderRadius = '4px';
        processingDiv.style.marginBottom = '10px';
        processingDiv.innerHTML = '<strong>Processing...</strong> Scanning for invalid characters...';
        xmlOutputDiv.appendChild(processingDiv);

        // Track all fixes
        const fixLog = [];
        let attemptCount = 0;
        const maxAttempts = 10;
        let lastValidXml = null;

        // Continuously try to parse and fix
        while (attemptCount < maxAttempts) {
            attemptCount++;
            console.log(`Attempt ${attemptCount}: Trying to parse XML...`);

            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, 'application/xml');

            // Check for parsing errors
            if (xmlDoc.getElementsByTagName('parsererror').length === 0) {
                // Success! XML is now valid
                console.log(`✓ XML parsed successfully on attempt ${attemptCount}`);
                lastValidXml = xmlText;
                break;
            }

            // Get the error message
            const errorElement = xmlDoc.getElementsByTagName('parsererror')[0];
            const errorMsg = errorElement ? errorElement.textContent : 'Unknown error';
            console.error(`Attempt ${attemptCount} - Parse Error:`, errorMsg);

            // Try to extract error location from message
            let charToRemove = null;
            const charCodeMatch = errorMsg.match(/Char value (\d+)/);

            if (charCodeMatch) {
                const charCode = parseInt(charCodeMatch[1]);
                charToRemove = String.fromCharCode(charCode);

                // Find position in XML (if mentioned in error)
                const positionMatch = errorMsg.match(/column (\d+)/);
                const columnHint = positionMatch ? positionMatch[1] : 'unknown position';

                console.log(`Found invalid character: 0x${charCode.toString(16).toUpperCase()} (${charCode}) at column ${columnHint}`);

                // Remove the first occurrence of this invalid character
                if (xmlText.includes(charToRemove)) {
                    const position = xmlText.indexOf(charToRemove);
                    fixLog.push({
                        attempt: attemptCount,
                        invalidChar: charToRemove,
                        charCode: charCode,
                        hexCode: `0x${charCode.toString(16).toUpperCase()}`,
                        position: position,
                        context: xmlText.substring(Math.max(0, position - 20), Math.min(xmlText.length, position + 20))
                    });

                    xmlText = xmlText.replace(charToRemove, '');
                    console.log(`Removed invalid character. New length: ${xmlText.length}`);
                } else {
                    // If we can't find the exact character, try to remove common invalid chars
                    console.warn('Could not find exact character, trying to remove control characters...');
                    const beforeLength = xmlText.length;
                    xmlText = removeAllInvalidCharacters(xmlText, fixLog, attemptCount);
                    if (xmlText.length === beforeLength) {
                        throw new Error('Could not identify and remove invalid character. Error: ' + errorMsg);
                    }
                }
            } else {
                // If we can't parse the error, try removing all control characters
                console.warn('Could not parse error message, removing all control characters...');
                const beforeLength = xmlText.length;
                xmlText = removeAllInvalidCharacters(xmlText, fixLog, attemptCount);
                if (xmlText.length === beforeLength) {
                    throw new Error('Could not fix XML. Error: ' + errorMsg);
                }
            }

            // Safety check to prevent infinite loops
            if (fixLog.length > 100) {
                throw new Error('Too many invalid characters found (>100). XML file may be severely corrupted.');
            }
        }

        if (attemptCount >= maxAttempts) {
            throw new Error(`Could not fix XML after ${maxAttempts} attempts. File may have too many invalid characters.`);
        }

        // Success! Build the result UI
        xmlOutputDiv.innerHTML = '';

        // Show success message
        const successDiv = document.createElement('div');
        successDiv.style.backgroundColor = '#c8e6c9';
        successDiv.style.padding = '15px';
        successDiv.style.marginBottom = '20px';
        successDiv.style.border = '1px solid #4caf50';
        successDiv.style.borderRadius = '4px';
        successDiv.style.color = '#2e7d32';

        const successTitle = document.createElement('h3');
        successTitle.textContent = `✓ XML Fixed Successfully!`;
        successTitle.style.margin = '0 0 10px 0';
        successDiv.appendChild(successTitle);

        const successMsg = document.createElement('p');
        successMsg.innerHTML = `
            <strong>Fixes Applied:</strong> ${fixLog.length} invalid character(s) removed<br>
            <strong>Attempts:</strong> ${attemptCount}<br>
            <strong>Original Size:</strong> ${xmlFile.size} bytes<br>
            <strong>Fixed Size:</strong> ${lastValidXml.length} bytes
        `;
        successMsg.style.margin = '0';
        successDiv.appendChild(successMsg);

        xmlOutputDiv.appendChild(successDiv);

        // Show detailed fix log
        if (fixLog.length > 0) {
            const logDiv = document.createElement('div');
            logDiv.style.marginBottom = '20px';

            const logTitle = document.createElement('h3');
            logTitle.textContent = `Deleted Invalid Characters (${fixLog.length} total)`;
            logTitle.style.marginBottom = '10px';
            logDiv.appendChild(logTitle);

            const logTable = document.createElement('table');
            logTable.style.borderCollapse = 'collapse';
            logTable.style.width = '100%';
            logTable.style.fontSize = '12px';

            // Header
            const headerTr = document.createElement('tr');
            ['#', 'Char Code (Hex)', 'Char Code (Dec)', 'Position', 'Context (surrounding text)'].forEach(header => {
                const th = document.createElement('th');
                th.textContent = header;
                th.style.border = '1px solid #ddd';
                th.style.padding = '8px';
                th.style.backgroundColor = '#f5f5f5';
                th.style.textAlign = 'left';
                th.style.fontWeight = 'bold';
                headerTr.appendChild(th);
            });
            logTable.appendChild(headerTr);

            // Rows
            fixLog.forEach((log, idx) => {
                const tr = document.createElement('tr');
                tr.style.backgroundColor = idx % 2 === 0 ? '#fafafa' : '#fff';

                const cells = [
                    (idx + 1).toString(),
                    log.hexCode,
                    log.charCode.toString(),
                    log.position.toString(),
                    log.context.replace(/</g, '&lt;').replace(/>/g, '&gt;')
                ];

                cells.forEach(cellText => {
                    const td = document.createElement('td');
                    td.textContent = cellText;
                    td.style.border = '1px solid #ddd';
                    td.style.padding = '8px';
                    tr.appendChild(td);
                });

                logTable.appendChild(tr);
            });

            logDiv.appendChild(logTable);
            xmlOutputDiv.appendChild(logDiv);
        }

        // Parse the fixed XML and show data preview
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(lastValidXml, 'application/xml');

        // Function to detect remaining invalid characters in data
        const invalidCharPattern = /[\x00-\x08\x0B\x0C\x0E-\x1F]/g;
        const detectInvalidCharacters = (str) => {
            const matches = str.match(invalidCharPattern);
            return matches ? matches : [];
        };

        // Function to convert XML to data structure with validation
        const xmlToData = (xml) => {
            let rows = Array.from(xml.getElementsByTagName('row'));
            if (rows.length === 0) {
                rows = Array.from(xml.documentElement.children);
            }

            const data = [];
            const invalidCharacterLog = [];

            rows.forEach((row, rowIndex) => {
                const cells = Array.from(row.children);
                const rowData = {};

                cells.forEach((cell, cellIndex) => {
                    const cellText = cell.textContent.trim();
                    const invalidChars = detectInvalidCharacters(cellText);

                    rowData[cell.tagName || `col${cellIndex}`] = cellText;

                    if (invalidChars.length > 0) {
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

        // Show data validation results
        if (invalidCharacterLog.length > 0) {
            const validationDiv = document.createElement('div');
            validationDiv.style.backgroundColor = '#fff3cd';
            validationDiv.style.padding = '15px';
            validationDiv.style.marginBottom = '20px';
            validationDiv.style.border = '1px solid #ffc107';
            validationDiv.style.borderRadius = '4px';

            const validationTitle = document.createElement('h3');
            validationTitle.textContent = `⚠️ Found ${invalidCharacterLog.length} Invalid Character(s) in Data`;
            validationTitle.style.color = '#856404';
            validationTitle.style.margin = '0 0 10px 0';
            validationDiv.appendChild(validationTitle);

            const validationTable = document.createElement('table');
            validationTable.style.borderCollapse = 'collapse';
            validationTable.style.width = '100%';

            const validationHeaderTr = document.createElement('tr');
            ['Row', 'Column', 'Invalid Characters (Hex)'].forEach(header => {
                const th = document.createElement('th');
                th.textContent = header;
                th.style.border = '1px solid #ffc107';
                th.style.padding = '8px';
                th.style.backgroundColor = '#ffeaa7';
                th.style.textAlign = 'left';
                validationHeaderTr.appendChild(th);
            });
            validationTable.appendChild(validationHeaderTr);

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

                validationTable.appendChild(tr);
            });

            validationDiv.appendChild(validationTable);
            xmlOutputDiv.appendChild(validationDiv);
        } else {
            const noInvalidDiv = document.createElement('div');
            noInvalidDiv.style.backgroundColor = '#d4edda';
            noInvalidDiv.style.padding = '15px';
            noInvalidDiv.style.marginBottom = '20px';
            noInvalidDiv.style.border = '1px solid #28a745';
            noInvalidDiv.style.borderRadius = '4px';
            noInvalidDiv.style.color = '#155724';

            const noInvalidTitle = document.createElement('h3');
            noInvalidTitle.textContent = '✓ No invalid characters found in data!';
            noInvalidTitle.style.margin = '0';
            noInvalidDiv.appendChild(noInvalidTitle);
            xmlOutputDiv.appendChild(noInvalidDiv);
        }

        // Show data preview
        if (data.length > 0) {
            const previewDiv = document.createElement('div');
            previewDiv.style.marginBottom = '20px';

            const previewTitle = document.createElement('h3');
            previewTitle.textContent = `Data Preview (${data.length} rows total)`;
            previewDiv.appendChild(previewTitle);

            const table = document.createElement('table');
            table.style.borderCollapse = 'collapse';
            table.style.width = '100%';

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
            xmlOutputDiv.appendChild(previewDiv);
        }

        // Create download button for fixed XML file
        const downloadButtonsDiv = document.createElement('div');
        downloadButtonsDiv.style.marginBottom = '20px';

        const downloadXmlButton = document.createElement('button');
        downloadXmlButton.textContent = `📥 Download Fixed XML (${originalFileName})`;
        downloadXmlButton.style.padding = '12px 20px';
        downloadXmlButton.style.backgroundColor = '#2196F3';
        downloadXmlButton.style.color = 'white';
        downloadXmlButton.style.border = 'none';
        downloadXmlButton.style.borderRadius = '4px';
        downloadXmlButton.style.cursor = 'pointer';
        downloadXmlButton.style.fontSize = '14px';
        downloadXmlButton.style.marginRight = '10px';

        downloadXmlButton.addEventListener('click', () => {
            const blob = new Blob([lastValidXml], { type: 'application/xml' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = originalFileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            console.log(`Downloaded fixed XML as ${originalFileName}`);
        });

        downloadButtonsDiv.appendChild(downloadXmlButton);

        // Create export to Excel button
        const exportXlsxButton = document.createElement('button');
        exportXlsxButton.textContent = '📊 Export to Excel (.xlsx)';
        exportXlsxButton.style.padding = '12px 20px';
        exportXlsxButton.style.backgroundColor = '#4CAF50';
        exportXlsxButton.style.color = 'white';
        exportXlsxButton.style.border = 'none';
        exportXlsxButton.style.borderRadius = '4px';
        exportXlsxButton.style.cursor = 'pointer';
        exportXlsxButton.style.fontSize = '14px';

        exportXlsxButton.addEventListener('click', () => {
            if (typeof XLSX === 'undefined') {
                alert('Excel export library not loaded. Please try again.');
                return;
            }

            const wb = XLSX.utils.book_new();
            const ws_data = XLSX.utils.json_to_sheet(data);
            XLSX.utils.book_append_sheet(wb, ws_data, 'Data');

            if (invalidCharacterLog.length > 0) {
                const ws_invalid = XLSX.utils.json_to_sheet(invalidCharacterLog);
                XLSX.utils.book_append_sheet(wb, ws_invalid, 'Data Issues');
            }

            if (fixLog.length > 0) {
                const ws_fixes = XLSX.utils.json_to_sheet(fixLog);
                XLSX.utils.book_append_sheet(wb, ws_fixes, 'Fixes Applied');
            }

            XLSX.writeFile(wb, `data_${new Date().getTime()}.xlsx`);
        });

        downloadButtonsDiv.appendChild(exportXlsxButton);
        xmlOutputDiv.appendChild(downloadButtonsDiv);

    } catch (error) {
        xmlOutputDiv.innerHTML = `
            <div style="color: #c62828; padding: 15px; background-color: #ffebee; border: 1px solid #ef5350; border-radius: 4px;">
                <strong>Error:</strong><br>
                ${error.message}
            </div>
        `;
        console.error('Error processing XML:', error);
    }
}

// Helper function to remove all control characters in one pass
function removeAllInvalidCharacters(text, fixLog, attemptCount) {
    const invalidCharPattern = /[\x00-\x08\x0B\x0C\x0E-\x1F]/g;
    let matches = text.match(invalidCharPattern);

    if (matches) {
        // Get unique characters and track them
        const uniqueChars = [...new Set(matches)];

        uniqueChars.forEach(char => {
            const charCode = char.charCodeAt(0);
            fixLog.push({
                attempt: attemptCount,
                invalidChar: char,
                charCode: charCode,
                hexCode: `0x${charCode.toString(16).toUpperCase()}`,
                position: text.indexOf(char),
                context: `Batch removal of all control characters`
            });
        });

        // Remove all control characters
        return text.replace(invalidCharPattern, '');
    }

    return text;
}

// Try to attach immediately
if (!attachXMLFixerEventListener()) {
    // If not attached, wait for DOMContentLoaded
    document.addEventListener('DOMContentLoaded', attachXMLFixerEventListener);
}

