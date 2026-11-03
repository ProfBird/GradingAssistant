import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { pathToFileURL } from 'url';
// using 7zip to u nzip files on Windows, official web site: https://www.7-zip.org/
// 7Zip docs here: https://documentation.help/7-Zip/start.htm
// using unzip to unzip files on Mac OS
// 7zip can be installed on Mac Os using Homebrew: brew install p7zip

// This module will unzip any submissions downloaded from the LMS (Canvas or Moodle)
// let submissionsPath = "G:/My Drive/Courses/CS133JS/23F/Labs";
// let submissionsPath = "/Users/birdb/Library/CloudStorage/GoogleDrive-birdb@lanecc.edu/My Drive/Courses/CIS195/2023-Fall/Labs"
let submissionsPath = "/Volumes/GoogleDrive/My Drive/Courses/CS133JS/23F/Labs";

// The downloaded submissions are expected to be in a zip file. Two layouts are handled:
//   Canvas: a file like "submissions.zip" that contains each student's files directly,
//       named like titanty_123_4567_Lab1.zip (or titanty_LATE_123_4567_Lab1.zip).
//       UnzipFiles puts each student's files in a folder named like titanty (titanty_LATE if late).
//   Moodle: a file with a name like "CS 133JS Sp23 (Bird 41334)-Lab 6 Production Version-3803210.zip"
//       that contains a folder for each student (Ty Titan_123_assignsubmission_file_), each holding
//       one or more .zip archives. UnzipFiles renames the folders like TyTitan_file.
// The students' .zip archives are then unzipped in their folders.


/****************/
/* Main program */
/****************/
const param = process.argv[2];
let overwrite = false;
// Run the program only when this file is started with node, not when a test imports it
const isMainProgram = process.argv[1] && import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href;
if (!isMainProgram)
{
    // Nothing to do: a test is using makeWritable
} else if (param === "--help" || param === undefined)
{
    console.log("Usage: node UnzipFiles.mjs folderPath [options]");
    console.log("folderPath is the folder that holds the downloaded zip file. If it contains spaces, enclose it in quotes");
    console.log('Example Windows path: \"G:/My Drive/Courses/CS133JS/23F/Labs\"');
    console.log('Example Mac OS path: \"/Volumes/GoogleDrive/My Drive/Courses/CIS195/2023-Fall/Labs\"');
    console.log("options:");
    console.log("--help\t\tDisplay this help message");
    console.log("--overwrite\tOverwrite existing unzipped files");
} else
{
    if (process.argv[3] === "--overwrite")
    {
        overwrite = true;
        console.log("Overwriting files");
    }
    // convert a Windows style path to a unix style path
    submissionsPath = param.replace(/\\/g, '/');
    // Unzip any submissions downloaded from the LMS into a new folder
    if (unzipFiles(submissionsPath))
    {
      console.log("Unzip completed succssfully.");   
    }
    else
    {
        console.log("No zip files found in " + submissionsPath);
    }
}

