let zip = new JSZip(); // Initialize JSZip at the top-level scope

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

document.getElementById('scan-opening-balance-button').addEventListener('click', async () => {
    const fileInput = document.getElementById('pdf-upload');
    const outputDiv = document.getElementById('output');
    outputDiv.innerHTML = ''; // Clear previous output

    if (fileInput.files.length === 0) {
        alert('Please select a PDF file.');
        return;
    }

    const file = fileInput.files[0];
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    const negativeBalancePages = [];
    const negativeClosingBalancePages = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const textItems = textContent.items.map(item => item.str);
        const text = textItems.join(' ');

        // Normalize spaces
        const normalizedText = text.replace(/\s+/g, ' ');

        // Find "Opening Balance" and its value (allowing multiple spaces and commas, and handling negative values as -$amount)
        const openingBalanceMatch = normalizedText.match(/Opening Balance\s+-?\$-?\d{1,3}(,\d{3})*(\.\d{2})?/);

        if (openingBalanceMatch) {
            const openingBalanceValue = parseFloat(openingBalanceMatch[0].replace(/Opening Balance\s+|\$/g, '').replace(/,/g, ''));

            if (openingBalanceValue < 0) {
                negativeBalancePages.push(pageNum);
            }
        }

        const closingBalanceMatch = normalizedText.match(/Closing Balance\s+-?\$-?\d{1,3}(,\d{3})*(\.\d{2})?/);

        if (closingBalanceMatch) {
            const closingBalanceValue = parseFloat(openingBalanceMatch[0].replace(/Closing Balance\s+|\$/g, '').replace(/,/g, ''));

            if (closingBalanceValue < 0) {
                negativeClosingBalancePages.push(pageNum);
            }
        }
    }

    if (negativeBalancePages.length > 0) {
        outputDiv.innerHTML = `<p>Pages with negative "Opening Balance" value: ${negativeBalancePages.join(', ')}</p>`;
    } else {
        outputDiv.innerHTML = '<p>No pages with negative "Opening Balance" value found.</p>';
    }
    if (negativeClosingBalancePages.length > 0) {
        outputDiv.innerHTML = `<p>Pages with negative "Closing Balance" value: ${negativeClosingBalancePages.join(', ')}</p>`;
    } else {
        outputDiv.innerHTML = '<p>No pages with negative "Closing Balance" value found.</p>';
    }
});

document.getElementById('insert-to-print-button').addEventListener('click', async () => {
    const printFileInput = document.getElementById('print-pdf-upload');
    const newKeywordsInput = document.getElementById('new-keywords');
    const outputDiv = document.getElementById('output');
    outputDiv.innerHTML = ''; // Clear previous output

    if (printFileInput.files.length === 0 || newKeywordsInput.value.trim() === '') {
        alert('Please select a print PDF file and enter new keywords.');
        return;
    }

    const printFile = printFileInput.files[0];
    const printArrayBuffer = await printFile.arrayBuffer();
    const printPdf = await pdfjsLib.getDocument({ data: printArrayBuffer }).promise;
    const newKeywords = newKeywordsInput.value.split('\n').map(keyword => keyword.trim()).filter(keyword => keyword);

    const notFoundInPrint = [];
    const newPdfDoc = await PDFLib.PDFDocument.load(printArrayBuffer);

    for (const keyword of newKeywords) {
        let userFound = false;
        const normalizedKeyword = keyword.replace(/\s+/g, ' ');

        for (let pageNum = 1; pageNum <= printPdf.numPages && !userFound; pageNum++) {
            const page = await printPdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            const textItems = textContent.items.map(item => item.str);
            const text = textItems.join(' ');
            const normalizedText = text.replace(/\s+/g, ' ');

            if (normalizedText.includes(normalizedKeyword) && normalizedText.includes('Home Care Package Statement') && normalizedText.includes('Case Manager')) {
                userFound = true;
                let insertionPageNum = pageNum;

                // Find the next occurrence of "Home Care Package Statement" and "Case Manager" after the current page
                for (let nextPageNum = pageNum + 1; nextPageNum <= printPdf.numPages; nextPageNum++) {
                    const nextPage = await printPdf.getPage(nextPageNum);
                    const nextTextContent = await nextPage.getTextContent();
                    const nextTextItems = nextTextContent.items.map(item => item.str);
                    const nextText = nextTextItems.join(' ');
                    const nextNormalizedText = nextText.replace(/\s+/g, ' ');

                    if (nextNormalizedText.includes('Home Care Package Statement') && nextNormalizedText.includes('Case Manager')) {
                        insertionPageNum = nextPageNum - 1;
                        break;
                    }
                }

                // Insert the extracted PDF page
                const extractedPdfBytes = await zip.file(`${normalizedKeyword.replace(/[^a-z0-9]/gi, '_')}.pdf`).async('arraybuffer');
                const extractedPdf = await PDFLib.PDFDocument.load(extractedPdfBytes);
                const [extractedPage] = await newPdfDoc.copyPages(extractedPdf, [0]);
                newPdfDoc.insertPage(insertionPageNum, extractedPage);

                // Insert a blank page if required
                if (insertionPageNum < newPdfDoc.getPageCount() - 1) {
                    newPdfDoc.insertPage(insertionPageNum + 1);
                }
            }
        }

        if (!userFound) {
            notFoundInPrint.push(keyword);
        }
    }

    // Save and provide the final "print pdf" for download
    const finalPdfBytes = await newPdfDoc.save();
    const finalPdfBlob = new Blob([finalPdfBytes], { type: 'application/pdf' });
    const finalPdfUrl = URL.createObjectURL(finalPdfBlob);
    const finalPdfLink = document.createElement('a');
    finalPdfLink.href = finalPdfUrl;
    finalPdfLink.download = 'final_print_pdf.pdf';
    finalPdfLink.textContent = 'Download Final Print PDF';
    outputDiv.appendChild(finalPdfLink);

    // Output the user names not found in the print PDF
    if (notFoundInPrint.length > 0) {
        outputDiv.appendChild(document.createElement('br'));
        outputDiv.innerHTML += `<p>User names not found in print PDF: ${notFoundInPrint.join(', ')}</p>`;
    }
});
