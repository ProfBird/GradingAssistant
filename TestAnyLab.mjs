import fs from "fs";
import csv from "csv-parser";
import path from "path";

import { checkSubmission } from "./SubmissionChecker.mjs";

/* Location of the files downloaded from Moodle and unzipped */
// Windows path:  G:/My Drive/Courses/CIS195/2023-Summer/LabXX/CIS195_Su23LabXSubmissions
// Mac OS path: /Volumes/GoogleDrive/My Drive/Courses/CIS195/2023-Summer/LabX/CIS195_Su23LabXSubmissions
// Alt Mac OS path: /Users/admin/Documents/CIS195/Lab05/CIS195_Su23Lab5Submissions

/* Expected folder structure */
// StudentName_file/LabX/<website files and folders>
// Or, if there are two parts:  
// StudentName_file/Part1/<website files and folders>
//                  Part2/<website files and folders>

/* global (ugh) constants and variables used for checking the files for this lab */
let submissionsPath = ""; // Path to the folder containing the student submissions
let numberOfParts = 1; // Number of parts in this lab assignment, set later in loadRequirements
let areAllInOneDir = true; // true if all parts are in one folder
// Required HTML elements for parts 1 and 2 (global scope)
const requiredElements1 = [];
const requiredElements2 = [];
// Required CSS selectors and properties (global scope)
const requiredCssSelectors = [];
const requiredCssProperties = [];
const additionalRequirements = [];
// Parallel arrays
const regularExpressions = [];
const regExpDescriptions = [];
// TODO: Change from parallel arrays to an array of objects
/*
// An object that contains a requirement and a description of the requirement
 const requirement = {
                         specification: "",
                          description: "" 
                    };
// array of requirement objects
const regExp = [];
*/

// Indexes into the additionalRequirements array
// 0: Number of parts in the lab assignment
// 1: Number of html files expected in the lab submission
// 2: If a special html file name is required, like index, it will be in the requirements file
// 3+: Regular expressions to search for in the html files


/****************/
/* Main program */
/****************/
const param = process.argv[2];
let overwrite = false;
console.log(`param = ${param}`);
if (param === "--help" || param === undefined)
{
    console.log("Usage: node TestAnyLab.mjs requirementsFileName.csv [options]");
    console.log("options:");
    console.log("--help\t\tDisplay this help message");
    console.log("--overwrite\tOverwrite existing report files");
} else
{
    if (process.argv[3] === "--overwrite")
    {
        overwrite = true;  // overwrite _report.txt files
        console.log("Overwriting report files");
    }
    loadRequirements(param);
    // Loop through all student subdirectories at the submissionsPath with dirs containing unzipped files
    // studentDir will have a name like TyTitan_file
    for (const studentDir of fs
        .readdirSync(submissionsPath)
        .filter((dir) => !dir.startsWith(".") && dir.endsWith("_file")))
    {
        // skip if studentDir contains a file ending in _report.txt
        if (fs.readdirSync(path.join(submissionsPath, studentDir))
            .find((file) => file.endsWith("_report.txt"))
            && !overwrite
        )
        {
            console.log(
                `Skipping ${studentDir} directory because it contains a report file`
            );
            continue;
        }
        let message = `Checking the ${studentDir} directory`;
        let report = message + "\n"; // Report of the checks of the files for this student
        report += await getSubDirectories(
            // all arguments except report and studentDir were set in loadRequirements
            numberOfParts,
            areAllInOneDir,
            submissionsPath,
            studentDir);
        report += "\n";

        // Open the report file for writing and get its file descriptor
        const fd = fs.openSync(
            path.join(submissionsPath, studentDir, `${studentDir}_report.txt`), 'w');
        // Write the report to the file
        fs.writeFileSync(fd, report);
        // Close the file using its file descriptor
        fs.closeSync(fd);

        console.log(report);
    }  // End of for loop through student directories
}  // if param was not --help
// end of main program


/*************************************/
/* Load requirements from a csv file */
/*************************************/
function loadRequirements(requirementsFileName)
{
    const settings = [];
    /* settings array elements will hold these settings values:
    0: MacOsSubmissionPath
    1: WindowsSubmissionPath
    2: LabName
    3: Are all parts in one folder? (true or false)
*/
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
                    requiredElements1.push(row.requiredElements1);
                }
                if (row.requiredElements2)
                {
                    requiredElements2.push(row.requiredElements2);
                }
                if (row.requiredCssSelectors)
                {
                    requiredCssSelectors.push(row.requiredCssSelectors);
                }
                if (row.requiredCssProperties)
                {
                    requiredCssProperties.push(row.requiredCssProperties);
                }
                if (row.moreRequirements)
                {
                    additionalRequirements.push(row.moreRequirements);
                }
                if (row.regExp)
                {
                    regularExpressions.push(row.regExp);
                }
                if (row.regExpDescription)
                {
                    regExpDescriptions.push(row.regExpDescription);
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

    // Get settings from the settings array
    if (process.platform === "darwin")
    {
        submissionsPath = settings[0];
    }
    else if (process.platform === "win32")
    {
        submissionsPath = settings[1];
    }

    numberOfParts = settings[2];
    areAllInOneDir = (settings[3].toLowerCase() === "true");
} // End of loadRequirements function

