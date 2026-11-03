import fs from "fs";
import path from "path";
import { JSDOM } from "jsdom";
import { HtmlAndCssChecker } from "./HtmlAndCssChecker.mjs";
import { validateHtml } from "./HtmlValidators.mjs";
import { isJunk } from "./SubmissionFolders.mjs";
import { parseStylesheet, parseInlineStyle, findRequiredSelectors, findRequiredProperties } from "./CssParser.mjs";

/********* This is the central function for this program! **********
* checkSubmission function                                      
* checks one part of the lab assignment                         
* Checks the files in the labDir for the required elements,     
* properties and valid HTML and CSS for all sub-folders 
* @param {string} labDirPath - The path to the lab folder or lab part subfolder.
* @param {string} filePath - The path to the file to check. Empty string if there are multiple .html files.
* @param {string} LabPart - The lab part number.  
* @param {Object} settings - The settings for this lab assignment.      
* @param {import("./Requirements.mjs").Requirements} requirements - The requirements to check against,
*   from readRequirementsFile (or makeRequirements in the tests).
*/
// TODO: move all the html and css checks to the HtmlAndCssChecker class, then the HtmlAndCssRequirements won't ned to be a parameter.
async function checkSubmission(
    labDirPath, // full path to the lab folder or lab part subfolder.
    filePath,   // Empty string if there are multiple .html files, otherwise full path to a single file
    LabPart,    // lab part number
    settings,   // object containing settings
    HtmlAndCssRequirements // object containing requirements arrays.
)
{
    let message = ""; // Individual message
    let report = ""; // All messages for the operations in this function
    const { moreRequirements } = HtmlAndCssRequirements;
    // Part 1 uses the part 1 elements. Part 2 and later use the part 2 elements.
    const requiredElements = (LabPart === 1) ? HtmlAndCssRequirements.requiredElements1 : HtmlAndCssRequirements.requiredElements2;
    // How many times each required element was found in all the lab files (same order as requiredElements)
    const elementCounts = requiredElements.map(() => 0);
    // Every css rule and property declaration in the external, embedded and inline css of all the lab files
    const cssRules = [];
    const cssDeclarations = [];
    let countHTMLFiles = 0; // Number of html files found in the lab files
    let countCSSFiles = 0; // Number of css files found in the lab files
    // true when the required special file name is found (or none is required)
    let specialFileFound = moreRequirements.specialFileName === null;
    const wrongCaseFileNames = []; // files that match the required special file name except for upper/lower case
    let regExpHtmlResults = [];
    let regExpCssResults = [];

    if (filePath === "")
    {
        // Loop through all HTML and CSS files in the lab directory and it's subdirectories
        let files = [];
        traverseDir(labDirPath, files);  // Call inner function
        for (const filePath of files.filter((fileName) =>
            // only check .html, .htm and .css files
            /\.(html?|css)$/i.test(fileName)))
        {
            // Read the contents of the file
            const fileContents = fs.readFileSync(filePath, "utf8");
            // Parse the sub directories and file name out of the path
            const relativePath = path.relative(labDirPath, filePath);

            message = `Checking the ${relativePath} file`;
            // console.log(message);
            report += message + `\n`;
            report += await checkFile(fileContents, relativePath);

        } // end looping through files in labDirPath
    } else
    {
        // Check the specific file specified by filePath
        const fileContents = fs.readFileSync(filePath, "utf8");
        report += await checkFile(fileContents, filePath);
    }

    // compare elementCounts to the number required and log any missing elements
    report = summarizeForRequiredElements(elementCounts, requiredElements, report);
    // TODO: combine the following two functions into one and check for properties in specific selectors.
    if (HtmlAndCssRequirements.requiredCssSelectors.length > 0)
    {
        const foundSelectors = findRequiredSelectors(HtmlAndCssRequirements.requiredCssSelectors, cssRules);
        report = summarizeForRequiredSelectors(foundSelectors, HtmlAndCssRequirements.requiredCssSelectors, report);
    }
    if (HtmlAndCssRequirements.requiredCssProperties.length > 0)
    {
        const foundProperties = findRequiredProperties(HtmlAndCssRequirements.requiredCssProperties, cssDeclarations);
        report = summarizeForRequiredProperties(foundProperties, HtmlAndCssRequirements.requiredCssProperties, report);
    }
    if (moreRequirements.valueCount > 0)
    {
        report += "Additional requirements:\n"
        report += summarizeAdditionalRequirements({
            htmlFileCount: countHTMLFiles,
            cssFileCount: countCSSFiles,
            // The counts are of the external and embedded css. Inline styles have no rules.
            ruleSelectors: cssRules.map((rule) => rule.selectors.join(", ")),
            propertyNames: cssDeclarations.filter((d) => d.source !== "inline").map((d) => d.property),
            specialFileFound,
            wrongCaseFileNames,
        }, moreRequirements);
    }
    // A search that never ran (no HTML or CSS files were found) did not find a match
    while (regExpHtmlResults.length < HtmlAndCssRequirements.htmlRegExps.length)
    {
        regExpHtmlResults.push(false);
    }
    while (regExpCssResults.length < HtmlAndCssRequirements.cssRegExps.length)
    {
        regExpCssResults.push(false);
    }
    if (HtmlAndCssRequirements.htmlRegExps.length > 0)
    {
        report += "Regular expression searches in HTML files:\n"
        report += summarizeRegExpSearches(regExpHtmlResults, HtmlAndCssRequirements.htmlRegExps);
    }

    if (HtmlAndCssRequirements.cssRegExps.length > 0)
    {
        report += "Regular expression searches in CSS files:\n"
        report += summarizeRegExpSearches(regExpCssResults, HtmlAndCssRequirements.cssRegExps);
    }
    return report;


    /*********** inner function *********/
    /* Will be called recursively to    */
    /* read files in all subdirectories */
    /************************************/
    function traverseDir(dir, files)
    {
        // Skip junk like __MACOSX, ._index.html and .git, which are not the student's work
        fs.readdirSync(dir, { withFileTypes: true }).filter((dirent) => !isJunk(dirent)).forEach((dirent) =>
        {
            let fullPath = path.join(dir, dirent.name);
            if (dirent.isDirectory())
            {
                // console.log(fullPath);
                files = traverseDir(fullPath, files); // <-- recursive call!
            } else
            {
                // console.log(fullPath);
                files.push(fullPath);
            }
        });
        return files;
    }   /************** End of traverseDir inner function *************/


    /*********** inner function *********/
    /* Do checks on an individual file  */
    /************************************/
    // TODO: make this a separate function that doesn't use global variables
    async function checkFile(fileContents, fileName)
    {
        let report = ""; // All messages for the operations in this function
        // Do all the file checks if the fil is not empty
        if (fileContents != "")
        {
            if (/\.html?$/i.test(fileName))
            {
                countHTMLFiles++;
                // Validate HTML
                if (moreRequirements.htmlValidator !== null)
                {
                    report += await validateHtml(fileContents, fileName, moreRequirements.htmlValidator);
                }

                // Count the required html elements in fileContents, add to elementCounts
                const dom = new JSDOM(fileContents);
                for (const [i, { selector }] of requiredElements.entries())
                {
                    let elements = [];
                    try
                    {
                        elements = dom.window.document.querySelectorAll(selector);
                    } catch (error)
                    {
                        message = `Error finding ${selector} element in ${fileName}`;
                        console.error(message);
                        report += message + `\n`;
                    }
                    elementCounts[i] += elements.length;
                } // end looping through requiredElements

                // Get the embedded css out of the html file (there can be more than one style element)
                for (const styleElement of dom.window.document.querySelectorAll("style"))
                {
                    addCss(parseStylesheet(styleElement.textContent, "embedded"));
                }
                // Get the inline styles
                for (const element of dom.window.document.querySelectorAll("[style]"))
                {
                    addCss(parseInlineStyle(element.getAttribute("style")));
                }

                regExpHtmlResults = orRegExpResults(regExpHtmlResults,
                    checkFileWithRegExp(HtmlAndCssRequirements.htmlRegExps, fileContents));

                // Render the html page and check for required output
                // TODO: Load required output from csv file
                // TODO: debug renderAndCheck function
                /*
                const requiredOutput = [];
                report += await renderAndCheck(fileContents, path.basename(filePath), requiredOutput);
                */
            }
            else // File is a css file
            {
                countCSSFiles++;
                // Get the css rules and declarations from the css file
                addCss(parseStylesheet(fileContents, "external"));

                // Validate CSS if the requirements file asks for it
                if (moreRequirements.validateCss)
                {
                    report += await HtmlAndCssChecker.validateCSS(fileContents, fileName);
                }
                // Do regular expression searches of the CSS file contents
                regExpCssResults = orRegExpResults(regExpCssResults,
                    checkFileWithRegExp(HtmlAndCssRequirements.cssRegExps, fileContents));

            } // end of processing .css files

            // --- Check the file for additional requirements ---
            // Check for a special file name
            if (moreRequirements.specialFileName !== null)
            {
                // if any file name has the special file name, set the result to true. Partial match for .htm an .html
                const nameCheck = checkSpecialFileName(fileName, moreRequirements.specialFileName);
                if (nameCheck === "ok")
                {
                    specialFileFound = true;
                } else if (nameCheck === "wrong-case")
                {
                    wrongCaseFileNames.push(path.basename(fileName));
                }
            }
        } else
        {
            message = `File ${fileName} is empty`;
            console.log(message);
            report += message + `\n`;
        }
        return report;
    } // End of checkFile inner function

    /*********** inner function ***********/
    /* Add the rules and declarations from one stylesheet or inline style */
    /**************************************/
    function addCss({ rules, declarations })
    {
        cssRules.push(...rules);
        cssDeclarations.push(...declarations);
    }

    /*********** inner function ***********/
    /* OR the regular expression results of one file with the results of the */
    /* files checked so far: one match in any file is enough to pass.        */
    /**************************************/
    function orRegExpResults(resultsSoFar, newResults)
    {
        return newResults.map((result, i) => (resultsSoFar[i] === true) || result === true);
    }

    /************************** inner function ***********************/
    /*     ----- Check a file using regular expressions ------       */
    /* Can be used for any file type, including CSS and HTML                    */
    /* The boolean results are or'ed together from each file checked */
    /* One search result is enough to set the overall result to true */
    /*****************************************************************/
    function checkFileWithRegExp(regExpSearches, fileContents)
    {
        const regExpResults = [];
        for (let i = 0; i < regExpSearches.length; i++)
        {
            let regexp = new RegExp(regExpSearches[i].pattern, "gim");
            regExpResults[i] ||= (regexp.test(fileContents)); // true / false result
        }
        return regExpResults;
    } // End of checkFileWithRegExp inner function

} // End of checkSubmission function


