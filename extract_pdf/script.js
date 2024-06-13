document.getElementById('search-button').addEventListener('click', async () => {
    const fileInput = document.getElementById('pdf-upload');
    const keywordsInput = document.getElementById('keywords');
    const outputDiv = document.getElementById('output');
    outputDiv.innerHTML = ''; // Clear previous output

    if (fileInput.files.length === 0 || keywordsInput.value.trim() === '') {
        alert('Please select a PDF file and enter at least one keyword.');
        return;
    }

    const file = fileInput.files[0];
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const keywords = keywordsInput.value.split('\n').map(keyword => keyword.trim()).filter(keyword => keyword);

    // Function to normalize spaces in a string
    const normalizeSpaces = (str) => str.replace(/\s+/g, ' ');

    let foundCount = 0;
    let notFoundCount = 0;
    const notFoundKeywords = [];
    const zip = new JSZip();

    for (const keyword of keywords) {
        let keywordFound = false;
        const normalizedKeyword = normalizeSpaces(keyword);

        for (let pageNum = 1; pageNum <= pdf.numPages && !keywordFound; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            const textItems = textContent.items.map(item => item.str);
            const text = textItems.join(' ');
            const normalizedText = normalizeSpaces(text);

            if (normalizedText.includes(normalizedKeyword)) {
                keywordFound = true; // Exit the loop after finding the keyword
                foundCount++;

                const newPdfDoc = await PDFLib.PDFDocument.create();
                const [copiedPage] = await newPdfDoc.copyPages(await PDFLib.PDFDocument.load(arrayBuffer), [pageNum - 1]);
                newPdfDoc.addPage(copiedPage);

                const pdfBytes = await newPdfDoc.save();
                const filename = `${normalizedKeyword.replace(/[^a-z0-9]/gi, '_')}.pdf`;
                zip.file(filename, pdfBytes);
                const url = URL.createObjectURL(new Blob([pdfBytes], { type: 'application/pdf' }));
                const link = document.createElement('a');
                link.href = url;
                link.download = filename;
                link.textContent = `Download ${filename}`;
                outputDiv.appendChild(link);
                outputDiv.appendChild(document.createElement('br'));
            }
        }

        if (!keywordFound) {
            notFoundCount++;
            notFoundKeywords.push(keyword);
        }
    }

    // Create and append a download link for the ZIP file
    if (foundCount > 0) {
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const zipUrl = URL.createObjectURL(zipBlob);
        const zipLink = document.createElement('a');
        zipLink.href = zipUrl;
        zipLink.download = 'extracted_pages.zip';
        zipLink.textContent = 'Download All as ZIP';
        outputDiv.appendChild(document.createElement('br'));
        outputDiv.appendChild(zipLink);
    }

    // Display summary of search results
    const summary = document.createElement('div');
    summary.innerHTML = `<p>Found ${foundCount} keyword(s).</p><p>Not found ${notFoundCount} keyword(s): ${notFoundKeywords.join(', ')}</p>`;
    outputDiv.appendChild(summary);
});
