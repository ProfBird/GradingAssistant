import fs from "fs";
import csv from "csv-parser";
import path from "path";
import { Checker } from "./Checker.mjs";
import { HtmlAndCssChecker } from './HtmlAndCssChecker.mjs';
import { JsChecker } from './JsChecker.mjs';
import { checkSubmission } from "./SubmissionChecker.mjs";
import { getPartDirs } from "./SubmissionFolders.mjs";
import Mocha from 'mocha';

/* Location of the files downloaded from Moodle and unzipped on dev machines */
// Windows path:  G:/My Drive/Courses/CIS195/2023-Summer/LabXX/CIS195_Su23LabXSubmissions
// Mac OS path: /Volumes/GoogleDrive/My Drive/Courses/CIS195/2023-Summer/LabX/CIS195_Su23LabXSubmissions
// Alt Mac OS path: /Users/admin/Documents/CIS195/Lab05/CIS195_Su23Lab5Submissions

/* Expected folder structure */
// StudentName/LabX/<website files and folders>
// Or, if there are two parts and they are in separate folders:
// StudentName/Part1/<website files and folders>
//                  Part2/<website files and folders>

/* global (ugh) object containing the settings used when checking the files for this lab */
let labSettings = {
    submissionsPath: "", // Path to the folder containing the student submissions
    numberOfParts: 1, // Number of parts in this lab assignment, set later in loadRequirements
    areAllInOneDir: true, // true if all lab parts are in one folder
    isHTML: false, // true if this is an HTML and CSS lab
    isCSS: false, // true if this is a CSS lab (not used yet)
    isJavaScript: false, // true if this is a JavaScript lab
};

/** Array of checker class objects--added in loadSettings
 * @type {Array<Checker>}
 */
const checkers = [];

/****************/
/* Main program */
/****************/
const requirementsFilePath = process.argv[2]; // absolute path including the file name
let overwrite = false;
let quitProgram = false;
console.log(`param = ${requirementsFilePath}`);
switch (process.argv[3]) {
    case '--help':
        console.log("Usage: node TestAnyLab.mjs requirementsFilePath.csv [options]");
        console.log("options:");
        console.log("--help\t\tDisplay this help message");
        console.log("--overwrite\tOverwrite existing report files");
        console.log("--html\t\tCheck HTML and CSS files");
        console.log("--javascript or --js\tCheck JavaScript files");
        quitProgram = true;  // exit the program after displaying the help message
        break;
    case '--overwrite':
        overwrite = true;
        console.log("Overwriting report files");
        break;
    default:
        console.log(`Unknown option: ${process.argv[3]}`);
        quitProgram = true;
        break;
}

if (quitProgram != true) {
    loadSettings(requirementsFilePath);

    // Loop through all student subdirectories at submissionsPath and 
    // call methods to check submissions
    // Every directory is a student submission (Canvas), except hidden directories and
    // the Moodle "_onlinetext" directories (e.g. TyTitan_onlinetext), which are skipped.
    for (const studentDir of fs.readdirSync(labSettings.submissionsPath, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory()
            && !dirent.name.startsWith(".")
            && !dirent.name.toLowerCase().endsWith("_onlinetext"))
        .map((dirent) => dirent.name)) {
        // skip if studentDir contains a file ending in _report.txt
        if (fs.readdirSync(path.join(labSettings.submissionsPath, studentDir))
            .find((file) => file.endsWith("_report.txt"))
            && !overwrite
        ) {
            console.log(
                `Skipping ${studentDir} directory because it contains a report file`
            );
            continue;
        }
        let message = `Checking the ${studentDir} directory`;
        console.log(message);
        let report = message + "\n"; // Report of the checks of the files for this student
        let studentDirPath = path.join(labSettings.submissionsPath, studentDir)

        // Find the folders holding the submission. Unzipped submissions often have wrapper
        // folders (StudentName/Lab/index.html) and the parts may be in separate sub-folders.
        const { root: submissionRoot, partDirs } =
            getPartDirs(studentDirPath, labSettings.numberOfParts, labSettings.areAllInOneDir);
        if (submissionRoot !== studentDirPath) {
            report += `Submission found in ${path.relative(studentDirPath, submissionRoot)}\n`;
        }

        // Loop for each part - if there are sub-parts we consider them to be additional parts
        for (let part = 1; part <= labSettings.numberOfParts; part++) {
            report += "\nPart" + part + "\n";
            const partDirPath = partDirs[part - 1];
            if (partDirPath === null) {
                report += `No folder found for part ${part}\n`;
                continue;
            }
            if(labSettings.isHTML)
            {
                // TODO: Rewrite checkSubmision and move some code into HtmlAndCssChecker
                // report +=  await checkers[0].checkSubmission(partDirPath, part)
                // We're still using the old checkSubmission function that also finds the right dirs and files
                report += await checkSubmission(
                    partDirPath,
                    "",
                    part,
                    labSettings,
                    checkers[0].requirements
                );
            }
            if(labSettings.isJavaScript)
            {
                report +=  await checkers[1].checkSubmission(partDirPath, part)
            }
        }

        // Open the report file for writing and get its file descriptor
        const fd = fs.openSync(
            path.join(labSettings.submissionsPath, studentDir, `${studentDir}_report.txt`), 'w');
        // Write the report to the file
        fs.writeFileSync(fd, report);
        // Close the file using its file descriptor
        fs.closeSync(fd);

        console.log(report);
    }  // End of for loop through student directories
}  // if param was not --help or undefined

