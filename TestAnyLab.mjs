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
const HtmlAndCssRequirements = {
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

    // Get settings from the settings array
    if (process.platform === "darwin")
    {
        // if settings[0] has a relative path in it, append it to the path of the requirements file
        if (settings[0].startsWith("/"))  // aboslute path in settings
        {
            submissionsPath = settings[0];
        }
        else  // relative path in settings
        {
            submissionsPath = path.join(path.dirname(requirementsFileName), settings[0]);
        }
    }
    else if (process.platform === "win32")
    {
        // if settings[1] has a relative path in it, append it to the path of the requirements file
        if (/^[a-zA-Z]:/.test(settings[1]) || settings[1] == "/" || settings[1] == "\\")  // absolute path in settings
        {
            submissionsPath = settings[1];
        }
        else  // relative path in settings
        {
            submissionsPath = path.join(path.dirname(requirementsFileName), settings[1]);
        }
    }

    numberOfParts = settings[2];
    areAllInOneDir = (settings[3].toLowerCase() === "true");
} // End of loadRequirements function

/********************************************************/
/* getSubDirectories                                        */
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
        // This code will start by assuming that students follwed instrucitons in terms of 
        // what dirs and subdirs to use.  If they did not, the code will try to figure out what they did.

        if (areAllInOneDir && parts == 1)
        {
            // TODO: Write this code
        }
        else if (areAllInOneDir && parts > 1)
        {
            // There are home page files for two or more parts are on studentDirPath
            // Find the file for each part and check it.
            await getLabPartFiles(studentDirPath);
        }
        else if (!areAllInOneDir && parts == 1)  // like lab 4 in fall 2023
        {
            // There is only one part.
            // There might be no subdirectory, see if there is a subdir in studentDir.
            // There might be nested subdirs in studentDir, 
            // like Lab4/Home/ with the lab files in Home

            // use a loop to read each subfolder of studentDir unitl one is found that has .html (or .htm) files in it
            // or there are no more subdirs
            let done = false;
            let subdirs = [];
            while (!done)
            {
                // get amy subfolders in the studentDirPath + labAssignmentSubDir
                const direntItems = fs.readdirSync(path.join(studentDirPath, labAssignmentSubDir),
                    { withFileTypes: true });
                // get just the subdirs in the studentDirPath which are not system directories
                subdirs = direntItems.filter((dirent) =>
                {
                    return dirent.isDirectory() && !dirent.name.startsWith("_") && !dirent.name.startsWith(".");
                });
                if (subdirs.length === 0)
                {
                    // There are no subdirs, so the lab files should be in studentDir
                    labAssignmentSubDir = "";
                    done = true;
                }
                else
                {
                    // There are subdirs, return the first one, if any, that contains an html file
                    const labAssignmentSubDirent = subdirs.find((subdirent) =>
                    {
                        const direntItems = fs.readdirSync(path.join(studentDirPath, labAssignmentSubDir, subdirent.name), { withFileTypes: true });
                        return direntItems.some((dirent) =>
                        {
                            return (dirent.name.toLowerCase().endsWith(".html") || dirent.name.toLowerCase().endsWith(".htm")) && dirent.isFile();
                        });
                    });

                    if (labAssignmentSubDirent)
                    {
                        done = true;  // we've found the lab subdir, so we're done
                        labAssignmentSubDir = path.join(labAssignmentSubDir, labAssignmentSubDirent.name);
                    }
                    else
                    {
                        labAssignmentSubDir = path.join(labAssignmentSubDir, subdirs[0].name);  // use the first subdir
                    }
                }
            }

            // check the lab files in the labAssignmentSubDir
            report += await checkSubmission(
                path.join(studentDirPath, labAssignmentSubDir),
                "", // assume there are multiple files to check
                1,  // there is only one lab part, number 1
                HtmlAndCssRequirements
            );

        }
        else if (!areAllInOneDir && parts > 1)   // Lab 3 in fall 2023 is like this
        {
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
                // There is no subfolder, so the lab files for both parts should be on studentDirPath
                labAssignmentSubDir = "";
            }
            // There is just one subdir, it might be the assignment dir with the lab part subdirs in it
            // or maybe the student just did one part and this is a sub-page or image subdir.
            else if (subfolders.length === 1)
            {
                // check to see if there are any html files on the studentDirPath, if so, 
                // the subdir is probably not a lab part subdir
                const htmlFiles = items.filter((dirent) =>
                {
                    const itemPath = path.join(studentDirPath, dirent.name);
                    return (dirent.name.toLowerCase().endsWith(".html")
                        || dirent.name.toLowerCase().endsWith(".htm"))
                        && fs.statSync(itemPath).isFile();
                });
                if (htmlFiles.length > 0)
                {
                    // The subdir is probably not a lab part subdir, 
                    // so the lab assignment and one part are probably directly on studentDirPath
                    report += `Error: the subfolder, ${subfolders[0].name}, isn't a lab part subfolder.`;
                    labAssignmentSubDir = "";
                }
                else
                {
                    // The subdir is probably the lab assignment dir with the lab part subdirs in it
                    labAssignmentSubDir = subfolders[0].name;
                }
            }
            // For all cases where there is a subfolder for each part
            for (let part = 1; part <= parts; part++)
            {
                report += "\nPart" + part + "\n";
                labPartSubDir = fs
                    .readdirSync(path.join(studentDirPath, labAssignmentSubDir))
                    .find(
                        (dir) => dir.toLowerCase().includes(part)
                    );
                // if a subdir for this part is defined, check it
                if (labPartSubDir)
                {
                    report += await checkSubmission(
                        path.join(studentDirPath, labAssignmentSubDir, labPartSubDir),
                        "",
                        part,
                        HtmlAndCssRequirements
                    );
                }
            }
        }

    } catch (error)
    {
        console.error(`Error reading directory ${studentDir}: ${error.message}`);
    }
    return report;


    /***************   inner function   *****************************/
    /* getLabPartFiles                                              */
    /* Gets the home page files for each part of the lab assignment */
    /****************************************************************/
    async function getLabPartFiles(
        assignmentDir   // The directory that should contain the subdirs for each part
    )
    {
        for (let part = 1; part <= parts; part++)
        {
            report += "\nPart" + part + "\n";
            // get the filename for this part (assume the name contains "Part")
            fileName = fs
                .readdirSync(assignmentDir)
                .find((file) => file.includes("Part" + part));

            report += await checkSubmission(
                assignmentDir,
                path.join(assignmentDir, fileName),
                (part === 1) ? HtmlAndCssRequirements.requiredElements1 : HtmlAndCssRequirements.requiredElements2,
                HtmlAndCssRequirements
            );
        }
    }
} // End of checkSubFolder function


