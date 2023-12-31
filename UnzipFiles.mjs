import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
// using 7zip to u nzip files on Windows, official web site: https://www.7-zip.org/
// 7Zip docs here: https://documentation.help/7-Zip/start.htm
// using unzip to unzip files on Mac OS
// 7zip can be installed on Mac Os using Homebrew: brew install p7zip

// This module will unzip any submissions downloaded from Moodle
// let submissionsPath = "G:/My Drive/Courses/CS133JS/23F/Labs";
// let submissionsPath = "/Users/birdb/Library/CloudStorage/GoogleDrive-birdb@lanecc.edu/My Drive/Courses/CIS195/2023-Fall/Labs"
let submissionsPath = "/Volumes/GoogleDrive/My Drive/Courses/CS133JS/23F/Labs";

// The downloaded submissions are expected to be in a file with a name like: 
// "CS 133JS Sp23 (Bird 41334)-Lab 6 Production Version-3803210.zip"
// The above zip file is expected to contain:
//     One or more .zip archives containing:
//         One or more web site folders.


/****************/
/* Main program */
/****************/
const param = process.argv[2];
let overwrite = false;
if (param === "--help" || param === undefined)
{
    console.log("Usage: node UnzipFiles.mjs filePath [options]");
    console.log("Note: if the file path contains spaces, enclose it in quotes");
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
    // Unzip any submissions downloaded from Moodle into a new folder
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
        if (fileName.endsWith('.zip'))
        {
            zipFilesFound = true;
            const filePath = path.join(submissionsPath, fileName);
            const folderName = fileName.replace('.zip', '');
            const allSubmissionsFolder = cleanSubmissionFolderName(folderName);
            const allSubmissionsFolderPath = path.join(submissionsPath, allSubmissionsFolder);

            // Create the folder if it doesn't exist
            if (!fs.existsSync(allSubmissionsFolderPath))
            {
                fs.mkdirSync(allSubmissionsFolderPath);
                console.log("Created folder " + allSubmissionsFolderPath);
            }

            // Unzip the file to the allSubmissionsFolderPath directory
            try
            {
                let command = "";
                //check for windows os
                if (process.platform === "win32") // Windows
                {
                    // 7Zip switches: x = extract with full paths, o = output dir, aoa = overwrite all, aos = skip existing
                    if (overwrite)
                    {
                        console.log("Overwriting files on path " + allSubmissionsFolderPath);
                        command = `7z x "${filePath}" -o"${allSubmissionsFolderPath}" -aoa`;
                    }
                    else
                    {
                        console.log("Skipping existing files on path " + allSubmissionsFolderPath);
                        command = `7z x "${filePath}" -o"${allSubmissionsFolderPath}" -aos`;
                    }
                    execSync(command);
                }
                else if (process.platform === "darwin") // Mac OS
                {
                    // using unzip on Mac OS
                    // -q = quiet, -d = destination directory, -o = overwrite existing files
                    if (overwrite)
                    {
                        console.log("Overwriting files on path " + allSubmissionsFolderPath);
                        command = `unzip -oq "${filePath}" -d "${allSubmissionsFolderPath}"`;
                    }
                    else
                    {
                        console.log("Skipping existing files on path " + allSubmissionsFolderPath);
                        command = `unzip -q "${filePath}" -d "${allSubmissionsFolderPath}"`;
                    }
                    execSync(command);
                }
            }
            catch (error)
            {
                console.log(`Error unzipping ${fileName}: ${error.message}`);
            }

            // Rename the unzipped student submission folders so they are like: TyTitan_file
            fs.readdirSync(allSubmissionsFolderPath).forEach((studentFolder) =>
            {
                const oldPath = path.join(allSubmissionsFolderPath, studentFolder);
                const newFolderName = studentFolder.replace(/\d*/g, '').replace(/ /g, '').replace(/_/g, '').replace('assignsubmission', '_');
                const newPath = path.join(allSubmissionsFolderPath, newFolderName);
                fs.renameSync(oldPath, newPath);
            });

            // Unzip any folders in each student folder
            fs.readdirSync(allSubmissionsFolderPath).forEach((studentFolder) =>
            {
                const studentFolderPath = path.join(allSubmissionsFolderPath, studentFolder);
                fs.readdirSync(studentFolderPath).forEach((fileName) =>
                {
                    if (fileName.endsWith('.zip'))
                    {

                        const filePath = path.join(studentFolderPath, fileName);
                        /*  const folderName = fileName.replace('.zip', '');
                          const folderPath = path.join(studentFolderPath, folderName);
  
                          // Create the folder if it doesn't exist
                          if (!fs.existsSync(folderPath))
                          {
                              fs.mkdirSync(folderPath);
                          }
                          */
                        // Unzip the file to the folderPath directory
                        try
                        {
                            //check for windows os
                            if (process.platform === "win32") // Windows
                            {
                                const command = `7z x "${filePath}" -o"${studentFolderPath}" -aoa`;
                                execSync(command);
                            }
                            else if (process.platform === "darwin") // Mac OS
                            {
                                // using unzip on Mac OS
                                const command = `unzip -q "${filePath}" -d "${studentFolderPath}"`;
                                execSync(command);
                            }
                        }
                        catch (error)
                        {
                            console.log(`Error unzipping ${fileName}: ${error.message}`);
                        }

                        // Delete the zip file
                        fs.unlinkSync(filePath);
                    }
                });
            });
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
