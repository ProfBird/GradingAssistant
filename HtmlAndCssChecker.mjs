import fs from "fs";
import path from "path";
import csv from "csv-parser";
import os from "os";
import fetch, { FormData } from "node-fetch";
import { JSDOM } from "jsdom";
import {Checker} from "./Checker.mjs";

const minMsBetweenCssRequests = 1000;  // the CSS validator service rejects bursts of requests
let lastCssRequest = 0;

/** HtmlAndCssChecker class
* This class is used to check HTML and CSS requirements.
*/
export class HtmlAndCssChecker extends Checker {
    /**  Constructor for HtmlAndCssChecker class
     * @param {Buffer} requirementsFileBuffer - Returned by fs.readFileSync
     */
    constructor(requirementsFileBuffer) {
        super();
        this.loadRequirements(requirementsFileBuffer);
    }

    /**
  * Object to hold the HTML and CSS requirements.
  * @property {Array<string>} requiredElements1 - Required HTML elements for part 1.
  * @property {Array<string>} requiredElements2 - Required HTML elements for part 2.
  * @property {Array<string>} requiredCssSelectors - Required CSS selectors (global scope).
  * @property {Array<string>} requiredCssProperties - Required CSS properties (global scope).
  * @property {Array<string>} regExpForHTML1 - Regular expressions to check against the HTML.
  * @property {Array<string>} regExpForHTML1Description - Descriptions of the regular expressions for the HTML.
  * @property {Array<string>} regExpForCSS1 - Regular expressions to check against the CSS.
  * @property {Array<string>} regExpForCSS1Description - Descriptions of the regular expressions for the CSS.
  * @property {Array<string>} additionalRequirements - Additional requirements.
  */
    requirements = {
        // Required HTML elements for parts 1 and 2 (global scope)
        requiredElements1: [],
        requiredElements2: [],
        // Required CSS selectors and properties (global scope)
        requiredCssSelectors: [],
        requiredCssProperties: [],
        additionalRequirements: [],
        // Parallel arrays
        // TODO: Change from parallel arrays to an array of objects
        regExpForHTML1: [],
        regExpForHTML1Description: [],
        regExpForCSS1: [],
        regExpForCSS1Description: []
    };

    // Indexes into the additionalRequirements array:
    // 0 Required special file name, like index.html
    // 1 Number of html files expected in the lab submission
    // 2 Number of css files expected in the lab submission
    // 3 Validate the html files: false, true (default validator), or a validator name (html-validate, w3c, vnu)
    // 4 Validate the css files, true or false
    // 5 Minimum number of css rules in the external and embedded css (optional)
    // 6 Minimum number of distinct css properties in the external and embedded css (optional). Blank cells are skipped, so use 0 in 5 to set only 6

    // Methods

    /** loadRequirements method
     * Load requirements for checking HTML and CSS files.
     * @param {BUFFER} fileBuffer 
     */
    loadRequirements(fileBuffer) {
            csv()  // the .on function sets up lisetners
                .on("data", (row) =>    // row is an object containing the data from one row of the csv file
                {
                    if (row.requiredElements1) {
                        this.requirements.requiredElements1.push(row.requiredElements1);
                    }
                    if (row.requiredElements2) {
                        this.requirements.requiredElements2.push(row.requiredElements2);
                    }
                    if (row.requiredCssSelectors) {
                        this.requirements.requiredCssSelectors.push(row.requiredCssSelectors);
                    }
                    if (row.requiredCssProperties) {
                        // remove whitespace
                        row.requiredCssProperties = row.requiredCssProperties.replace(/\s/g, "");
                        this.requirements.requiredCssProperties.push(row.requiredCssProperties);
                    }
                    if (row.moreRequirements) {
                        this.requirements.additionalRequirements.push(row.moreRequirements);
                    }
                    if (row.regExpForHTML1) {
                        this.requirements.regExpForHTML1.push(row.regExpForHTML1);
                    }
                    if (row.regExpForHTML1Description) {
                        this.requirements.regExpForHTML1Description.push(row.regExpForHTML1Description);
                    }
                    if (row.regExpForCSS1) {
                        this.requirements.regExpForCSS1.push(row.regExpForCSS1);
                    }
                    if (row.regExpForCSS1Description) {
                        this.requirements.regExpForCSS1Description.push(row.regExpForCSS1Description);
                    }
                })
                .on("error", (error) => {
                    console.error(error);
                })
                .end(fileBuffer);  // this sends data to the csv parser. end() also parses a last row that has no trailing newline
    } // End of loadRequirements method

    /** isCssValidationOn method
     * Convert the "Validate CSS" value from the requirements file to a boolean.
     * @param {string|undefined} value - "true" or "false" (case-insensitive). Missing means false.
     * @returns {boolean}
     */
    static isCssValidationOn(value) {
        return String(value ?? "").trim().toLowerCase() === "true";
    }

    /**
     * Validate the CSS syntax using the W3C validator.
     * The CSS is sent in the body of a POST request, so characters like # & + % and long files are fine.
     * @param {string} fileContents - The CSS
     * @param {string} fileName - Name of the file, used in the report
     * @returns {Promise<string>} A report. Never throws; problems running the validator are reported.
     */
    static async validateCSS(fileContents, fileName) {
        let report = ""; // All messages for this file

        try {
            // The service rejects bursts of requests
            const wait = lastCssRequest + minMsBetweenCssRequests - Date.now();
            if (wait > 0) {
                await new Promise((resolve) => setTimeout(resolve, wait));
            }
            lastCssRequest = Date.now();

            const form = new FormData();
            form.set("profile", "css3");
            form.set("output", "soap12");
            form.set("text", fileContents);
            const response = await fetch("https://jigsaw.w3.org/css-validator/validator", {
                method: "POST",
                body: form,
            });
            if (!response.ok) {
                throw new Error(`the W3C CSS validator returned status ${response.status}`);
            }
            const xmlText = await response.text();
            const dom = new JSDOM(xmlText, { contentType: "text/xml" });
            const messages = dom.window.document.getElementsByTagName("m:error");
            if (messages.length === 0) {
                report += `No errors found in ${fileName}\n`;
            } else {
                for (const message of messages) {
                    const messageText = message.textContent.trim();
                    report += `${fileName}: ${messageText}\n`;
                }
                report += os.EOL; // add a blank line after the errors
            }
        } catch (error) {
            const message = `Could not validate ${fileName} with the W3C CSS validator: ${error.message}`;
            console.error(message);
            report += message + "\n";
        }
        return report;
    } // End of validateCSS method
}
