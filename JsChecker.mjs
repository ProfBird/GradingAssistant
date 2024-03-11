import fs from "fs";
import path from "path";
import csv from "csv-parser";
import {Checker} from "./Checker.mjs";

/** JsChecker class
* This class is used to check JavaScript requirements.
*/
export class JsChecker extends Checker {
    /**  Constructor for JsChecker class
     * @param {string} requirementsFileName - The path to the file containing requirements.
     */
    constructor(requirementsFileName) {
        super();
        this.loadRequirements(requirementsFileName);
    }

    /**
     * Object to hold the HTML and CSS requirements.
     * @property {Array<string>} UnitTests - Unit test file names for part1, part2, etc.
     * @property {Array<string>} FilesToTest -  Name of files to test for part1, part2, etc.
     */
    requirements = {
        UnitTests: [], 
        FilesToTest: []
    };

    // Methods

    /** loadRequirements method
     * Load requirements for checking JavaScript files.
     * @param {Buffer} fileBuffer - file buffer containing requirements.
     */
    loadRequirements(fileBuffer) {
            csv()  // the .on function sets up lisetners
                .on("data", (row) =>    // row is an object containing the data from one row of the csv file
                {
                    if (row.UnitTests) {
                        this.requirements.UnitTests.push(row.requiredElements1);
                    }
                    if (row.FilesToTest) {
                        this.requirements.FilesToTest.push(row.requiredElements2);
                    }
                })
                .on("error", (error) => {
                    console.error(error);
                })
                .write(fileBuffer);  // this sends data to the csv parser function above
    } // End of loadRequirements function



    /**
    * renderAndCheck method
    * Checks JS code in script elements in an HTML file.
    * @param {string} html - The HTML to check.
    * @param {string} fileName - The name of the file being checked.
    * @returns {string} - A report of the results.
    */
    // TODO: Complete this function
    async renderAndCheck(fileContents, fileName, requiredOutput) {
        let report = "";

        puppeteer.launch({ headless: "new" }).then(async (browser) => {
            const page = await browser.newPage();
            await page.setContent(fileContents);
            const text = await page.evaluate(() => {
                // Execute the script on the page
                const scripts = document.querySelectorAll("script");
                scripts.forEach((script) => {
                    if (script.textContent) {
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
