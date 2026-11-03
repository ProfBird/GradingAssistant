import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { HtmlAndCssChecker } from './HtmlAndCssChecker.mjs';
import { JsChecker } from './JsChecker.mjs';
import { checkSubmission } from "./SubmissionChecker.mjs";
import { getPartDirs } from "./SubmissionFolders.mjs";
import { readRequirementsFile, parseBoolean } from "./Requirements.mjs";

export { parseBoolean };

/* Location of the files downloaded from the LMS and unzipped on dev machines */
// Windows path:  G:/My Drive/Courses/CIS195/2023-Summer/LabXX/CIS195_Su23LabXSubmissions
// Mac OS path: /Volumes/GoogleDrive/My Drive/Courses/CIS195/2023-Summer/LabX/CIS195_Su23LabXSubmissions
// Alt Mac OS path: /Users/admin/Documents/CIS195/Lab05/CIS195_Su23Lab5Submissions

/* Expected folder structure */
// StudentName/LabX/<website files and folders>
// Or, if there are two parts and they are in separate folders:
// StudentName/Part1/<website files and folders>
//                  Part2/<website files and folders>

/** The settings used when checking the files for one lab, from the settings column of the requirements file
 * @typedef {Object} LabSettings
 * @property {string} submissionsPath - Path to the folder containing the student submissions
 * @property {number} numberOfParts - Number of parts in this lab assignment
 * @property {boolean} areAllInOneDir - true if all lab parts are in one folder
 * @property {boolean} isHTML - true if this is an HTML and CSS lab
 * @property {boolean} isCSS - true if this is a CSS lab (not used yet)
 * @property {boolean} isJavaScript - true if this is a JavaScript lab
 */

/****************/
/* Main program */
/****************/

// Run the program only when this file is started with node, not when a test imports it
if (process.argv[1] && import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href) {
    await main(process.argv.slice(2));
}

/** main function
 * Check all the student submissions for a lab and write a report in each student's folder.
 * @param {Array<string>} args - Command line arguments after the program name:
 *   the requirements file path, then an optional option
 */
export async function main(args) {
    const { requirementsFilePath, overwrite, message, quitProgram } = parseArguments(args);
    console.log(`param = ${requirementsFilePath}`);
    if (message) {
        console.log(message);
    }
    if (quitProgram) {
        return;
    }

    let settings;
    try {
        settings = loadSettings(requirementsFilePath);
    } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
        return;
    }
    const { labSettings } = settings;
    const unwrittenReports = [];  // reports that could not be saved, so they can be listed at the end

    // Loop through all student subdirectories at submissionsPath and 
    // call methods to check submissions
    // Every directory is a student submission (Canvas), except hidden directories and
    // the Moodle online text directories (TyTitan_onlinetext, or TyTitanonlinetext after
    // UnzipFiles removes underscores), which are skipped.
    for (const studentDir of fs.readdirSync(labSettings.submissionsPath, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory()
            && !dirent.name.startsWith(".")
            && !dirent.name.toLowerCase().endsWith("onlinetext"))
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
        console.log(`Checking the ${studentDir} directory`);
        const report = await checkStudent(studentDir, settings);
        console.log(report);

        // A folder that can't be written to (like a read-only folder from a zip file) must not
        // stop the checks of the other students
        const reportPath = path.join(labSettings.submissionsPath, studentDir, `${studentDir}_report.txt`);
        try {
            // An existing report is kept as a backup before it is overwritten
            const backupPath = backupReport(reportPath, report);
            if (backupPath !== null) {
                console.log(`Saved the old report as ${path.basename(backupPath)}`);
            }
            fs.writeFileSync(reportPath, report);
        } catch (error) {
            console.error(`Could not save the report for ${studentDir}: ${error.message}`);
            unwrittenReports.push({ studentDir, reason: error.code === "EACCES" || error.code === "EPERM"
                ? "the folder is read-only" : error.message });
        }
    }  // End of for loop through student directories

    if (unwrittenReports.length > 0) {
        const count = unwrittenReports.length;
        console.error(`\nThe report${count === 1 ? "" : "s"} for ${count} student folder${count === 1 ? "" : "s"} could not be saved:`);
        for (const { studentDir, reason } of unwrittenReports) {
            console.error(`  ${studentDir} (${reason})`);
        }
        console.error("The reports are shown above. To save them, make the folders writable and run again with --overwrite.");
        process.exitCode = 1;
    }
}  // End of main function

