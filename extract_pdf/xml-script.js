document.addEventListener('DOMContentLoaded', () => {
    const button = document.getElementById('load-xml-button');
    if (!button) {
        console.error('Button "load-xml-button" not found');
        return;
    }

    button.addEventListener('click', async () => {
        const xmlFileInput = document.getElementById('xml-upload');
        const xmlOutputDiv = document.getElementById('xml-output');
        xmlOutputDiv.innerHTML = ''; // Clear previous output

        if (xmlFileInput.files.length === 0) {
            alert('Please select an XML file.');
            return;
        }

        const xmlFile = xmlFileInput.files[0];
        const xmlText = await xmlFile.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'application/xml');

        // Function to convert XML to CSV
        const xmlToCsv = (xml) => {
            const rows = Array.from(xml.getElementsByTagName('row'));
            const csvRows = [];

            rows.forEach((row, rowIndex) => {
                const cells = Array.from(row.children);
                const cellValues = cells.map(cell => `"${cell.textContent.trim()}"`);
                csvRows.push(cellValues.join(','));
            });

            return csvRows.join('\n');
        };

        const csv = xmlToCsv(xmlDoc);

        if (!csv) {
            xmlOutputDiv.textContent = 'Failed to convert XML to CSV.';
            return;
        }

        const csvLines = csv.split('\n');
        if (csvLines.length === 0) {
            xmlOutputDiv.textContent = 'No data found in the XML file.';
            return;
        }

        // Create a table to display the first row
        const headers = csvLines[0].split(',');
        const firstRow = csvLines[1] ? csvLines[1].split(',') : [];

        const table = document.createElement('table');
        table.style.borderCollapse = 'collapse';
        table.style.width = '100%';
        table.style.marginTop = '20px';

        const headerTr = document.createElement('tr');
        headers.forEach(header => {
            const th = document.createElement('th');
            th.textContent = header.replace(/"/g, '');
            th.style.border = '1px solid black';
            th.style.padding = '8px';
            th.style.backgroundColor = '#f2f2f2';
            headerTr.appendChild(th);
        });
        table.appendChild(headerTr);

        const firstRowTr = document.createElement('tr');
        firstRow.forEach(value => {
            const td = document.createElement('td');
            td.textContent = value.replace(/"/g, '');
            td.style.border = '1px solid black';
            td.style.padding = '8px';
            firstRowTr.appendChild(td);
        });
        table.appendChild(firstRowTr);

        xmlOutputDiv.appendChild(table);
    });
});