/*****************************************************************/
/* All the following functions are called by checkSubmission     */
/*****************************************************************/


/********************************************************************
 * Check results for required html elements
 * @param {Array<number>} elementCounts - How many times each required element was found in all the files.
 * @param {Array<import("./Requirements.mjs").RequiredElement>} requiredElements - The required elements,
 *   in the same order as elementCounts.
 * @param {string} report - The report string to append to.
 * @returns {string} The updated report string.
 */
function summarizeForRequiredElements(elementCounts, requiredElements, report)
{
    const messages = [];
    // TODO: diffrentiate between missing elements and missing attributes
    requiredElements.forEach(({ selector, minimum }, i) =>
    {
        const count = elementCounts[i] ?? 0;
        if (count === 0 && minimum > 0)
        {
            messages.push(`Missing ${selector} element`);
        } else if (count < minimum)
        {
            messages.push(`Found ${count} ${selector} elements. Expected at least ${minimum}`);
        }
    });
    if (messages.length > 0)
    {
        report += `Missing ${messages.length} required elements\n`;
        report += messages.join("\n") + "\n";
    } else
    {
        report += `All required elements found\n`;
    }
    return report;
} 

/********************************************
 * Check results for required css selectors 
 * @param {Array<string>} foundSelectors - The CSS selectors that were found.
 * @param {Array<string>} requiredSelectors - The CSS selectors that are required.
 * @param {string} report - The report string to append to.
 * @returns {string} The updated report string.
 */
