import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import { JSDOM } from "jsdom";
import puppeteer from "puppeteer";
import * as cssTree from "css-tree";
import os from "os";
import { all } from "axios";

let countHTMLFiles = 0; // Number of html files found in the lab files
let countCSSFiles = 0; // Number of css files found in the lab files

/********* This is the central function for this program! **********
* checkSubmission function                                      
* checks one part of the lab assignment                         
* Checks the files in the labDir for the required elements,     
* properties and valid HTML and CSS for all sub-folders 
* @param {string} labDirPath - The path to the lab folder or lab part subfolder.
* @param {string} filePath - The path to the file to check. Empty string if there are multiple .html files.
* @param {string} LabPart - The lab part number.        
* @param {Object} requirements - The requirements to check against.
* @property {Array<string>} requirements.requiredElements1 - Part1 required HTML elements.
* @property {Array<string>} requirements.requiredElements2 - Part2 required HTML elements.
* @property {Array<string>} requirements.requiredCssSelectors - The required CSS selectors.
* @property {Array<string>} requirements.requiredCssProperties - The required CSS properties.
* @property {Array<string>} requirements.regExpForHTML1 - Regular expressions to check against the HTML.
* @property {Array<string>} requirements.regExpForHTML1Description - Descriptions of the regular expressions for the HTML.
* @property {Array<string>} requirements.regExpForCSS1 - Regular expressions to check against the CSS.
* @property {Array<string>} requirements.regExpForCSS1Description - Descriptions of the regular expressions for the CSS.
* @property {Array<string>} requirements.additionalRequirements - Additional requirements.
*/
async function checkSubmission(
    labDirPath, // full path to the lab folder or lab part subfolder.
    filePath,   // Empty string if there are multiple .html files, otherwise full path to a single file
    LabPart,    // lab part number
    HtmlAndCssRequirements // object containing requirements arrays.
)
{
    let message = ""; // Individual message
    let report = ""; // All messages for the operations in this function
    let requiredElements = (LabPart === 1) ? HtmlAndCssRequirements.requiredElements1 : HtmlAndCssRequirements.requiredElements2;
    const foundElements = []; // will hold required elements found in the lab files
    // TODO: make this a paramenter and define it in the main
    const foundSelectors = []; // all the required css slectors that were found in the css files and embedded css
    const allSelectors = [];  // all the selectors found in the css files and embedded css for one part of the lab
    const foundProperties = []; // all the required css properties that were found in the css files and embedded css
    const allProperties = []; // all the properties found in the css files and embedded css for one part of the lab
    const additionalRequirementResults = [];
    let regExpHtmlResults = [];
    let regExpCssResults = [];
    // initialize all elements to false
    for (let i = 0; i < HtmlAndCssRequirements.additionalRequirements.length; i++)
    {
        additionalRequirementResults.push(false);
    }

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

    // compare foundElements to requiredElements and log any missing elements
    report = summarizeForRequiredElements(foundElements, requiredElements, report);
    // TODO: combine the following two functions into one and check for properties in specific selectors.
    if (HtmlAndCssRequirements.requiredCssSelectors.length > 0)
    {
        report = summarizeForRequiredSelectors(foundSelectors, HtmlAndCssRequirements.requiredCssSelectors, report);
    }
    if (HtmlAndCssRequirements.requiredCssProperties.length > 0)
    {
        report = summarizeForRequiredProperties(foundProperties, HtmlAndCssRequirements.requiredCssProperties, report);
    }
    if (HtmlAndCssRequirements.additionalRequirements.length > 0)
    {
        report += "Additional requirements:\n"
        report += summarizeAdditionalRequirements(countHTMLFiles, countCSSFiles,
            allSelectors, allProperties,
            foundSelectors, foundProperties, HtmlAndCssRequirements.additionalRequirements, additionalRequirementResults);
    }
    if (HtmlAndCssRequirements.regExpForHTML1.length > 0)
    {
        report += "Regular expression searches in HTML files:\n"
        report += summarizeRegExpSearches(regExpHtmlResults, HtmlAndCssRequirements.regExpForHTML1Description);
    }

    if (HtmlAndCssRequirements.regExpForCSS1.length > 0)
    {
        report += "Regular expression searches in CSS files:\n"
        report += summarizeRegExpSearches(regExpCssResults, HtmlAndCssRequirements.regExpForCSS1Description);
    }
    return report;


    /*********** inner function *********/
    /* Will be called recursively to    */
    /* read files in all subdirectories */
    /************************************/
    function traverseDir(dir, files)
    {
        fs.readdirSync(dir).forEach((file) =>
        {
            let fullPath = path.join(dir, file);
            if (fs.lstatSync(fullPath).isDirectory())
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
            if (/\.html?$/.test(fileName))
            {
                countHTMLFiles++;
                // Validate HTML
                report += await validateHTML(fileContents, fileName);

                // Get any required html elements from fileContents, put in foundElements
                const dom = new JSDOM(fileContents);
                for (const element of requiredElements)
                {
                    let elements = [];
                    try
                    {
                        elements = dom.window.document.querySelectorAll(element);
                    } catch (error)
                    {
                        message = `Error finding ${element} element in ${fileName}`;
                        console.error(message);
                        report += message + `\n`;
                    }
                    // if something is in the elements array, then the element was found
                    // TODO: figure out a cleaner way to do this
                    if (elements.length !== 0)
                    {
                        foundElements.push(element);
                    }
                } // end looping through requiredElements

                // Get embedded css out of the html file
                let styleElement = dom.window.document.querySelector("style");
                if (styleElement !== null)
                {
                    let foundSelectorsAndProperties = 
                         getEmbeddedCssSelectorsAndProperties(styleElement, HtmlAndCssRequirements.requiredCssSelectors, HtmlAndCssRequirements.requiredCssProperties);
                    foundSelectors.push(...foundSelectorsAndProperties.foundSelectors);
                    foundProperties.push(...foundSelectorsAndProperties.foundProperties);
                }

                // Get elements with inline styles from the html file
                const elements = dom.window.document.querySelectorAll("[style]");
                // Get the CSS property names and values from each of the element's inline styles
                const inlineStyles = getInlineStyles(elements, HtmlAndCssRequirements.requiredCssProperties);
                foundProperties.push(...inlineStyles.foundProperties);

                regExpHtmlResults = checkFileWithRegExp(HtmlAndCssRequirements.regExpForHTML1, fileContents);

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
                // Get the css selectors from the css file
                const cssSelectorRegExp = /([.#]?[a-zA-Z_-][\w-]*(\s*[>~+]\s*)?)+/gi;  // TODO: bug--this gets proeprties and values too
                let tempSelectors = fileContents.match(cssSelectorRegExp);
                // using the spread operator to push the elements onto the allSelectors array
                allSelectors.push(...tempSelectors);

                // Get the css properties from the css file
                const cssPropertyRegExp = /([a-zA-Z_-][\w-]*)(?=\s*:)/gi;
                allProperties.push(...fileContents.match(cssPropertyRegExp));

                // Validate CSS
                report += await validateCSS(fileContents, fileName);
                // TODO: check for embedded css styles in the html pages. 
                // 11/16/23, already getting them in foundSelectors and foundProperties, but the syntax might not be checked.

                // Get any required css selectors from fileContents, put in foundSelectors

                for (const selector of HtmlAndCssRequirements.requiredCssSelectors)
                {
                    if (fileContents.includes(selector))
                    {
                        foundSelectors.push(selector);
                    }
                }
                // Get any required css properties from fileContents, put in foundProperties
                // TODO: Use cssTree to get the properties
                // remove all whitespace from the fileContents, this was already done to the requiredProperties
                fileContents = fileContents.replace(/\s/g, '');
                for (let property of HtmlAndCssRequirements.requiredCssProperties)
                {
                    if (fileContents.includes(property))
                    {
                        foundProperties.push(property);
                    }
                } // end looping through requiredProperties

                // Do regular expression searches of the CSS file contents
                regExpHtmlResults = checkFileWithRegExp(HtmlAndCssRequirements.regExpForCSS1, fileContents);

            } // end of processing .css files

            // --- Check the file for additional requirements ---
            // Check for a special file name
            const specialFileName = HtmlAndCssRequirements.additionalRequirements[0] === '""' ? "" : HtmlAndCssRequirements.additionalRequirements[0];

            if (specialFileName == undefined || specialFileName == "")
            {
                additionalRequirementResults[0] = true; // set to true if we are not looking for a special file name
            }
            else
            {
                // if any file name has the special file name, set the results to true. Partial match for .htm an .html
                additionalRequirementResults[0] ||= (specialFileName === "" || fileName.includes(specialFileName));
            }
        } else
        {
            message = `File ${fileName} is empty`;
            console.log(message);
            report += message + `\n`;
        }
        return report;
    } // End of checkFile inner function

    /************************** inner function ***********************/
    /*     ----- Check a file using regular expressions ------       */
    /* Can be used for any file type, including CSS and HTML                    */
    /* The boolean results are or'ed together from each file checked */
    /* One search result is enough to set the overall result to true */
    /*****************************************************************/
    function checkFileWithRegExp(regExpArray, fileContents)
    {
        const regExpResults = [];
        for (let i = 0; i < regExpArray.length; i++)
        {
            let regexp = new RegExp(regExpArray[i], "gim");
            regExpResults[i] ||= (regexp.test(fileContents)); // true / false result
        }
        return regExpResults;
    } // End of checkFileWithRegExp inner function

} // End of checkSubmission function


/*****************************************************************/
/* All the following functions are called by checkSubmission     */
/*****************************************************************/

/***************************/
/* validateHTML function   */
/***************************/
async function validateHTML(fileContents, fileName)
{
    let message = ""; // Individual message
    let report = ""; // All messages for the files in this lab submission
    try
    {
        const response = await fetch("https://validator.w3.org/nu/?out=json", {
            method: "POST",
            headers: {
                "Content-Type": "text/html; charset=utf-8",
            },
            body: fileContents,
        });

        // The response from the validator will be "deconstructed" into two variable validationMessages
        const { messages: validationMessages } = await response.json();

        // Check for any errors
        if (validationMessages.length > 0)
        {
            // Loop through all the errors and log them
            for (const validationMessage of validationMessages)
            {
                message = `${validationMessage.type} error found on line ${validationMessage.lastLine} column ${validationMessage.lastColumn}: ${validationMessage.message}`;
                console.log(message);
                report += message + `\n`;
            }
            report += os.EOL; // add a blank line after the errors
        } else
        {
            message = `No errors found in ${fileName}`;
            //console.log(message);
            report += message + `\n`;
        }
    } catch (error)
    {
        console.error(error);
    }
    return report;
} // End of validateHTML function

/*************************/
/* Validate CSS function */
/*************************/
async function validateCSS(fileContents, fileName)
{
    let message = ""; // Individual message
    let report = ""; // All messages for the files in this lab submission

    const response = await fetch(
        `https://jigsaw.w3.org/css-validator/validator?profile=css3&output=soap12&text=${fileContents}`
    );

    if (response.ok)
    {
        const xmlText = await response.text();
        const dom = new JSDOM(xmlText, { contentType: "text/xml" });
        const messages = dom.window.document.getElementsByTagName("m:error");
        if (messages.length === 0)
        {
            report += `No errors found in ${fileName}\n`;
        } else
        {
            for (const message of messages)
            {
                const messageText = message.textContent.trim();
                report += `${fileName}: ${messageText}\n`;
            }
            report += os.EOL; // add a blank line after the errors
        }
    } else
    {
        console.error("Error: Invalid response");
    }
    return report;
}

/***************************************************************************************
/* Get the css selectors and properties from embedded css in an html file              
 * Returns an object with both the required selectors and properties that were found,  
 * as well as all the embedded selectors and properties.     
 * @param {Object} styleElement - The style element containing the CSS.
 * @param {Array<string>} requiredSelectors - The CSS selectors that are required.
 * @param {Array<string>} requiredProperties - The CSS properties that are required.
 * @returns {Object} An object containing the found and all selectors and properties.
 */
function getEmbeddedCssSelectorsAndProperties(styleElement, requiredSelectors, requiredProperties) {
    const allSelectors = [];
    const foundSelectors = [];
    const allProperties = [];
    const foundProperties = [];

    const cssText = styleElement.textContent;
    const ast = cssTree.parse(cssText);

    cssTree.walk(ast, (node) => {
        if (node.type === "Rule") {
            const selector = cssTree.generate(node.prelude);
            allSelectors.push(selector);
            if (requiredSelectors.includes(selector)) {
                foundSelectors.push(selector);
            }
        }
    });

    cssTree.walk(ast, (node) => {
        if (node.type === "Declaration") {
            const property = node.property;
            const value = cssTree.generate(node.value).trim();
            allProperties.push(`${property}: ${value}`);
            if (requiredProperties.includes(`${property}: ${value}`.trim())) {
                foundProperties.push(`${property}: ${value}`);
            } else if (requiredProperties.includes(property)) {
                foundProperties.push(property);
            }
        }
    });

    return {
        allSelectors,
        foundSelectors,
        allProperties,
        foundProperties
    };
}

/*************************************************/
/* Get the css properties and values from the    */
/* inline styles in an html file                 */
/*************************************************/
function getInlineStyles(elements, requiredProperties) {
    const allProperties = [];
    const foundProperties = [];
    for (const element of elements) {
        const inlineStyle = element.getAttribute("style");
        if (inlineStyle !== null) {
            // Extract all property names and values from the inline style rule using a regular expression
            const propertyRegex = /([\w-]+)\s*:\s*([^;]+)/g;
            let match; // array with capture groups of matched property name and value
            while ((match = propertyRegex.exec(inlineStyle)) !== null) {
                const property = match[1];
                const value = match[2].trim();
                // TODO: This code is duplicated in getEmbeddedCssSelectorsAndProperties
                allProperties.push(`${property}: ${value}`);
                if (requiredProperties.includes(`${property}: ${value}`.trim())) {
                    foundProperties.push(`${property}: ${value}`);
                } else if (requiredProperties.includes(property)) {
                    foundProperties.push(property);
                }
            }
        }
    }
    return { allProperties, foundProperties };
}

/********************************************/
/* Check results for required html elements */
/********************************************/
function summarizeForRequiredElements(foundElements, requiredElements, report)
{
    const missingElements = requiredElements.filter(
        (element) => !foundElements.includes(element)
    );
    // TODO: diffrentiate between missing elements and missing attributes
    if (missingElements.length > 0)
    {
        const message = `Missing ${missingElements.length} required elements`;
        report += message + `\n`;
        for (const element of missingElements)
        {
            const message = `Missing ${element} element`;
            report += message + `\n`;
        }
    } else
    {
        const message = `All required elements found`;
        report += message + `\n`;
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

/**************************************************/
/* Summarize results for additional requirements  */
/* Summary of results of checking in all files    */
/**************************************************/
function summarizeAdditionalRequirements(countHTMLFiles, countCSSFiles, allSelectors, allProperties,
    foundSelectors, foundProperties, additionalRequirements, additionalRequirementResults)
{
    let areAllAdditionalRequirementsMet = true;
    let message = "";
    let report = "";

    //TODO: Make one function for checking number of either CSS or HTML files
    const requiredNumberOfHTMLFiles = parseInt(additionalRequirements[1]);
    // Report if less than the expected number of html files is found
    if (countHTMLFiles < requiredNumberOfHTMLFiles)
    {
        areAllAdditionalRequirementsMet = false;
        message = `Found ${countHTMLFiles} html files. Expected ${requiredNumberOfHTMLFiles}`;
        console.log(message);
        report += message + `\n`;
    }

    const requiredNumberOfCSSFiles = parseInt(additionalRequirements[2]);
    // Report if less than the expected number of css files is found
    if (countHTMLFiles < requiredNumberOfCSSFiles)
    {
        areAllAdditionalRequirementsMet = false;
        message = `Found ${countCSSFiles} css files. Expected ${requiredNumberOfCSSFiles}`;
        console.log(message);
        report += message + `\n`;
    }
    // Report if a special file name is required and not found
    if (additionalRequirementResults[0] === false)
    {
        areAllAdditionalRequirementsMet = false;
        message = `Missing ${additionalRequirements[0]} file`;
        console.log(message);
        report += message + `\n`;
    }

    // Report if the required number of selectors is not found
    // TODO: check separately for embedded and external selectors
    const requiredNumberOfSelectors = parseInt(additionalRequirements[3]) + parseInt(additionalRequirements[4]);
    if (allSelectors.length < requiredNumberOfSelectors)
    {
        areAllAdditionalRequirementsMet = false;
        message = `Found ${allSelectors.length} css rules. Expected ${requiredNumberOfSelectors}`;
        console.log(message);
        report += message + `\n`;
    }

    // Report if the required number of unique properties is not found
    const uniqueProperties = [...new Set(allProperties)];
    const requiredNumberOfProperties = parseInt(additionalRequirements[5]);
    if (allProperties.length < requiredNumberOfProperties)
    {
        areAllAdditionalRequirementsMet = false;
        // filter for unique properties

        message = `Found ${uniqueProperties.length} css properties. Expected ${requiredNumberOfProperties}`;
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

/****************************************************/
/* Sumarize results or regular expression searches  */
/* Summary of results of searches in all files      */
/****************************************************/
function summarizeRegExpSearches(regExpResults, regExpDescriptions)
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
            message = `Missing ${regExpDescriptions[i]} in files`;
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


/************************************/
/* Check rendered web page          */
/************************************/
async function renderAndCheck(fileContents, fileName, requiredOutput)
{
    let report = "";

    puppeteer.launch({ headless: "new" }).then(async (browser) =>
    {
        const page = await browser.newPage();
        await page.setContent(fileContents);
        const text = await page.evaluate(() =>
        {
            // Execute the script on the page
            const scripts = document.querySelectorAll("script");
            scripts.forEach((script) =>
            {
                if (script.textContent)
                {
                    eval(script.textContent);
                }
            });

            // Get the rendered text
            return document.body.textContent;
        });
        // log the page contents for debugging
        console.log(text);
        await browser.close();
    });
    report = text;
    return report;
}

export { checkSubmission, getEmbeddedCssSelectorsAndProperties, getInlineStyles };