import Tesseract from 'tesseract.js';
import * as Canvas from "canvas";
import moment = require("moment");
export type int = number & { __int__: void };
import { AztecCodeReader, HTMLCanvasElementLuminanceSource, BinaryBitmap, HybridBinarizer, IllegalStateException } from '@zxing/library';
import { PDFDocumentProxy } from 'pdfjs-dist/lib/display/api';
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";
// const pdfjsLib = pdfjs;
// let pdfjsLib: any = require("pdfjs-dist/lib/pdf");

enum Table {
    UPPER,
    LOWER,
    MIXED,
    DIGIT,
    PUNCT,
    BINARY
}

const UPPER_TABLE = [
    "CTRL_PS", " ", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P",
    "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "CTRL_LL", "CTRL_ML", "CTRL_DL", "CTRL_BS"
];

const LOWER_TABLE = [
    "CTRL_PS", " ", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p",
    "q", "r", "s", "t", "u", "v", "w", "x", "y", "z", "CTRL_US", "CTRL_ML", "CTRL_DL", "CTRL_BS"
];

const MIXED_TABLE = [
    "CTRL_PS", " ", "\1", "\2", "\3", "\4", "\5", "\6", "\7", "\b", "\t", "\n",
    "\13", "\f", "\r", "\33", "\34", "\35", "\36", "\37", "@", "\\", "^", "_",
    "`", "|", "~", "\177", "CTRL_LL", "CTRL_UL", "CTRL_PL", "CTRL_BS"
];

const PUNCT_TABLE = [
    "", "\r", "\r\n", ". ", ", ", ": ", "!", "\"", "#", "$", "%", "&", "'", "(", ")",
    "*", "+", ",", "-", ".", "/", ":", ";", "<", "=", ">", "?", "[", "]", "{", "}", "CTRL_UL"
];

const DIGIT_TABLE = [
    "CTRL_PS", " ", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", ",", ".", "CTRL_UL", "CTRL_US"
];

function parseDate(input: string): moment.Moment {
    return moment(input, "DD.MM.YYYY");
}

export interface IPersonalData {
    semester: { begin: moment.Moment; end: moment.Moment };
    validityArea: string;
    school: string;
    name: string;
    birthdate: string;
    matriculationNumber: number;
}

class NodeCanvasFactory {
    create(width: number, height: number) {
        var canvas = Canvas.createCanvas(width, height);
        var context = canvas.getContext("2d");
        // context.antialias = 'gray';
        context.patternQuality = 'best';
        // context.quality = 'best';
        return {
            canvas: canvas,
            context: context,
        };
    }

    reset(canvasAndContext: any, width: number, height: number) {
        canvasAndContext.canvas.width = width;
        canvasAndContext.canvas.height = height;
    }

    destroy(canvasAndContext: any) {
        // Zeroing the width and height cause Firefox to release graphics
        // resources immediately, which can greatly reduce memory consumption.
        canvasAndContext.canvas.width = 0;
        canvasAndContext.canvas.height = 0;
        canvasAndContext.canvas = null;
        canvasAndContext.context = null;
    }
};

async function extractSerialNumber(canvas: Canvas.Canvas): Promise<string> {
    const personalDataCanvas = Canvas.createCanvas(150.0, 50.0);
    const context = personalDataCanvas.getContext("2d");
    context.drawImage(canvas, 460.0, 230.0, 700, 600, 0, 0, 700, 600);

    const recognizedText = (await Tesseract.recognize(personalDataCanvas.toBuffer(), "deu", {})).data.text;
    return recognizedText.trim();
}

/**
 * Extracts personal information from the ticket.
 * @param canvas PDF canvas
 */