/********************************************************/
/* getSubFolders                                        */
/* Determines the path to each subfolder, one for       */
/* each lab part, and passes it to checkSubmission      */
/********************************************************/
async function getSubDirectories(
    parts,    // number of parts in the lab assignment
    areAllInOneDir, // true if all parts are in one folder
    submissionsPath,
    studentDir
)
{
    let studentDirPath = path.join(submissionsPath, studentDir);
    let labAssignmentSubDir = ""; // Sub-directory, if any, containing files or folders for all parts
    let labPartSubDir = ""; // Sub-directory containing the lab files for one part
    let fileName = ""; // Only used if multiple parts files are in one folder
    let report = ""; // Report of the checks of the files for this student done or called in this function
    try
    {

        if (areAllInOneDir && parts == 1)
        {
            // TODO: Write this code
        }
        else if (areAllInOneDir && parts > 1)
        {
            // There files for two or more parts in studentDirPath
            // Find the file for each part and check it.
            for (let part = 1; part <= parts; part++)
            {
                report += "\nPart" + part + "\n";
                // get the filename for this part (assume the name contains "Part")
                fileName = fs
                    .readdirSync(studentDirPath)
                    .find((file) => file.includes("Part" + part));

                report += await checkSubmission(
                    studentDirPath,
                    path.join(studentDirPath, fileName),
                    (part === 1) ? requiredElements1 : requiredElements2,
                    requiredCssSelectors,
                    requiredCssProperties,
                    regularExpressions,
                    regExpDescriptions,
                    additionalRequirements
                );
            }
        }
        else if (!areAllInOneDir && parts == 1)
        {
            // There is only one part 
            // There might be no subfolder, see if there is a subfolder in studentDir
            const items = fs.readdirSync(studentDirPath, { withFileTypes: true });
            const subfolders = items.filter((dirent) =>
            {
                const itemPath = path.join(studentDirPath, dirent.name);
                return fs.statSync(itemPath).isDirectory();
            });
            if (subfolders.length === 0)
            {
                // There is no subfolder, so the lab files are in the studentDir
                labPartSubDir = "";
            }
            else
            {  // There should be one lab subfolder, but there might be system subfolders, like __MACOSX

                labPartSubDir = subfolders.find((dirent) => !dirent.name.startsWith("_") && !dirent.name.startsWith("."))
                    .name;  // returns name of first valid dir found
            }
            report += await checkSubmission(
                path.join(studentDirPath, labPartSubDir),
                "", // assume there are multiple files to check
                requiredElements1,
                requiredCssSelectors,
                requiredCssProperties,
                regularExpressions,
                regExpDescriptions,
                additionalRequirements,
            );

        }
        else if (!areAllInOneDir && parts > 1)
        {
            // TODO: This still needs to be debugged
            // There shuld be two or more subfolders named Part1, Part2, etc.
            // But there might be one subfolder that contains the part1, part2, etc. subfolders
            const items = fs.readdirSync(studentDirPath, { withFileTypes: true });
            const subfolders = items.filter((dirent) =>
            {
                const itemPath = path.join(studentDirPath, dirent.name);
                return dirent.name[0] !== '.' && dirent.name[0] !== '_' && fs.statSync(itemPath).isDirectory();
            });
            if (subfolders.length === 0)
            {
                // There is no subfolder, so the lab files are in studentDir
                labAssignmentSubDir = "";
            }
            // there is just one subfolder, the lab part subfolders should be in it
            else if (subfolders.length === 1)
            {
                labAssignmentSubDir = subfolders[0].name;
            }

            // For all cases where ther is a subfolder for each part
            for (let part = 1; part <= parts; part++)
            {
                report += "\nPart" + part + "\n";
                labPartSubDir = fs
                    .readdirSync(path.join(studentDirPath, labAssignmentSubDir))
                    .find(
                        (dir) => dir.toLowerCase().includes(part)
                    );
                report += await checkSubmission(
                    path.join(studentDirPath, labAssignmentSubDir, labPartSubDir),
                    "",
                    (part === 1) ? requiredElements1 : requiredElements2,
                    requiredCssSelectors,
                    requiredCssProperties,
                    regularExpressions,
                    regExpDescriptions,
                    additionalRequirements
                );
            }
        }

    } catch (error)
    {
        console.error(`Error reading directory ${studentDir}: ${error.message}`);
    }
    return report;
} // End of checkSubFolder function


