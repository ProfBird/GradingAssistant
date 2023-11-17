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

/******* This is the central function for this program! **********/
/* checkSubmission function                                      */
/* checks one part of the lab assignment                         */
/* Checks the files in the labDir for the required elements,     */
/* properties and valid HTML and CSS for all sub-folders         */
/*****************************************************************/
async function checkSubmission(
    labDirPath, // full path to the lab folder or lab part subfolder.
    filePath,   // Empty string if there are multiple .html files, otherwise full path to a single file
    requiredElements = [],   // these assignments are the default values
    requiredSelectors = [],
    requiredProperties = [],
    regularExpressions = [],
    regExpDescriptions = [],
    additionalRequirements = []
)
{
    let message = ""; // Individual message
    let report = ""; // All messages for the operations in this function
    const foundElements = []; // will hold required elements found in the lab files
    // TODO: make this a paramenter and define it in the main
    const foundSelectors = []; // all the required css slectors that were found in the css files and embedded css
    const allSelectors = [];  // all the selectors found in the css files and embedded css for one part of the lab
    const foundProperties = []; // all the required css properties that were found in the css files and embedded css
    const allProperties = []; // all the properties found in the css files and embedded css for one part of the lab
    const additionalRequirementResults = [];
    const regExpResults = [];
    // initialize all elements to false
    for (let i = 0; i < additionalRequirements.length; i++)
    {
        additionalRequirementResults.push(false);
    }

    if (filePath === "")
    {
        // Loop through all .html files in the lab directory and it's subdirectories
        let files = [];
        traverseDir(labDirPath, files);  // Call inner function
        for (const filePath of files.filter((fileName) =>
            // only check .html, .htm and .css files
            /\.(html?|css)$/.test(fileName)))
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
    if (requiredSelectors.length > 0)
    {
        report = summarizeForRequiredSelectors(foundSelectors, requiredSelectors, report);
    }
    if (requiredProperties.length > 0)
    {
        report = summarizeForRequiredProperties(foundProperties, requiredProperties, report);
    }
    if (additionalRequirements.length > 0)
    {
        report = summarizeAdditionalRequirements(report, countHTMLFiles, countCSSFiles, 
            foundSelectors, foundProperties, additionalRequirements, additionalRequirementResults);
    }
    if (regularExpressions.length > 0)
    {
        report = summarizeRegExpSearches(report, regExpResults, regExpDescriptions);
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
    async function checkFile(fileContents, fileName)
    {
        let validationReport = ""; // All messages for the operations in this function
        // if the file is an .html or .htm file, validate it, get elements and rules it contains.
        if (/\.html?$/.test(fileName))
        {
            countHTMLFiles++;
            // Validate HTML
            validationReport += await validateHTML(fileContents, fileName);
            // Search file for regexp from moreRequirements array starting at index 3
            /* I don't think I need this any more
            for (let i = 3; i < requiredElements.length; i++)
            {
                const regexp = new RegExp(requiredElements[i], "g");
                if (regexp.test(fileContents))
                {
                    foundElements.push(requiredElements[i]);
                }
            }
*/
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
                    validationReport += message + `\n`;
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
                const cssText = styleElement.textContent;
                // put any embedded css selectors in foundSelectors
                const ast = cssTree.parse(cssText);
                // Get the embedded css selectors from the Abstract Syntax Tree (ast)
                cssTree.walk(ast, (node) =>
                {
                    if (node.type === "Rule")
                    {
                        foundSelectors.push(cssTree.generate(node.prelude));
                    }
                });
                // Get all embedded css properties from the Abstract Syntax Tree (ast)
                cssTree.walk(ast, (node) =>
                {
                    if (node.type === "Declaration")
                    {
                        foundProperties.push(node.property);
                    }
                });
            }

            // Get elements with inline styles from the html file
            const elements = dom.window.document.querySelectorAll("[style]");
            // Get the CSS property names from each of the element's inline styles
            for (const element of elements)
            {
                const inlineStyle = element.getAttribute("style");
                if (inlineStyle !== null)
                {
                    // Extract all property names from the inline style rule using a regular expression
                    const propertyRegex = /([\w-]+)\s*:/g;
                    let match; // array with capture group of matched property name
                    while ((match = propertyRegex.exec(inlineStyle)) !== null)
                    {
                        foundProperties.push(match[1]);
                    }
                }
            }

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
            const cssSelectorRegExp = /([.#]?[a-zA-Z_-][\w-]*(\s*[>~+]\s*)?)+/gi;
            let tempSelectors = fileContents.match(cssSelectorRegExp);
            // using the spread operator to push the elements onto the allSelectors array
            allSelectors.push(...tempSelectors);
            
            // Get the css properties from the css file
            const cssPropertyRegExp = /([a-zA-Z_-][\w-]*)(?=\s*:)/gi;
            allProperties.push(...fileContents.match(cssPropertyRegExp));

            // Validate CSS
            validationReport += await validateCSS(fileContents, fileName);
            // TODO: check for embedded css styles in the html pages
            // Get any required css selectors from fileContents, put in foundSelectors
            for (const selector of requiredSelectors)
            {
                if (fileContents.includes(selector))
                {
                    foundSelectors.push(selector);
                }
            }
            // Get any required css properties from fileContents, put in foundProperties
            // TODO: Use cssTree to get the properties
            for (const property of requiredProperties)
            {
                if (fileContents.includes(property))
                {
                    foundProperties.push(property);
                }
            } // end looping through requiredProperties
        } // end of processing .css files

        // --- Check the file for additional requirements ---
        // Check for a special file name
        const specialFileName = additionalRequirements[0] === '""' ? "" : additionalRequirements[0];
        
        if (specialFileName == undefined || specialFileName == "")
        {
            additionalRequirementResults[0] = true; // set to true if we are not looking for a special file name
        }
        else
        {
            // if any file name has the special file name, set the results to true. Partial match for .htm an .html
            additionalRequirementResults[0] ||= (specialFileName === "" || fileName.includes(specialFileName));
        }

        // --- Check the file using regular expressions ---
        // The boolean results are or'ed together from each file checked
        // One search result is enough to set the overall result to true
        for (let i = 0; i < regularExpressions.length; i++)
        {
            let regexp = new RegExp(regularExpressions[i], "gim");
            regExpResults[i] ||= (regexp.test(fileContents)); // true / false result
        }

        return validationReport;
    } // End of checkFile inner function

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

/********************************************/
/* Check results for required css selectors */
/********************************************/
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

/************************************************/
/* Check results for additional requirements    */
/************************************************/
//function summarizeAdditionalRequirements(report, countHTMLFiles, additionalRequirements, additionalRequirementResults)
function summarizeAdditionalRequirements(report, countHTMLFiles, countCSSFiles, foundSelectors, foundProperties,
    additionalRequirements, additionalRequirementResults)
{
    let areAllAdditionalRequirementsMet = true;
    let message = "";

    //TODO: Make a function for checking number of either CSS or HTML files
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
    if (foundSelectors.length < requiredNumberOfSelectors)
    {
        areAllAdditionalRequirementsMet = false;
        message = `Found ${foundSelectors.length} css rules. Expected ${requiredNumberOfSelectors}`;
        console.log(message);
        report += message + `\n`;
    }

    // Report if the required number of properties is not found
    // TODO: check for unique property types not just the total number of properties
    const requiredNumberOfProperties = parseInt(additionalRequirements[5] + parseInt(additionalRequirements[5]));
    if (foundProperties.length < requiredNumberOfProperties)
    {
        areAllAdditionalRequirementsMet = false;
        message = `Found ${foundProperties.length} css properties. Expected ${requiredNumberOfProperties}`;
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
/* Check results for regular expression searches    */
/****************************************************/
function summarizeRegExpSearches(report, regExpResults, regExpDescriptions)
{
    let message = "";
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

export { checkSubmission };