async function analyzeText(canvas: Canvas.Canvas): Promise<IPersonalData> {
    const personalDataCanvas = Canvas.createCanvas(450.0, 500.0);
    const context = personalDataCanvas.getContext("2d");
    context.drawImage(canvas, 200.0, 265.0, 700, 600, 0, 0, 700, 600);

    context.beginPath();
    context.rect(225, 0, 225, 20);
    context.fillStyle = 'white';
    context.fill();

    const recognizedText = (await Tesseract.recognize(personalDataCanvas.toBuffer(), "deu", {})).data.text;
    let valuePairs: any = {};
    const lines = recognizedText
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line).join(" ");

    const dateMatcher = /\d{2,2}\.\d{2,2}\.\d{4,4}/g;
    const schoolMatcher = /Hoch\w{1,10}:\s{0,}(.*?)\s{0,}Vor/i;
    const nameMatcher = /Nach\w{1,10}:\s{0,}(.*?)\s{0,}\d/i;
    const birthdateMatcher = /(\d{2,2}\.\d{2,2}\.\d{4,4}\s{1,4}\w)\s{0,10}Mat/i;
    const matriculationNumberMatcher = /Matr\w{1,10}:\s{0,4}(\d{6})/i;
    const validityAreaMatcher = /Geltu\w{1,10}:\s{0,4}(.*?)\s{0,4}Hoc/i;

    const dates = lines.match(dateMatcher)!;
    const schoolName = lines.match(schoolMatcher)![1];
    const name = lines.match(nameMatcher)![1];
    const birthdate = lines.match(birthdateMatcher)![1];
    const matriculationNumber = parseInt(lines.match(matriculationNumberMatcher)![1]);
    const validityArea = lines.match(validityAreaMatcher)![1];
    return { semester: { begin: parseDate(dates[0]), end: parseDate(dates[1]) }, validityArea, school: schoolName, name, birthdate, matriculationNumber };
    // return text;
}

function convertByteArrayToBoolArray(byteArr: Uint8Array): boolean[] {
    const bits = Array.from(byteArr).map((octet) => {
        const bits = [];
        for (var i = 7; i >= 0; i--) {
            const bit = octet & (1 << i) ? true : false;
            bits.push(bit);
        }
        return bits;
    });
    return ([] as boolean[]).concat.apply([], bits);
}

/**
 * Reads a code of given length and at given index in an array of bits
 * @param rawbits 
 * @param startIndex 
 * @param length 
 */
function readCode(rawbits: boolean[], startIndex: number, length: number): number {
    let res = 0;
    for (let i = startIndex; i < startIndex + length; i++) {
        res <<= 1;
        if (rawbits[i]) {
            res |= 0x01;
        }
    }
    return res;
}

function getCharacter(table: Table, code: number): string {
    switch (table) {
        case Table.UPPER:
            return UPPER_TABLE[code];
        case Table.LOWER:
            return LOWER_TABLE[code];
        case Table.MIXED:
            return MIXED_TABLE[code];
        case Table.PUNCT:
            return PUNCT_TABLE[code];
        case Table.DIGIT:
            return DIGIT_TABLE[code];
        default:
            // Should not reach here.
            throw new IllegalStateException("Bad table");
    }
}

function getTable(t: string): Table {
    switch (t) {
        case 'L':
            return Table.LOWER;
        case 'P':
            return Table.PUNCT;
        case 'M':
            return Table.MIXED;
        case 'D':
            return Table.DIGIT;
        case 'B':
            return Table.BINARY;
        case 'U':
        default:
            return Table.UPPER;
    }
}

