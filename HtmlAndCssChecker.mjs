import os from "os";
import fetch, { FormData } from "node-fetch";
import { JSDOM } from "jsdom";
import {Checker} from "./Checker.mjs";

const cssValidatorUrl = "https://jigsaw.w3.org/css-validator/validator";
const minMsBetweenCssRequests = 1000;  // the CSS validator service rejects bursts of requests
let lastCssRequest = 0;

/** HtmlAndCssChecker class
* This class is used to check HTML and CSS requirements.
*/
export class HtmlAndCssChecker extends Checker {
    /**  Constructor for HtmlAndCssChecker class
     * @param {import("./Requirements.mjs").Requirements} requirements - Returned by readRequirementsFile
     */
    constructor(requirements) {
        super();
        /** The requirements to check the HTML and CSS files against */
        this.requirements = requirements;
    }

    /**
     * Validate the CSS syntax using the W3C validator.
     * The CSS is sent in the body of a POST request, so characters like # & + % and long files are fine.
     * @param {string} fileContents - The CSS
     * @param {string} fileName - Name of the file, used in the report
     * @param {string} [validatorUrl] - Address of the validator service (a different one is used by the tests)
     * @returns {Promise<string>} A report. Never throws; problems running the validator are reported.
     */
    static async validateCSS(fileContents, fileName, validatorUrl = cssValidatorUrl) {
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
            const response = await fetch(validatorUrl, {
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