function unzipFiles(submissionsPath)
{
    let zipFilesFound = false;
    // Loop through all zip files in the submissionsPath directory
    for (const fileName of fs.readdirSync(submissionsPath))
    {
        if (fileName.toLowerCase().endsWith('.zip'))
        {
            zipFilesFound = true;
            const filePath = path.join(submissionsPath, fileName);
            const folderName = fileName.replace(/\.zip$/i, '');
            const allSubmissionsFolder = cleanSubmissionFolderName(folderName);
            const allSubmissionsFolderPath = path.join(submissionsPath, allSubmissionsFolder);

            // Create the folder if it doesn't exist
            if (!fs.existsSync(allSubmissionsFolderPath))
            {
                fs.mkdirSync(allSubmissionsFolderPath);
                console.log("Created folder " + allSubmissionsFolderPath);
            }

            // Unzip the file to the allSubmissionsFolderPath directory
            console.log((overwrite ? "Overwriting files on path " : "Skipping existing files on path ") + allSubmissionsFolderPath);
            unzip(filePath, allSubmissionsFolderPath, overwrite);

            // Some zip files store folders as read-only, which would stop the renaming below,
            // the unzipping of the students' zip files, and TestAnyLab from saving its reports
            makeWritable(allSubmissionsFolderPath);

            // Put each student's files in a folder of their own
            if (hasCanvasFiles(allSubmissionsFolderPath))
            {
                organizeCanvasDownload(allSubmissionsFolderPath, overwrite);
            }
            else
            {
                renameMoodleFolders(allSubmissionsFolderPath, overwrite);
            }

            // Unzip any zip files in each student folder
            for (const dirent of fs.readdirSync(allSubmissionsFolderPath, { withFileTypes: true }))
            {
                if (!dirent.isDirectory())
                {
                    continue;  // a file that isn't in a student folder
                }
                const studentFolderPath = path.join(allSubmissionsFolderPath, dirent.name);
                for (const studentFileName of fs.readdirSync(studentFolderPath))
                {
                    if (studentFileName.toLowerCase().endsWith('.zip'))
                    {
                        const studentZipPath = path.join(studentFolderPath, studentFileName);
                        // Keep the zip file if it couldn't be unzipped, so the student's work isn't lost
                        if (unzip(studentZipPath, studentFolderPath, overwrite))
                        {
                            fs.unlinkSync(studentZipPath);
                        }
                    }
                }
                // The students' zip files can have read-only folders too
                makeWritable(studentFolderPath);
            }
        }
    }
    return zipFilesFound;

    // Inner function //
    // Create a name for the folder that will hold the unzipped submissions
    function cleanSubmissionFolderName(folderName)
    {
        // Clean up the folder name. Example of new name: CIS195_Su23Lab3Submissions
        folderName = folderName.replace(/\([^)]*\)/g, '');
        folderName = folderName.replace(/Version.*/g, '');
        folderName = folderName.replace(/-/g, '');
        folderName = folderName.replace(/ /, '');
        folderName = folderName.replace(/ /, '_');
        folderName = folderName.replace(/ /g, '');
        // remove the number following the word Submission and add s to the end
        folderName = folderName.replace(/\d+$/, 's');
        return folderName;
    }
}

/** makeWritable function
 * Give the owner permission to change every folder and file in a folder (and the folder itself),
 * like chmod -R u+rwX. Symbolic links are not followed. Problems are reported, not thrown.
 * @param {string} dirPath
 */
export function makeWritable(dirPath)
{
    const addPermissions = (entryPath, isDirectory) =>
    {
        try
        {
            const { mode } = fs.statSync(entryPath);
            // read and write for the owner, and for a folder also permission to open it
            const wanted = mode | (isDirectory ? 0o700 : 0o600);
            if (wanted !== mode)
            {
                fs.chmodSync(entryPath, wanted);
            }
        }
        catch (error)
        {
            console.log(`Could not make ${entryPath} writable: ${error.message}`);
        }
    };
    addPermissions(dirPath, true);
    for (const dirent of fs.readdirSync(dirPath, { withFileTypes: true }))
    {
        const entryPath = path.join(dirPath, dirent.name);
        if (dirent.isDirectory())
        {
            makeWritable(entryPath);
        }
        else if (dirent.isFile())
        {
            addPermissions(entryPath, false);
        }
    }
}

/** unzip function
 * Unzip a file into a folder with 7-Zip on Windows or unzip on other systems.
 * The program is run directly, not through a shell, so student file names can't run commands.
 * @param {string} zipPath
 * @param {string} destination - Folder to unzip into
 * @param {boolean} overwriteExisting - Replace existing files, or skip them
 * @returns {boolean} true if it worked. A problem is reported, not thrown.
 */
function unzip(zipPath, destination, overwriteExisting)
{
    try
    {
        if (process.platform === "win32")
        {
            // 7Zip switches: x = extract with full paths, o = output dir, aoa = overwrite all, aos = skip existing
            execFileSync("7z", ["x", zipPath, `-o${destination}`, overwriteExisting ? "-aoa" : "-aos"], { stdio: "pipe" });
        }
        else
        {
            // -q = quiet, -o = overwrite existing files, -n = never overwrite (don't ask), -d = destination
            execFileSync("unzip", [overwriteExisting ? "-oq" : "-nq", zipPath, "-d", destination], { stdio: "pipe" });
        }
        return true;
    }
    catch (error)
    {
        const details = String(error.stderr ?? "").trim() || error.message;
        console.log(`Error unzipping ${path.basename(zipPath)}: ${details}`);
        return false;
    }
}

/** parseCanvasFileName function
 * Read a file name from a Canvas bulk download, like titanty_LATE_123_4567_Lab 1.zip:
 * the student's name (last name then first name, no spaces), LATE if it was turned in late,
 * the student's Canvas id, the submission id, and the name of the file the student turned in.
 * @param {string} fileName
 * @returns {{student: string, late: boolean, userId: string, submissionId: string, originalName: string}|null}
 *   null if the name isn't in that form
 */