function getEncodedData(correctedBits: boolean[]) {
    const endIndex = correctedBits.length;
    let latchTable: Table = Table.UPPER; // table most recently latched to
    let shiftTable: Table = Table.UPPER; // table to use for the next read
    let result = "";
    let index = 0;
    while (index < endIndex) {
        if (shiftTable == Table.BINARY) {
            if (endIndex - index < 5) {
                break;
            }
            let length = readCode(correctedBits, index, 5);
            index += 5;
            if (length == 0) {
                if (endIndex - index < 11) {
                    break;
                }
                length = readCode(correctedBits, index, 11) + 31;
                index += 11;
            }
            for (let charCount = 0; charCount < length; charCount++) {
                if (endIndex - index < 8) {
                    index = endIndex;  // Force outer loop to exit
                    break;
                }
                let code = readCode(correctedBits, index, 8);
                result += String.fromCharCode(code);
                index += 8;
            }
            // Go back to whatever mode we had been in
            shiftTable = latchTable;
        } else {
            let size = shiftTable == Table.DIGIT ? 4 : 5;
            if (endIndex - index < size) {
                break;
            }
            let code = readCode(correctedBits, index, size);
            index += size;
            const str = getCharacter(shiftTable, code);
            if (str.startsWith("CTRL_")) {
                // Table changes
                // ISO/IEC 24778:2008 prescribes ending a shift sequence in the mode from which it was invoked.
                // That's including when that mode is a shift.
                // Our test case dlusbs.png for issue #642 exercises that.
                latchTable = shiftTable;  // Latch the current mode, so as to return to Upper after U/S B/S
                shiftTable = getTable(str.charAt(5));
                if (str.charAt(6) == 'L') {
                    latchTable = shiftTable;
                }
            } else {
                result += str;
                // Go back to whatever mode we had been in
                shiftTable = latchTable;
            }
        }
    }
    return result;
}

/**
 * Extracts the Aztec code from the provided PDF file.
 * @param pdf buffer containing the raw PDF information
 */
export async function extractCode(pdf: Buffer): Promise<{ barcode: string, personalInfo: IPersonalData, serialNumber: string }> {
    const pdfCanvas = await convertImage(pdf);
    const canvas = await pdfToAztecCode(pdfCanvas);

    const lowscaleCanvas = await convertImage(pdf, 3.0);
    const personalInfo = analyzeText(lowscaleCanvas);
    const serialNumber = extractSerialNumber(lowscaleCanvas);

    const reader = new AztecCodeReader();
    const luminanceSource = new HTMLCanvasElementLuminanceSource(canvas as any);
    const binaryBitmap = new BinaryBitmap(new HybridBinarizer(luminanceSource));
    const res = reader.decode(binaryBitmap);

    const bytes = res.getRawBytes();
    const bits = convertByteArrayToBoolArray(bytes);
    const result = getEncodedData(bits);

    return { barcode: result, personalInfo: await personalInfo, serialNumber: await serialNumber };
}

async function pdfToAztecCode(canvas: Canvas.Canvas): Promise<Canvas.Canvas> {
    const widthAndHeight = 1360 / 1.0;
    const newCanvas = Canvas.createCanvas(widthAndHeight, widthAndHeight);
    const context = newCanvas.getContext("2d");
    context.drawImage(canvas, 2722 / 1.0, 1191 / 1.0, widthAndHeight, widthAndHeight, 0, 0, widthAndHeight, widthAndHeight);
    return newCanvas;
}

async function convertImage(pdf: Buffer, scale: number = 12.0, canvasHeight: number = -1, canvasWidth: number = -1): Promise<Canvas.Canvas> {
    // Read the PDF file into a typed array so PDF.js can load it.
    var rawData = new Uint8Array(pdf);

    // Load the PDF file.
    var loadingTask = pdfjsLib.getDocument(rawData);
    const pdfDocument = await loadingTask.promise;

    // Get the first page.
    const page = await pdfDocument.getPage(1);
    // Render the page on a Node canvas with 100% scale.
    const viewport = page.getViewport({ scale });
    const canvasFactory = new NodeCanvasFactory();
    const canvasAndContext = canvasFactory.create(
        canvasWidth > -1 ? canvasWidth : viewport.width,
        canvasHeight > -1 ? canvasHeight : viewport.height
    );
    var renderContext = {
        canvasContext: canvasAndContext.context,
        viewport: viewport,
        canvasFactory: canvasFactory,
    };

    var renderTask = page.render(renderContext);
    await renderTask.promise;
    // Convert the canvas to an image buffer.
    return canvasAndContext.canvas;
}