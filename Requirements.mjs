import fs from "fs";
import csv from "csv-parser";
import { resolveHtmlValidatorSetting, htmlValidatorNames } from "./HtmlValidators.mjs";

/* Reads a requirements .csv file into one object with named fields.
   This is the only place that knows the names of the csv columns and the positions
   of the values in the settings and moreRequirements columns.
   (The deprecated JsChecker still reads its own two columns.) */

/** @typedef {{selector: string, minimum: number}} RequiredElement
 * A required element (a CSS selector, like "a[href]") and the minimum number of matches
 * in all of a student's files. */

/** @typedef {{pattern: string, description: string}} RegExpSearch
 * A regular expression to search for and the description used in the report. */

/** @typedef {Object} Settings - From the settings column, by position
 * @property {string|undefined} macSubmissionsPath - 0: Mac OS (and other systems) submissions path
 * @property {string|undefined} windowsSubmissionsPath - 1: Windows submissions path
 * @property {number} numberOfParts - 2: Number of lab parts (default 1)
 * @property {string|undefined} labName - 3: Lab name
 * @property {boolean} areAllInOneDir - 4: Are all lab parts in one folder? (default true)
 * @property {boolean} checkHtml - 5: Check the HTML and CSS files (default false)
 * @property {boolean} checkCss - 6: Check CSS files (default false, not used yet)
 * @property {boolean} checkJavaScript - 7: Check JavaScript files (default false)
 */

/** @typedef {Object} MoreRequirements - From the moreRequirements column, by position
 * @property {string|null} specialFileName - 0: Required file name, like index (null if none, or "")
 * @property {number|null} htmlFileCount - 1: Number of HTML files expected (null for no check)
 * @property {number|null} cssFileCount - 2: Number of CSS files expected (null for no check)
 * @property {string|null} htmlValidator - 3: false, true (default validator) or a validator name.
 *   Holds the validator name, or null to not validate.
 * @property {boolean} validateCss - 4: Validate the CSS files: true or false (blank means false)
 * @property {number|null} minCssRules - 5: Minimum number of css rules in the external and embedded css (optional)
 * @property {number|null} minCssProperties - 6: Minimum number of distinct css properties in the external
 *   and embedded css (optional). Empty cells are skipped, so use 0 in 5 to set only 6.
 * @property {number} valueCount - How many values the column has. 0 means there are no additional requirements.
 */

/** @typedef {Object} Requirements
 * @property {Settings} settings
 * @property {MoreRequirements} moreRequirements
 * @property {Array<RequiredElement>} requiredElements1 - Part 1 elements (requiredElements1 and number1 columns)
 * @property {Array<RequiredElement>} requiredElements2 - Part 2 and later elements (requiredElements2 and number2 columns)
 * @property {Array<string>} requiredCssSelectors - Required CSS selectors
 * @property {Array<string>} requiredCssProperties - Required CSS properties, with the whitespace removed
 * @property {Array<RegExpSearch>} htmlRegExps - regExpForHTML1 and regExpForHTML1Description columns
 * @property {Array<RegExpSearch>} cssRegExps - regExpForCSS1 and regExpForCSS1Description columns
 * @property {Array<string>} warnings - Problems found in the file, for the program to display
 */

/** Columns the program reads */
const knownColumns = [
    "settings", "moreRequirements",
    "requiredElements1", "number1", "requiredElements2", "number2",
    "requiredCssSelectors", "requiredCssProperties",
    "regExpForHTML1", "regExpForHTML1Description", "regExpForCSS1", "regExpForCSS1Description",
    "unitTests", "filesToTest",  // read by the deprecated JsChecker
];

/** Notes for the person reading the file. Columns ending in Description are notes too. */
const noteColumns = ["line", "Notes"];

/** readRequirementsFile function
 * Read and parse a requirements file.
 * @param {string} filePath - Path to the csv requirements file
 * @returns {Requirements}
 * @throws {Error} If the file can't be read
 */
export function readRequirementsFile(filePath) {
    return parseRequirements(fs.readFileSync(filePath), filePath);
}

/** parseRequirements function
 * Parse the contents of a requirements file.
 * @param {Buffer|string} contents - The csv text
 * @param {string} [fileName] - Used in the warnings
 * @returns {Requirements}
 */