/***************************/
/* End of the main program */
/***************************/

/** backupReport function
 * Copy an existing report to a backup file before it is overwritten. The backup is named
 * with the date and time the old report was saved, like TyTitan_report_backup_2026-11-02_21-30-05.txt,
 * so each overwrite keeps its own backup. No backup is made if there is no report yet,
 * or if the new report is the same as the old one.
 * @param {string} reportPath - Path to the report file
 * @param {string} newReport - The report that will be written
 * @returns {string|null} The path to the backup, or null if none was needed
 * @throws {Error} If the backup can't be made (then the old report must not be overwritten)
 */
export function backupReport(reportPath, newReport) {
    let oldReport;
    try {
        oldReport = fs.readFileSync(reportPath, "utf8");
    } catch (error) {
        if (error.code === "ENOENT") {
            return null;  // no report yet
        }
        throw error;
    }
    if (oldReport === newReport) {
        return null;
    }
    const savedAt = fs.statSync(reportPath).mtime;
    const pad = (number) => String(number).padStart(2, "0");
    const stamp = `${savedAt.getFullYear()}-${pad(savedAt.getMonth() + 1)}-${pad(savedAt.getDate())}_` +
        `${pad(savedAt.getHours())}-${pad(savedAt.getMinutes())}-${pad(savedAt.getSeconds())}`;
    const base = reportPath.replace(/\.txt$/, "") + "_backup_" + stamp;
    // Add a number if a backup with this time already exists
    let backupPath = base + ".txt";
    for (let n = 2; fs.existsSync(backupPath); n++) {
        backupPath = `${base}_${n}.txt`;
    }
    // COPYFILE_EXCL: never replace an existing file
    fs.copyFileSync(reportPath, backupPath, fs.constants.COPYFILE_EXCL);
    return backupPath;
}

/** parseArguments function
 * Interpret the command line arguments.
 * The option is optional. Without one, existing report files are not overwritten.
 * A missing requirements file path, or --help in its place, shows the help message.
 * @param {Array<string>} args - Command line arguments after the program name
 * @returns {{requirementsFilePath: (string|undefined), overwrite: boolean,
 *   message: (string|undefined), quitProgram: boolean}} message is text to display, if any.
 *   quitProgram is true if the program should not check any submissions.
 */
export function parseArguments(args) {
    const requirementsFilePath = args[0];  // absolute path including the file name
    const result = { requirementsFilePath, overwrite: false, message: undefined, quitProgram: false };
    switch (requirementsFilePath === undefined || requirementsFilePath === '--help'
        ? '--help' : args[1]) {
        case '--help':
            result.message = [
                "Usage: node TestAnyLab.mjs requirementsFilePath.csv [options]",
                "options:",
                "--help\t\tDisplay this help message",
                "--overwrite\tOverwrite existing report files",
            ].join("\n");
            result.quitProgram = true;  // exit the program after displaying the help message
            break;
        case undefined:  // no option given, run with the defaults
            break;
        case '--overwrite':
            result.overwrite = true;
            result.message = "Overwriting report files";
            break;
        default:
            result.message = `Unknown option: ${args[1]}`;
            result.quitProgram = true;
            break;
    }
    return result;
}

/** checkStudent function
 * Check one student's submission and make the report.
 * A problem with one student's files must not stop the checks of the other students,
 * so an error is written into that student's report instead of being thrown.
 * @param {string} studentDir - Name of the student's folder in the submissions folder
 * @param {{labSettings: LabSettings, htmlAndCssChecker: HtmlAndCssChecker, jsChecker: (JsChecker|null)}} settings
 *   Returned by loadSettings
 * @returns {Promise<string>} The report
 */
