import fs from "fs";
import path from "path";
import { JSDOM } from "jsdom";
import { isJunk } from "./SubmissionFolders.mjs";
import { parseStylesheet, parseInlineStyle } from "./CssParser.mjs";
import { makeHtmlAndCssChecks } from "./HtmlAndCssChecks.mjs";

/* Checks the HTML and CSS files of one part of a student's lab and makes the report.
   runChecks reads each file once and gives it to every check (see HtmlAndCssChecks.mjs),
   then collects each check's summary. formatReport turns those results into the text
   that goes in the student's report file. */

/** @typedef {import("./HtmlAndCssChecks.mjs").CheckResult} CheckResult */
/** @typedef {import("./HtmlAndCssChecks.mjs").CheckSection} CheckSection */

/** @typedef {Object} SubmissionResults - Everything the checks found for one part of a lab
 * @property {Array<{relativePath: string, results: Array<CheckResult>}>} files - Each HTML and
 *   CSS file, in the order checked, with the results about that file
 * @property {Array<CheckSection>} sections - The summary of each check that has something to report
 */

/********* This is the central function for this program! **********
* checkSubmission function
* Checks one part of the lab assignment: the HTML and CSS files in the lab folder
* and all its sub-folders, against the requirements.
* @param {string} labDirPath - The path to the lab folder or lab part subfolder.
* @param {number} labPart - The lab part number.
* @param {import("./Requirements.mjs").Requirements} requirements - The requirements to check against,
*   from readRequirementsFile (or makeRequirements in the tests).
* @returns {Promise<string>} The report
*/
// TODO: move all the html and css checks to the HtmlAndCssChecker class
async function checkSubmission(labDirPath, labPart, requirements) {
    return formatReport(await runChecks(labDirPath, labPart, requirements));
}

/** runChecks function
 * Run all the HTML and CSS checks on one part of a lab.
 * @param {string} labDirPath - The path to the lab folder or lab part subfolder.
 * @param {number} labPart - The lab part number.
 * @param {import("./Requirements.mjs").Requirements} requirements
 * @returns {Promise<SubmissionResults>}
 */
async function runChecks(labDirPath, labPart, requirements) {
    // New checks for each run, so nothing found in one student's files carries over to the next
    const checks = makeHtmlAndCssChecks(requirements, labPart);
    const files = [];
    // One file at a time, so the results stay in order and the validators' requests are spaced out
    for (const filePath of listLabFiles(labDirPath)) {
        const relativePath = path.relative(labDirPath, filePath);
        const file = readLabFile(relativePath, filePath);
        const results = [];
        if (file === null) {
            // An empty file is reported, and none of the checks look at it
            results.push({ check: "files", passed: null, message: `File ${relativePath} is empty` });
        } else {
            for (const check of checks) {
                results.push(...await check.checkFile(file));
            }
            file.dom?.window.close();
        }
        files.push({ relativePath, results });
    }
    const sections = checks.map((check) => check.summarize()).filter((section) => section !== null);
    return { files, sections };
}

/** formatReport function
 * Turn the results into the text of the report.
 * @param {SubmissionResults} submissionResults
 * @returns {string}
 */
function formatReport({ files, sections }) {
    let report = "";
    for (const { relativePath, results } of files) {
        report += `Checking the ${relativePath} file\n`;
        for (const result of results) {
            report += result.message + "\n";
        }
    }
    for (const section of sections) {
        report += formatSection(section);
    }
    return report;
}

/** formatSection function
 * The report text for one check's summary: its heading, then the failures (with a count line
 * if the check has one), or a message that everything passed.
 * @param {CheckSection} section
 * @returns {string}
 */
function formatSection({ heading, results, failureCountLabel, allPassedMessage }) {
    let text = heading === null ? "" : heading + "\n";
    const failures = results.filter((result) => result.passed === false);
    if (failures.length === 0) {
        return text + allPassedMessage + "\n";
    }
    if (failureCountLabel !== null) {
        text += `Missing ${failures.length} ${failureCountLabel}\n`;
    }
    for (const failure of failures) {
        text += failure.message + "\n";
    }
    return text;
}

/** listLabFiles function
 * The HTML and CSS files in a folder and all its sub-folders, skipping junk
 * like __MACOSX, ._index.html and .git, which are not the student's work.
 * @param {string} dir
 * @returns {Array<string>} Full paths
 */
function listLabFiles(dir) {
    const files = [];
    for (const dirent of fs.readdirSync(dir, { withFileTypes: true }).filter((entry) => !isJunk(entry))) {
        const fullPath = path.join(dir, dirent.name);
        if (dirent.isDirectory()) {
            files.push(...listLabFiles(fullPath));
        } else if (/\.(html?|css)$/i.test(dirent.name)) {
            files.push(fullPath);
        }
    }
    return files;
}

/** readLabFile function
 * Read and parse one HTML or CSS file for the checks.
 * @param {string} relativePath - Path from the lab folder, used in the report
 * @param {string} filePath - Full path to the file
 * @returns {import("./HtmlAndCssChecks.mjs").LabFile|null} null if the file is empty
 */
function readLabFile(relativePath, filePath) {
    const contents = fs.readFileSync(filePath, "utf8");
    if (contents === "") {
        return null;
    }
    if (!/\.html?$/i.test(filePath)) {
        return { relativePath, kind: "css", contents, dom: null, css: parseStylesheet(contents, "external") };
    }
    const dom = new JSDOM(contents);
    const css = { rules: [], declarations: [] };
    // The embedded css (there can be more than one style element), then the inline styles
    const parsed = [
        ...[...dom.window.document.querySelectorAll("style")].map((style) => parseStylesheet(style.textContent, "embedded")),
        ...[...dom.window.document.querySelectorAll("[style]")].map((element) => parseInlineStyle(element.getAttribute("style"))),
    ];
    for (const { rules, declarations } of parsed) {
        css.rules.push(...rules);
        css.declarations.push(...declarations);
    }
    return { relativePath, kind: "html", contents, dom, css };
}

export { checkSubmission, runChecks, formatReport };
