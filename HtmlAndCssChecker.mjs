import fs from "fs";
import path from "path";
import csv from "csv-parser";

/** HtmlAndCssChecker class
* This class is used to check HTML and CSS requirements.
*/
export class HtmlAndCssChecker {
    /**  Constructor for HtmlAndCssChecker class
     * @param {string} requirementsFileName - The path to the file containing requirements.
     */
    constructor(requirementsFileName) {
        this.loadRequirements(requirementsFileName);
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
    // 3 Validate the html files, true or false
    // 4 Validate the css files, true or false

    // Methods

    /*************************************/
    /* Load requirements from a csv file */
    /*************************************/
    loadRequirements(requirementsFileName) {
        try {
            const data = fs.readFileSync(requirementsFileName);
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
                .write(data);  // this sends data to the csv parser
        }
        catch (error) {
            console.error(`Error reading requirements file ${requirementsFileName}: ${error.message}`);
        }
    } // End of loadRequirements method

   /**
    * Validate the HTML syntax using the W3C validator.
    * @param {*} fileContents 
    * @param {*} fileName 
    * @returns 
    */
    async validateHTML(fileContents, fileName) {
        let message = ""; // Individual message
        let report = ""; // All messages for the files in this lab submission
        try {
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
            if (validationMessages.length > 0) {
                // Loop through all the errors and log them
                for (const validationMessage of validationMessages) {
                    message = `${validationMessage.type} error found on line ${validationMessage.lastLine} column ${validationMessage.lastColumn}: ${validationMessage.message}`;
                    console.log(message);
                    report += message + `\n`;
                }
                report += os.EOL; // add a blank line after the errors
            } else {
                message = `No errors found in ${fileName}`;
                //console.log(message);
                report += message + `\n`;
            }
        } catch (error) {
            console.error(error);
        }
        return report;
    } // End of validateHTML method

    /**
     * Validate the CSS syntax using the W3C validator.
     * @param {*} fileContents
     * @param {*} fileName
     * @returns
     */
    async validateCSS(fileContents, fileName) {
        let message = ""; // Individual message
        let report = ""; // All messages for the files in this lab submission

        const response = await fetch(
            `https://jigsaw.w3.org/css-validator/validator?profile=css3&output=soap12&text=${fileContents}`
        );

        if (response.ok) {
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
        } else {
            console.error("Error: Invalid response");
        }
        return report;
    } // End of validateCSS method
}
