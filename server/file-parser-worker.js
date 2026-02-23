const fs = require('fs/promises');
const path = require('path');
const { parentPort, workerData } = require('worker_threads');

const MAX_EXTRACTED_CHARS = 200000;

function truncateExtractedContent(value) {
    const text = String(value || '');
    if (text.length <= MAX_EXTRACTED_CHARS) return text;
    return `${text.slice(0, MAX_EXTRACTED_CHARS)}\n\n... [Noi dung da duoc cat bot do qua dai]`;
}

async function parsePdf(filePath) {
    const pdfParse = require('pdf-parse');
    const buffer = await fs.readFile(filePath);
    const result = await pdfParse(buffer);
    return result?.text || '';
}

async function parseWord(filePath, fileExt) {
    const mammoth = require('mammoth');
    try {
        const result = await mammoth.extractRawText({ path: filePath });
        return result?.value || '';
    } catch (error) {
        if (fileExt === '.doc') {
            return '[File .doc cu - khong the doc truc tiep. Vui long chuyen sang .docx hoac PDF]';
        }
        throw error;
    }
}

async function parseExcel(filePath) {
    const XLSX = require('xlsx');
    const workbook = XLSX.readFile(filePath);
    let excelContent = '';

    workbook.SheetNames.forEach((sheetName, index) => {
        const sheet = workbook.Sheets[sheetName];
        const csvData = XLSX.utils.sheet_to_csv(sheet);
        excelContent += `\n--- Sheet ${index + 1}: ${sheetName} ---\n${csvData}\n`;
    });

    return excelContent;
}

async function parseFile() {
    const filePath = String(workerData?.filePath || '').trim();
    const mimetype = String(workerData?.mimetype || '').toLowerCase();
    const filename = String(workerData?.filename || '').trim();
    const fileExt = String(workerData?.fileExt || path.extname(filename)).toLowerCase();
    const fileSizeKB = String(workerData?.fileSizeKB || '').trim();

    if (!filePath) {
        throw new Error('Missing file path');
    }

    if (mimetype === 'application/pdf' || fileExt === '.pdf') {
        return {
            fileTypeIcon: '📄',
            extractedContent: truncateExtractedContent(await parsePdf(filePath))
        };
    }

    if (
        mimetype === 'application/msword' ||
        mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        fileExt === '.doc' ||
        fileExt === '.docx'
    ) {
        return {
            fileTypeIcon: '📝',
            extractedContent: truncateExtractedContent(await parseWord(filePath, fileExt))
        };
    }

    if (
        mimetype.includes('spreadsheet') ||
        mimetype.includes('excel') ||
        fileExt === '.xlsx' ||
        fileExt === '.xls'
    ) {
        return {
            fileTypeIcon: '📊',
            extractedContent: truncateExtractedContent(await parseExcel(filePath))
        };
    }

    return {
        fileTypeIcon: '📁',
        extractedContent: `[File: ${filename}]\nLoai: ${mimetype}\nKich thuoc: ${fileSizeKB} KB\n\nKhong ho tro parse loai file nay trong worker.`
    };
}

(async () => {
    try {
        const payload = await parseFile();
        parentPort.postMessage(payload);
    } catch (error) {
        parentPort.postMessage({
            error: error?.message || 'Worker parse failed'
        });
    }
})();
