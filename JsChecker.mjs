import fs from "fs";
import path from "path";
import csv from "csv-parser";
import { Checker } from "./Checker.mjs";
import Mocha from 'mocha';

/** JsChecker class
* This class is used to check JavaScript requirements.
*/
export class JsChecker extends Checker {
    /**  Constructor for JsChecker class
     * @param {Buffer} requirementsFileBuffer - The path to the file containing requirements.
     * @param {string} requirementsFilePath - The csv requirements file name
     */
    constructor(requirementsFileBuffer, requirementsFilePath) {
        super();
        this.loadRequirements(requirementsFileBuffer, requirementsFilePath);
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
     * @param {Buffer} requirementsFileBuffer - file buffer containing requirements.
     * @param {string} requirementsFilePath - The path to the file containing requirements.
     */
    loadRequirements(requirementsFileBuffer, requirementsFilePath) {
        csv()  // the .on function sets up lisetners
            .on("data", (row) =>    // row is an object containing the data from one row of the csv file
            {
                if (row.unitTests) {
                    // The unit test file path is relative to the requirements file for now 3/13/24
                    let unitTestPath = path.join(requirementsFilePath, row.unitTests);
                    this.requirements.UnitTests.push(unitTestPath);
                }
                if (row.filesToTest) {
                    this.requirements.FilesToTest.push(row.filesToTest);
                }
            })
            .on("error", (error) => {
                console.error(error);
            })
            .write(requirementsFileBuffer);  // this sends data to the csv parser function above
    } // End of loadRequirements function


    /**
     * checkSubmission method
     * Checks a file or files in a dir against the requriements
     * @param {string} labDirPath 
     * @param {string} labPart 
     */
    async checkSubmission(
        labDirPath, // full path to a student's lab folder or lab part subfolder.
        labPart,    // lab part number

    ) {
        let report = "";
        let message = "";

        let fileToTest = this.requirements.FilesToTest[labPart - 1];
        let fileToTestPath = path.join(labDirPath, fileToTest);
        // Unit test file path is relative to the requirements file for now 3/11/24
        let unitTestFilePath = this.requirements.UnitTests[labPart - 1];
        // If either of the file paths are not valid, return an error message
        try {
            if (!fs.existsSync(fileToTestPath)) {
                report = "File not found: " + fileToTest + "\n";
                throw new Error("File not found: " + fileToTestPath);
            }
            if (!fs.existsSync(unitTestFilePath)) {
                throw new Error("File not found: " + unitTestFilePath);
            }
            const mocha = new Mocha();
            mocha.addFile(unitTestFilePath); // Add the unit test file
            process.env.TESTED_FILE = fileToTestPath; // specify the file to be tested

            // Create a promise that resolves when all tests have finished
            const testsFinished = new Promise((resolve) => {
                runner.on('end', resolve);
            });

            // Run the tests.
            // The anonymous function is a callback function that is invoked when the tests have finished.
            const runner = mocha.run(function (failures) {
                report += failures ? "Passed" : "Failed"; 
            });

            // Listen for the 'fail' event, meaning the test didn't pass.
            runner.on('fail', function (test, err) {
                // console.log('Test failed:');
                // console.log('Test name: ' + test.title);
                // console.log('Error message: ' + err.message);
                report += 'Test failed: ' + test.title + err.message + '\n';
            });

            // Wait for all tests to finish before continuing
            testsFinished.then(() => {
                console.log('All tests finished. Continuing execution...');
                // Continue with your code here
            });
        } catch (error) {
            console.log(error.message);
        }
        return report;
    }


    /**
    * renderAndCheck method
    * We're not using this yet!
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
