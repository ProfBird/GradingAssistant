import fs from "fs";
import csv from "csv-parser";
import path from "path";
import { Checker } from "./Checker.mjs";
import { HtmlAndCssChecker } from './HtmlAndCssChecker.mjs';
import { JsChecker } from './JsChecker.mjs';
import { checkSubmission } from "./SubmissionChecker.mjs";

/* Location of the files downloaded from Moodle and unzipped */
// Windows path:  G:/My Drive/Courses/CIS195/2023-Summer/LabXX/CIS195_Su23LabXSubmissions
// Mac OS path: /Volumes/GoogleDrive/My Drive/Courses/CIS195/2023-Summer/LabX/CIS195_Su23LabXSubmissions
// Alt Mac OS path: /Users/admin/Documents/CIS195/Lab05/CIS195_Su23Lab5Submissions

/* Expected folder structure */
// StudentName_file/LabX/<website files and folders>
// Or, if there are two parts and they are in separate folders:
// StudentName_file/Part1/<website files and folders>
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
const requirementsFileName = process.argv[2];
let overwrite = false;
let quitProgram = false;
console.log(`param = ${requirementsFileName}`);
switch (process.argv[3]) {
    case '--help':
        console.log("Usage: node TestAnyLab.mjs requirementsFileName.csv [options]");
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
    loadSettings(requirementsFileName);

    // Loop through all student subdirectories at submissionsPath and 
    // call methods to check submissions
    // studentDir will have a name like TyTitan_file
    for (const studentDir of fs
        .readdirSync(labSettings.submissionsPath)
        .filter((dir) => !dir.startsWith(".") && dir.endsWith("_file"))) {
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
        let report = message + "\n"; // Report of the checks of the files for this student
        let studentDirPath = path.join(labSettings.submissionsPath, studentDir)

        // Loop for each part
        for (let part = 1; part <= labSettings.numberOfParts; part++) {
            report += "\nPart" + part + "\n";
            if(labSettings.isHTML)
            {
                // TODO: Rewrite checkSubmision
            report += await checkSubmission(
                path.join(labSettings.submissionsPath, studentDir),
                "",
                part,
                labSettings.HtmlAndCssRequirements
            );
            }
            if(labSettings.isJavaScript)
            {
               // Assume the files for all parts are in studentDirPath
                report +=  await checkers[1].checkSubmission(studentDirPath,
                "",
                part)
            }
        }
        
        report += "\n";

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
* @param {string} requirementsFileName - The csv requirements file name
*/
function loadSettings(requirementsFileName) {
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
        const fileBuffer = fs.readFileSync(requirementsFileName);
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
            .write(fileBuffer);  // this sends data to the csv parser

            // Copy settings to the labSettings object
            labSettings.numberOfParts = settings[2];
            labSettings.areAllInOneDir = (settings[4].toLowerCase() == "true");
            labSettings.isHTML = (settings[5].toLowerCase() == "true");  // Currenty for HTML & CSS
            labSettings.isCSS = (settings[6].toLowerCase() == "true");  // Currently not used 3/10/24
            labSettings.isJavaScript = (settings[7].toLowerCase() == "true");
        // Load requrirements
        if(labSettings) {
            let hcChecker = new HtmlAndCssChecker(fileBuffer);
            checkers.push(hcChecker);
        }
        if(labSettings) {
            let jsChecker = new JsChecker(fileBuffer);
            checkers.push(jsChecker);
        }
    }
    catch (error) {
        console.error(`Error processing requirements file ${requirementsFileName}: ${error.message}`);
    }

    // Determine path to submissions folder
    if (process.platform === "darwin") {
        // if settings[0] has a relative path in it, append it to the path of the requirements file
        if (settings[0].startsWith("/"))  // aboslute path in settings
        {
            labSettings.submissionsPath = settings[0];
        }
        else  // relative path in settings
        {
            labSettings.submissionsPath = path.join(path.dirname(requirementsFileName), settings[0]);
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
            labSettings.submissionsPath = path.join(path.dirname(requirementsFileName), settings[1]);
        }
    }
} // End of loadSettings function




