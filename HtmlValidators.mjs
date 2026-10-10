import os from "os";
import { spawn } from "child_process";
import { createRequire } from "module";
import fetch from "node-fetch";

/* Pluggable HTML validators.
   The validator is chosen with the "Validate HTML" value in the moreRequirements column
   of the requirements csv file (see resolveHtmlValidatorSetting):
     false          don't validate HTML
     true           use the default validator (html-validate)
     html-validate  html-validate npm package: local, fast, no network or Java needed
     w3c            the W3C validator web service (network; it rate limits bulk checks)
     vnu            the W3C Nu validator, vnu.jar, run locally (needs Java 17 or newer)
*/

export const defaultHtmlValidator = "html-validate";

/** @typedef {{severity: "error"|"warning"|"info", line: number, column: number, message: string}} ValidationMessage */

/** Functions that take the html and return an array of ValidationMessage.
 * They throw an Error if the validation could not be done.
 * @type {Object<string, function(string): Promise<Array<ValidationMessage>>>}
 */
const validators = {
    "html-validate": validateWithHtmlValidate,
    "w3c": validateWithW3c,
    "vnu": validateWithVnu,
};

export const htmlValidatorNames = Object.keys(validators);

/** resolveHtmlValidatorSetting function
 * Convert the "Validate HTML" value from the requirements file into a validator name.
 * @param {string|undefined} value - "true", "false", or the name of a validator (case-insensitive)
 * @returns {string|null} The validator name, or null if HTML should not be validated.
 */
export function resolveHtmlValidatorSetting(value) {
    const setting = String(value ?? "").trim().toLowerCase();
    if (setting === "" || setting === "false") {
        return null;
    }
    if (setting === "true") {
        return defaultHtmlValidator;
    }
    return setting;  // validateHtml reports an unknown name
}

/** validateHtml function
 * Validate HTML with the named validator and return a report.
 * @param {string} fileContents - The HTML
 * @param {string} fileName - Name of the file, used in the report
 * @param {string} [validatorName] - One of htmlValidatorNames
 * @returns {Promise<string>} A report. Never throws; problems running the validator are reported.
 */
export async function validateHtml(fileContents, fileName, validatorName = defaultHtmlValidator) {
    const validator = validators[validatorName];
    if (!validator) {
        const message = `Unknown HTML validator "${validatorName}". Use one of: ${htmlValidatorNames.join(", ")}`;
        console.error(message);
        return message + "\n";
    }
    try {
        const messages = await validator(fileContents);
        return formatMessages(messages, fileName);
    } catch (error) {
        const message = `Could not validate ${fileName} with ${validatorName}: ${error.message}`;
        console.error(message);
        return message + "\n";
    }
}

/** formatMessages function
 * @param {Array<ValidationMessage>} messages
 * @param {string} fileName
 * @returns {string}
 */
export function formatMessages(messages, fileName) {
    if (messages.length === 0) {
        return `No errors found in ${fileName}\n`;
    }
    let report = "";
    for (const m of messages) {
        const message = `${m.severity} found on line ${m.line} column ${m.column}: ${m.message}`;
        console.log(message);
        report += message + "\n";
    }
    return report + os.EOL;  // blank line after the errors
}

/*************** html-validate ***************/

let htmlValidateInstance = null;

async function validateWithHtmlValidate(html) {
    if (htmlValidateInstance === null) {
        const { HtmlValidate } = await import("html-validate");
        // "standard" has the rules that matter for correct HTML without style-only nitpicks
        htmlValidateInstance = new HtmlValidate({ extends: ["html-validate:standard"] });
    }
    const report = await htmlValidateInstance.validateString(html);
    const messages = report.results.flatMap((result) => result.messages);
    return messages.map((m) => ({
        severity: m.severity === 2 ? "error" : "warning",
        line: m.line,
        column: m.column,
        message: `${m.message} (${m.ruleId})`,
    }));
}

/*************** W3C web service ***************/

const minMsBetweenW3cRequests = 1000;  // the service rejects bursts of requests
let lastW3cRequest = 0;

async function validateWithW3c(html) {
    const maxAttempts = 4;
    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const wait = lastW3cRequest + minMsBetweenW3cRequests - Date.now();
            if (wait > 0) {
                await new Promise((resolve) => setTimeout(resolve, wait));
            }
            lastW3cRequest = Date.now();

            const response = await fetch("https://validator.w3.org/nu/?out=json", {
                method: "POST",
                headers: {
                    "Content-Type": "text/html; charset=utf-8",
                    "User-Agent": "GradingAssistant (student lab checker)",
                },
                body: html,
            });
            // When the service is busy it returns an error status and an HTML page, not JSON
            if (!response.ok) {
                throw new Error(`the W3C validator returned status ${response.status}`);
            }
            const { messages } = await response.json();
            return messages.map(fromNuMessage);
        } catch (error) {
            lastError = error;
            if (attempt < maxAttempts) {
                await new Promise((resolve) => setTimeout(resolve, 3000 * attempt));
            }
        }
    }
    throw lastError;
}

/*************** vnu.jar (run locally, needs Java) ***************/

function validateWithVnu(html) {
    return new Promise((resolve, reject) => {
        const require = createRequire(import.meta.url);
        const vnuJarPath = String(require("vnu-jar"));
        // --stdout: write the report to stdout, "-": read the html from stdin
        const child = spawn("java", ["-jar", vnuJarPath, "--stdout", "--format", "json", "-"]);
        let output = "";
        let errorOutput = "";
        child.stdout.on("data", (data) => (output += data));
        child.stderr.on("data", (data) => (errorOutput += data));
        child.on("error", (error) => {
            reject(new Error(error.code === "ENOENT" ? "Java is not installed (vnu.jar needs Java 17 or newer)" : error.message));
        });
        child.on("close", () => {
            try {
                // vnu exits with a non-zero code when it finds errors, so look at the output instead
                resolve(JSON.parse(output).messages.map(fromNuMessage));
            } catch {
                if (errorOutput.includes("UnsupportedClassVersionError")) {
                    reject(new Error("this version of vnu.jar needs Java 17 or newer"));
                } else {
                    reject(new Error(errorOutput.trim().split("\n")[0] || "vnu.jar produced no report"));
                }
            }
        });
        child.stdin.on("error", () => { });  // the "close" handler reports the problem
        child.stdin.end(html);
    });
}

/** Convert a message from the Nu validator (W3C service or vnu.jar) to a ValidationMessage */
function fromNuMessage(m) {
    return {
        severity: m.type === "error" ? "error" : (m.subType === "warning" ? "warning" : "info"),
        line: m.lastLine ?? m.firstLine,
        column: m.lastColumn ?? m.firstColumn,
        message: m.message,
    };
}
