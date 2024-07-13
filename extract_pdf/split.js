document.getElementById('split-button').addEventListener('click', async () => {
    const splitFileInput = document.getElementById('split-pdf-upload');
    const filterKeyInput = document.getElementById('filter-key');
    const valueListInput = document.getElementById('value-list');
    const splitOutputDiv = document.getElementById('split-output');
    splitOutputDiv.innerHTML = ''; // Clear previous output

    if (splitFileInput.files.length === 0 || filterKeyInput.value.trim() === '' || valueListInput.value.trim() === '') {
        alert('Please select a PDF file, enter a filter key, and enter values.');
        return;
    }

    const splitFile = splitFileInput.files[0];
    const filterKey = filterKeyInput.value.trim();
    const values = valueListInput.value.split('\n').map(value => value.trim()).filter(value => value);

    const arrayBuffer = await splitFile.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    const notFoundValues = [];
    const newPdfDoc = await PDFLib.PDFDocument.create();
    const totalValues = values.length;
    let processedValues = 0;

    const progressIndicator = document.createElement('p');
    splitOutputDiv.appendChild(progressIndicator);

    for (const value of values) {
        try {
            processedValues++;
            const percentage = ((processedValues / totalValues) * 100).toFixed(2);
            progressIndicator.innerHTML = `Now has processed ${processedValues} of ${totalValues}: ${percentage}%`;
            console.log(`Now processing ${value}...`);

            let valueFound = false;
            const normalizedSearchString = `${filterKey}\\s*:\\s*${value}`.replace(/\s+/g, '\\s*').toLowerCase();

            let startPageNum = -1;

            for (let pageNum = 1; pageNum <= pdf.numPages && !valueFound; pageNum++) {
                const page = await pdf.getPage(pageNum);
                const textContent = await page.getTextContent();
                const textItems = textContent.items.map(item => item.str);
                const text = textItems.join(' ');
                const normalizedText = text.replace(/\s+/g, ' ').toLowerCase();

                const regex = new RegExp(normalizedSearchString, 'i'); // Case-insensitive search

                if (regex.test(normalizedText)) {
                    valueFound = true;
                    startPageNum = pageNum;

                    let endPageNum = pdf.numPages;
                    for (let nextPageNum = startPageNum + 1; nextPageNum <= pdf.numPages; nextPageNum++) {
                        const nextPage = await pdf.getPage(nextPageNum);
                        const nextTextContent = await nextPage.getTextContent();
                        const nextTextItems = nextTextContent.items.map(item => item.str);
                        const nextText = nextTextItems.join(' ');
                        const nextNormalizedText = nextText.replace(/\s+/g, ' ').toLowerCase();

                        const nextRegex = new RegExp(`${filterKey}\\s*:`.replace(/\s+/g, '\\s*'), 'i'); // Case-insensitive search

                        if (nextRegex.test(nextNormalizedText)) {
                            endPageNum = nextPageNum - 1;
                            break;
                        }
                    }

                    console.log(`Extracting pages from ${startPageNum} to ${endPageNum}`);
                    for (let extractPageNum = startPageNum; extractPageNum <= endPageNum; extractPageNum++) {
                        const [extractedPage] = await newPdfDoc.copyPages(await PDFLib.PDFDocument.load(arrayBuffer), [extractPageNum - 1]);
                        newPdfDoc.addPage(extractedPage);
                    }
                }
            }

            if (!valueFound) {
                notFoundValues.push(value);
            }

        } catch (error) {
            console.error(`Error processing ${value}:`, error);
            splitOutputDiv.innerHTML += `<p>Error processing ${value}: ${error.message}</p>`;
        }
    }

    // Save and provide the final split PDF for download
    try {
        const finalPdfBytes = await newPdfDoc.save();
        const finalPdfBlob = new Blob([finalPdfBytes], { type: 'application/pdf' });
        const finalPdfUrl = URL.createObjectURL(finalPdfBlob);
        const finalPdfLink = document.createElement('a');
        finalPdfLink.href = finalPdfUrl;
        finalPdfLink.download = 'split_statements.pdf';
        finalPdfLink.textContent = 'Download Split Statements PDF';
        splitOutputDiv.appendChild(document.createElement('br'));
        splitOutputDiv.appendChild(finalPdfLink);
    } catch (error) {
        console.error('Error saving final PDF:', error);
        splitOutputDiv.innerHTML += `<p>Error saving final PDF: ${error.message}</p>`;
    }

    // Output the values not found in the PDF
    if (notFoundValues.length > 0) {
        splitOutputDiv.appendChild(document.createElement('br'));
        splitOutputDiv.innerHTML += `<p>Values not found in PDF: ${notFoundValues.join(', ')}</p>`;
    }
});