/***************************/
/* End of the main program */
/***************************/


/** loadSettings function
* Load general settings from a csv requirements file
* (Specific requiremnts for HTML, CSS, JS, etc. loaded
* by a method in the classes that check those files.) 
* @param {string} requirementsFilePath - The csv requirements file name
*/
function loadSettings(requirementsFilePath) {
    const settings = [];
    /* settings array elements will hold these settings values:
        0: MacOsSubmissionPath (can be relative or absolute)
        1: WindowsSubmissionPath (can be relative or absolute)
        2: Number of lab parts (ie, Part 1, Part2, etc.)
        3: Lab Name (ie, Lab 1, Lab 2, etc.)
        4: Are all lab parts in one folder? (true or false)
        5: Check HTML files - TRUE or FALSE // TODO: separate HTML and CSS checks
        6. Check CSS files - TRUE or FALSE
        7: Check JavaScript files - TRUE or FALSE
    */
    try {
        const fileBuffer = fs.readFileSync(requirementsFilePath);
        csv()  // the .on function sets up lisetners
            .on("data", (row) =>    // row is an object containing the data from one row of the csv file
            {
                if (row.settings) {  // settings is the name of the column in the csv file
                    settings.push(row.settings);
                }
            })
            .on("error", (error) => {
                console.error(error);
            })
            .write(Buffer.from(fileBuffer));  // this sends data to the csv parser. csv-parser modifies the buffer it is given, so give it a copy

            // Copy settings to the labSettings object, using defaults for any missing values
            const parts = parseInt(settings[2], 10);
            labSettings.numberOfParts = Number.isNaN(parts) ? 1 : parts;
            labSettings.areAllInOneDir = parseBoolean(settings[4], true);
            labSettings.isHTML = parseBoolean(settings[5], false);  // Currenty for HTML & CSS
            labSettings.isCSS = parseBoolean(settings[6], false);  // Currently not used 3/10/24
            labSettings.isJavaScript = parseBoolean(settings[7], false);
        // Load requrirements
        if(labSettings) {
            let hcChecker = new HtmlAndCssChecker(Buffer.from(fileBuffer));
            checkers.push(hcChecker);
        }
        if(labSettings) {
            let jsChecker = new JsChecker(Buffer.from(fileBuffer), path.dirname(requirementsFilePath));
            checkers.push(jsChecker);
        }
    }
    catch (error) {
        console.error(`Error processing requirements file ${requirementsFilePath}: ${error.message}`);
        process.exit(1);
    }

    if (settings.length < 8) {
        console.warn(`Warning: ${requirementsFilePath} has ${settings.length} of the 8 expected values in its settings column. Defaults will be used for the missing ones.`);
    }

    const pathSetting = process.platform === "win32" ? settings[1] : settings[0];
    if (!pathSetting) {
        console.error(`Error: the settings column of ${requirementsFilePath} does not contain a submissions path for this platform.`);
        process.exit(1);
    }

    // Determine path to submissions folder
    if (process.platform === "darwin") {
        // if settings[0] has a relative path in it, append it to the path to the requirements file
        if (settings[0].startsWith("/"))  // an aboslute path is in settings
        {
            labSettings.submissionsPath = settings[0];
        }
        else  // a relative path is in settings
        {
            labSettings.submissionsPath = path.join(path.dirname(requirementsFilePath), settings[0]);
        }
    }
    else if (process.platform === "win32") {
        // if settings[1] has a relative path in it, append it to the path of the requirements file
        if (/^[a-zA-Z]:/.test(settings[1]) || settings[1] == "/" || settings[1] == "\\")  // absolute path in settings
        {
            labSettings.submissionsPath = settings[1];
        }
        else  // relative path in settings
        {
            labSettings.submissionsPath = path.join(path.dirname(requirementsFilePath), settings[1]);
        }
    }
} // End of loadSettings function

/** parseBoolean function
 * Convert a "true"/"false" string from the settings column to a boolean
 * @param {string|undefined} value - The text from the csv file (case-insensitive)
 * @param {boolean} defaultValue - Returned if value is missing or empty
 * @returns {boolean}
 */
function parseBoolean(value, defaultValue) {
    if (value === undefined || value === null || String(value).trim() === "") {
        return defaultValue;
    }
    return String(value).trim().toLowerCase() === "true";
}