// Todo - combine this function with checkForRequiredElements into one function
function summarizeForRequiredSelectors(foundSelectors, requiredSelectors, report)
{
    const missingSelectors = requiredSelectors.filter(
        (selector) => !foundSelectors.includes(selector)
    );
    if (missingSelectors.length > 0)
    {
        const message = `Missing ${missingSelectors.length} required selectors`;
        report += message + `\n`;
        for (const selector of missingSelectors)
        {
            const message = `Missing ${selector} selector`;
            report += message + `\n`;
        }
    } else
    {
        const message = `All required selectors found`;
        report += message + `\n`;
    }
    return report;
}

/*********************************************/
/* Check results for required css properties */
/*********************************************/
// TODO: combine this function with checkForRequiredElements/Selectors into one function
function summarizeForRequiredProperties(foundProperties, requiredProperties, report)
{
    const missingProperties = requiredProperties.filter(
        (property) => !foundProperties.includes(property)
    );
    if (missingProperties.length > 0)
    {
        const message = `Missing ${missingProperties.length} required properties`;
        report += message + `\n`;
        for (const property of missingProperties)
        {
            const message = `Missing ${property} property`;
            report += message + `\n`;
        }
    } else
    {
        const message = `All required properties found`;
        report += message + `\n`;
    }
    return report;
}

