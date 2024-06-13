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

    for (const keyword of keywords) {
        let keywordFound = false;

        for (let pageNum = 1; pageNum <= pdf.numPages && !keywordFound; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            const textItems = textContent.items.map(item => item.str);
            const text = textItems.join(' ');

            if (text.includes(keyword)) {
                keywordFound = true; // Exit the loop after finding the keyword

                const newPdfDoc = await PDFLib.PDFDocument.create();
                const [copiedPage] = await newPdfDoc.copyPages(await PDFLib.PDFDocument.load(arrayBuffer), [pageNum - 1]);
                newPdfDoc.addPage(copiedPage);

                const pdfBytes = await newPdfDoc.save();
                const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `${keyword.replace(/[^a-z0-9]/gi, '_')}.pdf`; // Sanitize filename
                link.textContent = `Download ${keyword.replace(/[^a-z0-9]/gi, '_')}.pdf`;
                outputDiv.appendChild(link);
                outputDiv.appendChild(document.createElement('br'));
            }
        }
    }
});