export function parseCanvasFileName(fileName)
{
    const match = /^([^_\s]+)_(LATE_)?(\d+)_(\d+)_(.+)$/.exec(fileName);
    if (match === null)
    {
        return null;
    }
    return { student: match[1], late: match[2] !== undefined, userId: match[3], submissionId: match[4], originalName: match[5] };
}

/** hasCanvasFiles function
 * @param {string} folderPath - The folder the download was unzipped into
 * @returns {boolean} true if it has files named like a Canvas download (not in student folders yet)
 */
export function hasCanvasFiles(folderPath)
{
    return fs.readdirSync(folderPath, { withFileTypes: true })
        .some((dirent) => dirent.isFile() && parseCanvasFileName(dirent.name) !== null);
}

/** organizeCanvasDownload function
 * Move each file of a Canvas download into a folder for its student, with the Canvas
 * part of the name removed (titanty_123_4567_Lab1.zip becomes titanty/Lab1.zip).
 * The folder is named after the student, with _LATE added if the submission was late.
 * Two students with the same name get their Canvas id added (smithjo_11, smithjo_22).
 * @param {string} folderPath - The folder the download was unzipped into
 * @param {boolean} overwriteExisting - Replace a file the student folder already has, or keep it
 */
export function organizeCanvasDownload(folderPath, overwriteExisting)
{
    const files = fs.readdirSync(folderPath, { withFileTypes: true })
        .filter((dirent) => dirent.isFile())
        .map((dirent) => ({ fileName: dirent.name, canvas: parseCanvasFileName(dirent.name) }));
    const canvasFiles = files.filter((file) => file.canvas !== null);

    // Find the names used by more than one student, and the students who were late
    const userIdsByName = new Map();
    const lateUserIds = new Set();
    for (const { canvas } of canvasFiles)
    {
        userIdsByName.set(canvas.student, (userIdsByName.get(canvas.student) ?? new Set()).add(canvas.userId));
        if (canvas.late)
        {
            lateUserIds.add(canvas.userId);
        }
    }

    for (const { fileName, canvas } of canvasFiles)
    {
        let studentFolder = canvas.student;
        if (userIdsByName.get(canvas.student).size > 1)
        {
            studentFolder += `_${canvas.userId}`;
        }
        if (lateUserIds.has(canvas.userId))
        {
            studentFolder += "_LATE";
        }
        const studentFolderPath = path.join(folderPath, studentFolder);
        fs.mkdirSync(studentFolderPath, { recursive: true });
        const fromPath = path.join(folderPath, fileName);
        const toPath = path.join(studentFolderPath, canvas.originalName);
        if (fs.existsSync(toPath) && !overwriteExisting)
        {
            fs.rmSync(fromPath);  // the student folder already has this file
            continue;
        }
        fs.renameSync(fromPath, toPath);
    }

    for (const { fileName } of files.filter((file) => file.canvas === null))
    {
        console.log(`Left ${fileName} where it is: its name isn't like a Canvas submission (name_id_id_file)`);
    }
}

/** renameMoodleFolders function
 * Rename the unzipped student submission folders of a Moodle download so they are like: TyTitan_file
 * Only folders with Moodle's names are renamed, so running UnzipFiles again doesn't rename the
 * folders it already renamed. If the renamed folder already exists (from an earlier run), the
 * newly unzipped files are copied into it, replacing existing files only when overwriting.
 * @param {string} folderPath - The folder the download was unzipped into
 * @param {boolean} overwriteExisting
 */
function renameMoodleFolders(folderPath, overwriteExisting)
{
    for (const studentFolder of fs.readdirSync(folderPath))
    {
        if (!studentFolder.includes("assignsubmission"))
        {
            continue;  // renamed already
        }
        const oldPath = path.join(folderPath, studentFolder);
        const newFolderName = studentFolder.replace(/\d*/g, '').replace(/ /g, '').replace(/_/g, '').replace('assignsubmission', '_');
        const newPath = path.join(folderPath, newFolderName);
        try
        {
            if (fs.existsSync(newPath))
            {
                fs.cpSync(oldPath, newPath, { recursive: true, force: overwriteExisting });
                fs.rmSync(oldPath, { recursive: true });
            }
            else
            {
                fs.renameSync(oldPath, newPath);
            }
        }
        catch (error)
        {
            console.log(`Could not rename ${studentFolder} to ${newFolderName}: ${error.message}`);
        }
    }
}
