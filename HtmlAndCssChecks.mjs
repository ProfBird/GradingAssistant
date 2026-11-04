import path from "path";
import { HtmlAndCssChecker } from "./HtmlAndCssChecker.mjs";
import { validateHtml } from "./HtmlValidators.mjs";
import { findRequiredSelectors, findRequiredProperties } from "./CssParser.mjs";
import { regExpFlags } from "./Requirements.mjs";

/* The checks done on the HTML and CSS files of one part of a student's lab.
   Each check is an object made fresh for each part of each student (so nothing carries
   over from one student to the next) with two methods:
     checkFile(file)  Called for each non-empty file, in order. Returns results about that
                      file, like validator messages, which go under the file's name in the report.
     summarize()      Called after all the files. Returns a CheckSection with one result for
                      each requirement, or null if the check has nothing to report.
   To add a check, write a make...Check function and add it to makeHtmlAndCssChecks. */

/** @typedef {Object} CheckResult
 * @property {string} check - The name of the check that made this result
 * @property {boolean|null} passed - true or false for a requirement. null for information that
 *   is not a requirement, like validator messages.
 * @property {string} message - Text for the report. It doesn't end with a line break, but it can
 *   have several lines (validator messages).
 */

/** @typedef {Object} CheckSection - The results of one check for all of the files
 * @property {string} check - The name of the check
 * @property {string|null} heading - A line printed before the results, or null
 * @property {Array<CheckResult>} results - One for each requirement
 * @property {string|null} failureCountLabel - If not null, the failures are counted in a line
 *   like "Missing 2 required elements" (failureCountLabel is "required elements")
 * @property {string} allPassedMessage - Printed when no result failed
 */

/** @typedef {Object} LabFile - One HTML or CSS file, read and parsed by SubmissionChecker
 * @property {string} relativePath - Path from the lab folder, used in the report
 * @property {"html"|"css"} kind
 * @property {string} contents
 * @property {Object|null} dom - A JSDOM for an HTML file, otherwise null
 * @property {import("./CssParser.mjs").ParsedCss} css - The external css of a css file, or the
 *   embedded and inline css of an HTML file
 */

/** @typedef {Object} Check
 * @property {string} name
 * @property {function(LabFile): (Array<CheckResult>|Promise<Array<CheckResult>>)} checkFile
 * @property {function(): (CheckSection|null)} summarize
 */

/** makeHtmlAndCssChecks function
 * Make the checks for one part of a student's lab. The order is the order of the
 * results under each file name, and of the sections at the end of the report.
 * @param {import("./Requirements.mjs").Requirements} requirements
 * @param {number} labPart - Part 1 uses the part 1 elements; part 2 and later use the part 2 elements
 * @returns {Array<Check>}
 */
export function makeHtmlAndCssChecks(requirements, labPart) {
    const { moreRequirements } = requirements;
    return [
        makeHtmlValidationCheck(moreRequirements.htmlValidator),
        makeRequiredElementsCheck(labPart === 1 ? requirements.requiredElements1 : requirements.requiredElements2),
        makeCssValidationCheck(moreRequirements.validateCss),
        makeRequiredSelectorsCheck(requirements.requiredCssSelectors),
        makeRequiredPropertiesCheck(requirements.requiredCssProperties),
        makeAdditionalRequirementsCheck(moreRequirements),
        makeRegExpCheck("html-regexps", "html", requirements.htmlRegExps, "Regular expression searches in HTML files:"),
        makeRegExpCheck("css-regexps", "css", requirements.cssRegExps, "Regular expression searches in CSS files:"),
    ];
}

/** makeHtmlValidationCheck function
 * Validates each HTML file. The validator's messages go under the file name.
 * @param {string|null} validatorName - null to not validate
 * @returns {Check}
 */
export function makeHtmlValidationCheck(validatorName) {
    return {
        name: "html-validation",
        async checkFile(file) {
            if (file.kind !== "html" || validatorName === null) {
                return [];
            }
            const text = await validateHtml(file.contents, file.relativePath, validatorName);
            return [{ check: this.name, passed: null, message: withoutFinalLineBreak(text) }];
        },
        summarize: () => null,
    };
}

/** makeCssValidationCheck function
 * Validates each CSS file with the W3C CSS validator. Its messages go under the file name.
 * @param {boolean} validateCss
 * @returns {Check}
 */
export function makeCssValidationCheck(validateCss) {
    return {
        name: "css-validation",
        async checkFile(file) {
            if (file.kind !== "css" || !validateCss) {
                return [];
            }
            const text = await HtmlAndCssChecker.validateCSS(file.contents, file.relativePath);
            return text === "" ? [] : [{ check: this.name, passed: null, message: withoutFinalLineBreak(text) }];
        },
        summarize: () => null,
    };
}

/** makeRequiredElementsCheck function
 * Counts each required element in all the HTML files and compares the total to its minimum.
 * The section is always in the report, even when no elements are required.
 * @param {Array<import("./Requirements.mjs").RequiredElement>} requiredElements
 * @returns {Check}
 */