async function checkStudent(studentDir, { labSettings, htmlAndCssChecker, jsChecker }) {
    let report = `Checking the ${studentDir} directory\n`; // Report of the checks of the files for this student
    const studentDirPath = path.join(labSettings.submissionsPath, studentDir);

    try {
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
                // report +=  await htmlAndCssChecker.checkSubmission(partDirPath, part)
                // We're still using the old checkSubmission function that also finds the right dirs and files
                report += await checkSubmission(partDirPath, part, htmlAndCssChecker.requirements);
            }
            if(labSettings.isJavaScript)
            {
                report +=  await jsChecker.checkSubmission(partDirPath, part)
            }
        }
    } catch (error) {
        const errorMessage = `Error checking ${studentDir}: ${error.message}`;
        console.error(errorMessage);
        report += `\n${errorMessage}\nThis submission was not fully checked.\n`;
    }
    return report;
}  // End of checkStudent function

/** loadSettings function
* Load a csv requirements file: the general settings, and the checkers for the
* HTML, CSS, JS, etc. files. Warnings about the file are displayed.
* @param {string} requirementsFilePath - The csv requirements file name
* @param {string} [platform] - The operating system, like process.platform. Chooses which submissions path to use.
* @returns {{labSettings: LabSettings, htmlAndCssChecker: HtmlAndCssChecker, jsChecker: (JsChecker|null)}}
*   jsChecker is null unless this is a JavaScript lab.
* @throws {Error} If the file can't be read or has no submissions path for this platform
*/
export function loadSettings(requirementsFilePath, platform = process.platform) {
    let requirements;
    try {
        requirements = readRequirementsFile(requirementsFilePath);
    }
    catch (error) {
        throw new Error(`Error processing requirements file ${requirementsFilePath}: ${error.message}`);
    }
    for (const warning of requirements.warnings) {
        console.warn(warning);
    }

    const { settings } = requirements;
    /** @type {LabSettings} */
    const labSettings = {
        submissionsPath: getSubmissionsPath(settings, requirementsFilePath, platform),
        numberOfParts: settings.numberOfParts,
        areAllInOneDir: settings.areAllInOneDir,
        isHTML: settings.checkHtml,  // Currenty for HTML & CSS
        isCSS: settings.checkCss,  // Currently not used 3/10/24
        isJavaScript: settings.checkJavaScript,
    };
    const htmlAndCssChecker = new HtmlAndCssChecker(requirements);
    // The JavaScript checker is deprecated, so only load it for a JavaScript lab. It reads its own columns.
    const jsChecker = labSettings.isJavaScript
        ? new JsChecker(fs.readFileSync(requirementsFilePath), path.dirname(requirementsFilePath))
        : null;
    return { labSettings, htmlAndCssChecker, jsChecker };
} // End of loadSettings function

/** getSubmissionsPath function
 * Get the path to the folder holding the student submissions from the settings column.
 * A relative path is relative to the folder holding the requirements file.
 * @param {import("./Requirements.mjs").Settings} settings - From the settings column
 * @param {string} requirementsFilePath - The csv requirements file name
 * @param {string} platform - The operating system, like process.platform
 * @returns {string}
 * @throws {Error} If the settings have no submissions path for this platform
 */
export function getSubmissionsPath(settings, requirementsFilePath, platform) {
    // Windows uses the Windows path. Mac OS and other systems use the Mac OS path.
    const pathSetting = platform === "win32" ? settings.windowsSubmissionsPath : settings.macSubmissionsPath;
    if (!pathSetting) {
        throw new Error(`Error: the settings column of ${requirementsFilePath} does not contain a submissions path for this platform.`);
    }
    const pathModule = platform === "win32" ? path.win32 : path.posix;
    // if the setting is a relative path, append it to the path of the requirements file
    if (pathModule.isAbsolute(pathSetting) || (platform === "win32" && /^[a-zA-Z]:/.test(pathSetting))) {
        return pathSetting;
    }
    return pathModule.join(pathModule.dirname(requirementsFilePath), pathSetting);
}