export function parseRequirements(contents, fileName = "the requirements file") {
    const { headers, rows } = parseCsv(contents);
    const requirements = makeRequirements();
    const { warnings } = requirements;

    const unknown = headers.filter((header) => header.trim() !== ""
        && !knownColumns.includes(header)
        && !noteColumns.includes(header)
        && !/Description$/i.test(header));
    for (const header of unknown) {
        warnings.push(`Warning: ${fileName} has a column named "${header}" that this program does not use. Its values are ignored.`);
    }

    // The settings and moreRequirements values are read by position. Empty cells are skipped.
    const settingValues = [];
    const moreValues = [];
    for (const row of rows) {
        if (row.settings) {
            settingValues.push(row.settings);
        }
        if (row.moreRequirements) {
            moreValues.push(row.moreRequirements);
        }
        // An element's minimum and a regular expression's description are read from the same row,
        // so a blank cell can't shift the numbers or descriptions
        if (row.requiredElements1) {
            requirements.requiredElements1.push({ selector: row.requiredElements1, minimum: parseMinimum(row.number1) });
        }
        if (row.requiredElements2) {
            requirements.requiredElements2.push({ selector: row.requiredElements2, minimum: parseMinimum(row.number2) });
        }
        if (row.requiredCssSelectors) {
            requirements.requiredCssSelectors.push(row.requiredCssSelectors);
        }
        if (row.requiredCssProperties) {
            requirements.requiredCssProperties.push(row.requiredCssProperties.replace(/\s/g, ""));
        }
        if (row.regExpForHTML1) {
            requirements.htmlRegExps.push(makeRegExpSearch(row.regExpForHTML1, row.regExpForHTML1Description));
        }
        if (row.regExpForCSS1) {
            requirements.cssRegExps.push(makeRegExpSearch(row.regExpForCSS1, row.regExpForCSS1Description));
        }
    }

    if (settingValues.length < 8) {
        warnings.push(`Warning: ${fileName} has ${settingValues.length} of the 8 expected values in its settings column. Defaults will be used for the missing ones.`);
    }
    const parts = parseInt(settingValues[2], 10);
    requirements.settings = {
        macSubmissionsPath: settingValues[0],
        windowsSubmissionsPath: settingValues[1],
        numberOfParts: Number.isNaN(parts) ? 1 : parts,
        labName: settingValues[3],
        areAllInOneDir: parseBoolean(settingValues[4], true),
        checkHtml: parseBoolean(settingValues[5], false),
        checkCss: parseBoolean(settingValues[6], false),
        checkJavaScript: parseBoolean(settingValues[7], false),
    };

    // "" in the first position is a placeholder for no special file name
    const specialFileName = moreValues[0] === '""' ? "" : moreValues[0];
    const readCount = (position, name) => {
        const value = moreValues[position];
        const number = parseInt(value, 10);
        if (value !== undefined && Number.isNaN(number)) {
            warnings.push(`Warning: ${fileName} has "${value}" for "${name}" (position ${position} of moreRequirements), which is not a number. It is ignored.`);
        }
        return Number.isNaN(number) ? null : number;
    };
    requirements.moreRequirements = {
        specialFileName: specialFileName ? specialFileName : null,
        htmlFileCount: readCount(1, "Number of HTML files"),
        cssFileCount: readCount(2, "Number of CSS files"),
        htmlValidator: resolveHtmlValidatorSetting(moreValues[3]),
        validateCss: parseBoolean(moreValues[4], false),
        minCssRules: readCount(5, "Minimum number of CSS rules"),
        minCssProperties: readCount(6, "Minimum number of distinct CSS properties"),
        valueCount: moreValues.length,
    };
    const { htmlValidator } = requirements.moreRequirements;
    if (htmlValidator !== null && !htmlValidatorNames.includes(htmlValidator)) {
        warnings.push(`Warning: ${fileName} asks for an HTML validator named "${moreValues[3]}". Use false, true, or one of: ${htmlValidatorNames.join(", ")}`);
    }
    return requirements;
}

/** makeRequirements function
 * Requirements with nothing required, with any of the fields replaced.
 * Used by parseRequirements, and by tests to build requirements without a csv file.
 * @param {Object} [changes] - Fields to replace. settings and moreRequirements can be partial.
 * @returns {Requirements}
 */
export function makeRequirements(changes = {}) {
    const { settings = {}, moreRequirements = {}, ...otherChanges } = changes;
    return {
        requiredElements1: [],
        requiredElements2: [],
        requiredCssSelectors: [],
        requiredCssProperties: [],
        htmlRegExps: [],
        cssRegExps: [],
        warnings: [],
        ...otherChanges,
        settings: {
            macSubmissionsPath: undefined,
            windowsSubmissionsPath: undefined,
            numberOfParts: 1,
            labName: undefined,
            areAllInOneDir: true,
            checkHtml: false,
            checkCss: false,
            checkJavaScript: false,
            ...settings,
        },
        moreRequirements: {
            specialFileName: null,
            htmlFileCount: null,
            cssFileCount: null,
            htmlValidator: null,
            validateCss: false,
            minCssRules: null,
            minCssProperties: null,
            valueCount: 0,
            ...moreRequirements,
        },
    };
}

/** parseBoolean function
 * Convert a "true"/"false" string from the csv file to a boolean
 * @param {string|undefined} value - The text from the csv file (case-insensitive)
 * @param {boolean} defaultValue - Returned if value is missing or empty
 * @returns {boolean}
 */
export function parseBoolean(value, defaultValue) {
    if (value === undefined || value === null || String(value).trim() === "") {
        return defaultValue;
    }
    return String(value).trim().toLowerCase() === "true";
}

/** parseMinimum function
 * Convert a value from the number1 or number2 column to the minimum number of an element.
 * @param {string|undefined} value - The text from the csv file
 * @returns {number} The number, or 1 if the value is blank or not a number
 */
export function parseMinimum(value) {
    const minimum = parseInt(value, 10);
    return Number.isNaN(minimum) ? 1 : minimum;
}

/** makeRegExpSearch function
 * @param {string} pattern
 * @param {string|undefined} description - Falls back to showing the pattern
 * @returns {RegExpSearch}
 */
function makeRegExpSearch(pattern, description) {
    return { pattern, description: description ? description : `a match for /${pattern}/` };
}

/** parseCsv function
 * @param {Buffer|string} contents
 * @returns {{headers: Array<string>, rows: Array<Object>}}
 */
function parseCsv(contents) {
    // csv-parser modifies the buffer it is given (when it un-escapes ""), so give it a copy.
    // A file saved by Excel may start with a byte order mark, which would become part of the first column name.
    const text = Buffer.from(contents).toString("utf8").replace(/^﻿/, "");
    let headers = [];
    const rows = [];
    let parseError = null;
    csv()  // the .on function sets up listeners
        .on("headers", (headerList) => { headers = headerList; })
        .on("data", (row) => rows.push(row))  // row is an object containing the data from one row of the csv file
        .on("error", (error) => { parseError = error; })
        .end(Buffer.from(text));  // end() parses all the rows now, including a last row that has no trailing newline
    if (parseError) {
        throw parseError;
    }
    return { headers, rows };
}