export function makeRequiredElementsCheck(requiredElements) {
    const name = "required-elements";
    const counts = requiredElements.map(() => 0);
    return {
        name,
        checkFile(file) {
            if (file.kind !== "html") {
                return [];
            }
            const results = [];
            requiredElements.forEach(({ selector }, i) => {
                try {
                    counts[i] += file.dom.window.document.querySelectorAll(selector).length;
                } catch {
                    const message = `Error finding ${selector} element in ${file.relativePath}`;
                    console.error(message);
                    results.push({ check: name, passed: null, message });
                }
            });
            return results;
        },
        summarize() {
            const results = requiredElements.map(({ selector, minimum }, i) => {
                const count = counts[i];
                if (count === 0 && minimum > 0) {
                    return { check: name, passed: false, message: `Missing ${selector} element` };
                }
                if (count < minimum) {
                    return { check: name, passed: false, message: `Found ${count} ${selector} elements. Expected at least ${minimum}` };
                }
                return { check: name, passed: true, message: `Found ${count} ${selector} elements` };
            });
            return { check: name, heading: null, results, failureCountLabel: "required elements",
                allPassedMessage: "All required elements found" };
        },
    };
}

/** makeRequiredSelectorsCheck function
 * Looks for the required selectors in the rules of all the external and embedded css.
 * @param {Array<string>} requiredSelectors
 * @returns {Check}
 */
export function makeRequiredSelectorsCheck(requiredSelectors) {
    const name = "required-selectors";
    const rules = [];
    return {
        name,
        checkFile(file) {
            rules.push(...file.css.rules);
            return [];
        },
        summarize() {
            if (requiredSelectors.length === 0) {
                return null;
            }
            const found = findRequiredSelectors(requiredSelectors, rules);
            const results = requiredSelectors.map((selector) => found.includes(selector)
                ? { check: name, passed: true, message: `Found ${selector} selector` }
                : { check: name, passed: false, message: `Missing ${selector} selector` });
            return { check: name, heading: null, results, failureCountLabel: "required selectors",
                allPassedMessage: "All required selectors found" };
        },
    };
}

/** makeRequiredPropertiesCheck function
 * Looks for the required properties in all the external, embedded and inline css.
 * @param {Array<string>} requiredProperties
 * @returns {Check}
 */
export function makeRequiredPropertiesCheck(requiredProperties) {
    const name = "required-properties";
    const declarations = [];
    return {
        name,
        checkFile(file) {
            declarations.push(...file.css.declarations);
            return [];
        },
        summarize() {
            if (requiredProperties.length === 0) {
                return null;
            }
            const found = findRequiredProperties(requiredProperties, declarations);
            const results = requiredProperties.map((property) => found.includes(property)
                ? { check: name, passed: true, message: `Found ${property} property` }
                : { check: name, passed: false, message: `Missing ${property} property` });
            return { check: name, heading: null, results, failureCountLabel: "required properties",
                allPassedMessage: "All required properties found" };
        },
    };
}

/** makeAdditionalRequirementsCheck function
 * The requirements in the moreRequirements column: the numbers of HTML and CSS files,
 * the special file name, and the minimum numbers of CSS rules and distinct properties.
 * @param {import("./Requirements.mjs").MoreRequirements} moreRequirements
 * @returns {Check}
 */
export function makeAdditionalRequirementsCheck(moreRequirements) {
    const found = {
        htmlFileCount: 0,
        cssFileCount: 0,
        ruleSelectors: [],
        propertyNames: [],
        specialFileFound: moreRequirements.specialFileName === null,
        wrongCaseFileNames: [],
    };
    return {
        name: "additional-requirements",
        checkFile(file) {
            if (file.kind === "html") {
                found.htmlFileCount++;
            } else {
                found.cssFileCount++;
            }
            // The counts are of the external and embedded css. Inline styles have no rules.
            found.ruleSelectors.push(...file.css.rules.map((rule) => rule.selectors.join(", ")));
            found.propertyNames.push(...file.css.declarations.filter((d) => d.source !== "inline").map((d) => d.property));
            if (moreRequirements.specialFileName !== null) {
                const nameCheck = checkSpecialFileName(file.relativePath, moreRequirements.specialFileName);
                if (nameCheck === "ok") {
                    found.specialFileFound = true;
                } else if (nameCheck === "wrong-case") {
                    found.wrongCaseFileNames.push(path.basename(file.relativePath));
                }
            }
            return [];
        },
        summarize() {
            return moreRequirements.valueCount > 0 ? summarizeAdditionalRequirements(found, moreRequirements) : null;
        },
    };
}

/** summarizeAdditionalRequirements function
 * Compare what was found in all of a student's files to the moreRequirements values.
 * @param {Object} found - What was found in all of the student's files
 * @param {number} found.htmlFileCount - Number of HTML files
 * @param {number} found.cssFileCount - Number of CSS files
 * @param {Array<string>} [found.ruleSelectors] - The selector of every css rule
 * @param {Array<string>} [found.propertyNames] - The name of every css property declared
 * @param {boolean} [found.specialFileFound] - true if the special file name was found, or none is required
 * @param {Array<string>} [found.wrongCaseFileNames] - Files named like the special file except for upper/lower case
 * @param {import("./Requirements.mjs").MoreRequirements} moreRequirements
 * @returns {CheckSection} Results only for the values the requirements file sets
 */
