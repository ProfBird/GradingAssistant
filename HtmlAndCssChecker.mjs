import fs from "fs";
import path from "path";
import csv from "csv-parser";

/** HtmlAndCssChecker class
* This class is used to check HTML and CSS requirements.
*/
export class HtmlAndCssChecker
{
    /**  Constructor for HtmlAndCssChecker class
     * @param {string} requirementsFileName - The path to the file containing requirements.
     */
    constructor(requirementsFileName)
    {
        this.loadRequirements(requirementsFileName);
    }

    /**
  * Object to hold the HTML and CSS requirements.
  * @property {Array<string>} requiredElements1 - Required HTML elements for parts 1.
  * @property {Array<string>} requiredElements2 - Required HTML elements for parts 2.
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
    // 0 Number of parts in the lab assignment
    // 1 Number of html files expected in the lab submission
    // 2 If a special html file name is required, like index, it will be in the requirements file
    // 3+ Regular expressions to search for in the html files

    // Methods

    /*************************************/
    /* Load requirements from a csv file */
    /*************************************/
    loadRequirements(requirementsFileName)
    {
        try
        {
            const data = fs.readFileSync(requirementsFileName);
            csv()  // the .on function sets up lisetners
                .on("data", (row) =>    // row is an object containing the data from one row of the csv file
                {
                    if (row.settings)
                    {
                        settings.push(row.settings);
                    }
                    if (row.requiredElements1)
                    {
                        HtmlAndCssRequirements.requiredElements1.push(row.requiredElements1);
                    }
                    if (row.requiredElements2)
                    {
                        HtmlAndCssRequirements.requiredElements2.push(row.requiredElements2);
                    }
                    if (row.requiredCssSelectors)
                    {
                        HtmlAndCssRequirements.requiredCssSelectors.push(row.requiredCssSelectors);
                    }
                    if (row.requiredCssProperties)
                    {
                        // remove whitespace
                        row.requiredCssProperties = row.requiredCssProperties.replace(/\s/g, "");
                        HtmlAndCssRequirements.requiredCssProperties.push(row.requiredCssProperties);
                    }
                    if (row.moreRequirements)
                    {
                        HtmlAndCssRequirements.additionalRequirements.push(row.moreRequirements);
                    }
                    if (row.regExpForHTML1)
                    {
                        HtmlAndCssRequirements.regExpForHTML1.push(row.regExpForHTML1);
                    }
                    if (row.regExpForHTML1Description)
                    {
                        HtmlAndCssRequirements.regExpForHTML1Description.push(row.regExpForHTML1Description);
                    }
                    if (row.regExpForCSS1)
                    {
                        HtmlAndCssRequirements.regExpForCSS1.push(row.regExpForCSS1);
                    }
                    if (row.regExpForCSS1Description)
                    {
                        HtmlAndCssRequirements.regExpForCSS1Description.push(row.regExpForCSS1Description);
                    }
                })
                .on("error", (error) =>
                {
                    console.error(error);
                })
                .write(data);  // this sends data to the csv parser
        }
        catch (error)
        {
            console.error(`Error reading requirements file ${requirementsFileName}: ${error.message}`);
        }

    } // End of loadRequirements function
}