/***************************************************************************************
 * The file names that satisfy a required special file name.
 * A name with an extension (styles.css) must match exactly. A name without one (index)
 * can be an .html or .htm file (index.html, index.htm).
 * @param {string} specialFileName - The required file name from the requirements file.
 * @returns {Array<string>} The accepted file names.
 */
function getSpecialFileNames(specialFileName)
{
    if (/\.[A-Za-z0-9]+$/.test(specialFileName))
    {
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
function checkSpecialFileName(fileName, specialFileName)
{
    const baseName = path.basename(fileName);
    const acceptedNames = getSpecialFileNames(specialFileName);
    if (acceptedNames.includes(baseName))
    {
        return "ok";
    }
    if (acceptedNames.some((name) => name.toLowerCase() === baseName.toLowerCase()))
    {
        return "wrong-case";
    }
    return "no";
}

/**************************************************
 * Summarize results for additional requirements (the moreRequirements column)
 * Summary of results of checking in all files
 * @param {Object} found - What was found in all of the student's files
 * @param {number} found.htmlFileCount - Number of HTML files
 * @param {number} found.cssFileCount - Number of CSS files
 * @param {Array<string>} [found.ruleSelectors] - The selector of every css rule
 * @param {Array<string>} [found.propertyNames] - The name of every css property declared
 * @param {boolean} [found.specialFileFound] - true if the special file name was found, or none is required
 * @param {Array<string>} [found.wrongCaseFileNames] - Files named like the special file except for upper/lower case
 * @param {import("./Requirements.mjs").MoreRequirements} moreRequirements
 * @returns {string} The report
 */
function summarizeAdditionalRequirements(
    { htmlFileCount, cssFileCount, ruleSelectors = [], propertyNames = [], specialFileFound = true, wrongCaseFileNames = [] },
    moreRequirements)
{
    let areAllAdditionalRequirementsMet = true;
    let message = "";
    let report = "";

    //TODO: Make one function for checking number of either CSS or HTML files
    const requiredNumberOfHTMLFiles = moreRequirements.htmlFileCount;
    // Report if less than the expected number of html files is found
    if (requiredNumberOfHTMLFiles !== null && htmlFileCount < requiredNumberOfHTMLFiles)
    {
        areAllAdditionalRequirementsMet = false;
        message = `Found ${htmlFileCount} html files. Expected ${requiredNumberOfHTMLFiles}`;
        console.log(message);
        report += message + `\n`;
    }

    const requiredNumberOfCSSFiles = moreRequirements.cssFileCount;
    // Report if less than the expected number of css files is found
    if (requiredNumberOfCSSFiles !== null && cssFileCount < requiredNumberOfCSSFiles)
    {
        areAllAdditionalRequirementsMet = false;
        message = `Found ${cssFileCount} css files. Expected ${requiredNumberOfCSSFiles}`;
        console.log(message);
        report += message + `\n`;
    }
    // Report if a special file name is required and not found
    const { specialFileName } = moreRequirements;
    if (specialFileName !== null && !specialFileFound)
    {
        areAllAdditionalRequirementsMet = false;
        if (wrongCaseFileNames.length > 0)
        {
            // The file exists, but the case of its name is wrong
            message = `File name has the wrong upper/lower case: ${[...new Set(wrongCaseFileNames)].join(", ")}. It must be named ${getSpecialFileNames(specialFileName).join(" or ")}`;
        } else
        {
            message = `Missing ${specialFileName} file (${getSpecialFileNames(specialFileName).join(" or ")})`;
        }
        console.log(message);
        report += message + `\n`;
    }

    // Report if the required number of css rules (external and embedded) is not found.
    // A blank or missing value means there is no requirement.
    // TODO: check separately for embedded and external selectors
    const requiredNumberOfSelectors = moreRequirements.minCssRules;
    if (requiredNumberOfSelectors !== null && ruleSelectors.length < requiredNumberOfSelectors)
    {
        areAllAdditionalRequirementsMet = false;
        message = `Found ${ruleSelectors.length} css rules. Expected ${requiredNumberOfSelectors}`;
        console.log(message);
        report += message + `\n`;
    }

    // Report if the required number of distinct css properties is not found
    const uniqueProperties = [...new Set(propertyNames)];
    const requiredNumberOfProperties = moreRequirements.minCssProperties;
    if (requiredNumberOfProperties !== null && uniqueProperties.length < requiredNumberOfProperties)
    {
        areAllAdditionalRequirementsMet = false;
        message = `Found ${uniqueProperties.length} distinct css properties. Expected ${requiredNumberOfProperties}`;
        console.log(message);
        report += message + `\n`;
    }

    if (areAllAdditionalRequirementsMet)
    {
        message = `All additional requirements met`;
        console.log(message);
        report += message + `\n`;
    }

    return report;
}

/****************************************************
 * Sumarize results or regular expression searches
 * Summary of results of searches in all files
 * @param {Array<boolean>} regExpResults - true for each search that matched in a file
 * @param {Array<import("./Requirements.mjs").RegExpSearch>} regExpSearches - The searches, in the same order
 * @returns {string} The report
 */
function summarizeRegExpSearches(regExpResults, regExpSearches)
{
    let message = "";
    let report = "";
    let didAllRegExpSearchesPass = true;

    // Report if a regexp search fails
    for (let i = 0; i < regExpResults.length; i++)
    {
        if (regExpResults[i] === false)
        {
            didAllRegExpSearchesPass = false;
            message = `Missing ${regExpSearches[i].description} in files`;
            console.log(message);
            report += message + `\n`;
        }
    }

    if (didAllRegExpSearchesPass)
    {
        message = `All regular expression searches passed`;
        console.log(message);
        report += message + `\n`;
    }

    return report;
}

export { checkSubmission, checkSpecialFileName,
    summarizeAdditionalRequirements };