export function summarizeAdditionalRequirements(
    { htmlFileCount, cssFileCount, ruleSelectors = [], propertyNames = [], specialFileFound = true, wrongCaseFileNames = [] },
    moreRequirements) {
    const name = "additional-requirements";
    const results = [];
    const addCount = (found, expected, what) => {
        if (expected !== null) {
            results.push({ check: name, passed: found >= expected, message: `Found ${found} ${what}. Expected ${expected}` });
        }
    };

    addCount(htmlFileCount, moreRequirements.htmlFileCount, "html files");
    addCount(cssFileCount, moreRequirements.cssFileCount, "css files");

    const { specialFileName } = moreRequirements;
    if (specialFileName !== null) {
        const acceptedNames = getSpecialFileNames(specialFileName).join(" or ");
        let message = `Found ${specialFileName} file (${acceptedNames})`;
        if (!specialFileFound) {
            message = wrongCaseFileNames.length > 0
                // The file exists, but the case of its name is wrong
                ? `File name has the wrong upper/lower case: ${[...new Set(wrongCaseFileNames)].join(", ")}. It must be named ${acceptedNames}`
                : `Missing ${specialFileName} file (${acceptedNames})`;
        }
        results.push({ check: name, passed: specialFileFound, message });
    }

    // TODO: check separately for embedded and external selectors
    addCount(ruleSelectors.length, moreRequirements.minCssRules, "css rules");
    addCount(new Set(propertyNames).size, moreRequirements.minCssProperties, "distinct css properties");

    return { check: name, heading: "Additional requirements:", results, failureCountLabel: null,
        allPassedMessage: "All additional requirements met" };
}

/** makeRegExpCheck function
 * Searches the HTML or CSS files for regular expressions. One match in any file passes.
 * A search with no files to search fails.
 * @param {string} name - The name of the check
 * @param {"html"|"css"} kind - The kind of file to search
 * @param {Array<import("./Requirements.mjs").RegExpSearch>} searches
 * @param {string} heading - The line before the results in the report
 * @returns {Check}
 */
export function makeRegExpCheck(name, kind, searches, heading) {
    const matched = searches.map(() => false);
    // Compile each pattern once. The csv loader already leaves out invalid patterns, but searches
    // made some other way (tests) could have one, and it must not throw for every file.
    const regExps = searches.map(({ pattern }) => {
        try {
            return new RegExp(pattern, regExpFlags);
        } catch {
            return null;
        }
    });
    return {
        name,
        checkFile(file) {
            if (file.kind === kind) {
                regExps.forEach((regExp, i) => {
                    if (regExp !== null) {
                        regExp.lastIndex = 0;  // the g flag makes test() remember where it stopped
                        matched[i] ||= regExp.test(file.contents);
                    }
                });
            }
            return [];
        },
        summarize() {
            if (searches.length === 0) {
                return null;
            }
            const results = searches.map(({ description }, i) => ({
                check: name,
                passed: matched[i],
                message: regExps[i] === null
                    ? `Could not search for ${description}: it is not a valid regular expression`
                    : `${matched[i] ? "Found" : "Missing"} ${description} in files`,
            }));
            return { check: name, heading, results, failureCountLabel: null,
                allPassedMessage: "All regular expression searches passed" };
        },
    };
}

/***************************************************************************************
 * The file names that satisfy a required special file name.
 * A name with an extension (styles.css) must match exactly. A name without one (index)
 * can be an .html or .htm file (index.html, index.htm).
 * @param {string} specialFileName - The required file name from the requirements file.
 * @returns {Array<string>} The accepted file names.
 */
export function getSpecialFileNames(specialFileName) {
    if (/\.[A-Za-z0-9]+$/.test(specialFileName)) {
        return [specialFileName];
    }
    return [`${specialFileName}.html`, `${specialFileName}.htm`];
}

/***************************************************************************************
 * Check one file name against the required special file name (like index).
 * The whole file name must match, including the case, because web servers are case
 * sensitive. Only the file name is checked, not the folders in its path.
 * @param {string} fileName - File name or relative path of the file being checked.
 * @param {string} specialFileName - The required file name, like "index" or "styles.css".
 * @returns {"ok"|"wrong-case"|"no"} "ok" if the name matches, "wrong-case" if it matches
 *   except for upper/lower case, otherwise "no".
 */
export function checkSpecialFileName(fileName, specialFileName) {
    const baseName = path.basename(fileName);
    const acceptedNames = getSpecialFileNames(specialFileName);
    if (acceptedNames.includes(baseName)) {
        return "ok";
    }
    if (acceptedNames.some((name) => name.toLowerCase() === baseName.toLowerCase())) {
        return "wrong-case";
    }
    return "no";
}

/** withoutFinalLineBreak function
 * @param {string} text - Validator output, which ends with a line break
 * @returns {string} The text without its last line break (the report formatter adds one)
 */
function withoutFinalLineBreak(text) {
    return text.endsWith("\n") ? text.slice(0, -1) : text;
}
