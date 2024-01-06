import fs from "fs";
import path from "path";
import csv from "csv-parser";

/** JsChecker class
* This class is used to check JavaScript requirements.
*/
export class JsChecker
{
    /**  Constructor for JsChecker class
     * @param {string} requirementsFileName - The path to the file containing requirements.
     */
    constructor(requirementsFileName)
    {
        this.loadRequirements(requirementsFileName);
    }

    /**
  * Object to hold the HTML and CSS requirements.
  * @property {Array<string>} TBD1 - Some requirements for part 1.
  * @property {Array<string>} TBD2 - Some requriements for part 2.
  */
 // TODO: Add real requirements, these are just placeholders
    requirements = {
        TBD1: [],
        TBD2: []
    };

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
                    if (row.TBD1)
                    {
                        this.requirements.TBD1.push(row.requiredElements1);
                    }
                    if (row.TBD2)
                    {
                        this.requirements.TBD2.push(row.requiredElements2);
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

 /**
 * Checks the HTML for the required elements and regular expressions.
 * @param {string} html - The HTML to check.
 * @param {string} fileName - The name of the file being checked.
 * @returns {string} - A report of the results.
 */
// TODO: Complete this function
async renderAndCheck(fileContents, fileName, requiredOutput)
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

}
