import fs from "fs";
import os from "os";
import path from "path";
import { spawn } from "child_process";
import { fileURLToPath, pathToFileURL } from "url";
import { select, confirm } from "@inquirer/prompts";
import { fileSelector } from "inquirer-file-selector";

/* A menu for running the programs in this project, so the command line options
   don't have to be remembered. Run it with: npm start (or node Menu.mjs)
   It builds the command line for TestAnyLab.mjs or UnzipFiles.mjs, shows it, and runs it.
   The recent choices are remembered in .gradingassistant.json in this folder. */

const appDir = path.dirname(fileURLToPath(import.meta.url));

/** Where the recent choices are saved */
export const configPath = path.join(appDir, ".gradingassistant.json");

/** How many recent files or folders to remember for each program */
const maxRecent = 8;

/** @typedef {Object} MenuConfig - The recent choices
 * @property {Array<string>} recentRequirementsFiles - Most recent first
 * @property {Array<string>} recentSubmissionsFolders - Folders holding LMS downloads to unzip, most recent first
 * @property {Array<string>} recentCheckedFolders - Folders of unzipped submissions chosen to check instead of the one in the requirements file, most recent first
 * @property {boolean} overwriteReports - The last answer to "Overwrite existing report files?"
 * @property {boolean} overwriteUnzipped - The last answer to "Overwrite existing unzipped files?"
 * @property {string} lastAction - "check" or "unzip"
 */

/****************/
/* Main program */
/****************/

// Run the menu only when this file is started with node, not when a test imports it
if (process.argv[1] && import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href) {
    try {
        await runMenu();
    } catch (error) {
        // Ctrl+C at a prompt
        if (error.name !== "ExitPromptError") {
            throw error;
        }
    }
}

/** runMenu function
 * Show the main menu until the user chooses Quit.
 */
async function runMenu() {
    console.log("GradingAssistant");
    for (;;) {
        const config = loadConfig();
        const action = await select({
            message: "What do you want to do?",
            default: config.lastAction,
            choices: [
                { name: "Check a lab", value: "check", description: "TestAnyLab: check the submissions against a requirements file" },
                { name: "Unzip an LMS download", value: "unzip", description: "UnzipFiles: unzip a Canvas or Moodle bulk download in a folder" },
                { name: "Quit", value: "quit" },
            ],
        });
        if (action === "quit") {
            return;
        }
        config.lastAction = action;
        if (action === "check") {
            await checkLab(config);
        } else {
            await unzipDownload(config);
        }
    }
}

/** checkLab function
 * Ask for a requirements file, the overwrite option and optionally a different submissions folder, then run TestAnyLab.
 * @param {MenuConfig} config
 */
async function checkLab(config) {
    const requirementsFile = await chooseRecentOrBrowse({
        message: "Requirements file:",
        recent: config.recentRequirementsFiles,
        browseLabel: "Browse for a requirements file...",
        browse: (basePath) => fileSelector({
            message: "Choose the requirements .csv file (Enter to choose, → to open a folder, ← to go up, Esc to cancel):",
            basePath,
            type: "file",
            filter: (item) => item.isDirectory || item.name.toLowerCase().endsWith(".csv"),
            allowCancel: true,
        }),
    });
    if (requirementsFile === null) {
        return;
    }
    const overwrite = await confirm({ message: "Overwrite existing report files?", default: config.overwriteReports });

    // Usually the requirements file says where the submissions are
    let submissionsFolder;
    if (await confirm({ message: "Check a different submissions folder than the one in the requirements file?", default: false })) {
        submissionsFolder = await chooseRecentOrBrowse({
            message: "Folder with the unzipped submissions:",
            recent: config.recentCheckedFolders,
            browseLabel: "Browse for a folder...",
            browse: (basePath) => fileSelector({
                message: "Choose the folder that holds the students' folders (Enter to choose, → to open, ← to go up, Esc to cancel):",
                basePath,
                type: "directory",
                allowCancel: true,
            }),
        });
        if (submissionsFolder === null) {
            return;
        }
        config.recentCheckedFolders = addRecent(config.recentCheckedFolders, submissionsFolder);
    }

    config.recentRequirementsFiles = addRecent(config.recentRequirementsFiles, requirementsFile);
    config.overwriteReports = overwrite;
    saveConfig(config);
    await runProgram("TestAnyLab.mjs", buildArguments(requirementsFile, overwrite, submissionsFolder));
}

/** unzipDownload function
 * Ask for the folder holding the LMS download and the overwrite option, then run UnzipFiles.
 * @param {MenuConfig} config
 */
async function unzipDownload(config) {
    const folder = await chooseRecentOrBrowse({
        message: "Folder with the downloaded zip file:",
        recent: config.recentSubmissionsFolders,
        browseLabel: "Browse for a folder...",
        browse: (basePath) => fileSelector({
            message: "Choose the folder that holds the downloaded .zip file (Enter to choose, → to open, ← to go up, Esc to cancel):",
            basePath,
            type: "directory",
            // Show the zip files too, so it's clear which folder holds the download
            filter: (item) => item.isDirectory || item.name.toLowerCase().endsWith(".zip"),
            allowCancel: true,
        }),
    });
    if (folder === null) {
        return;
    }
    const overwrite = await confirm({ message: "Overwrite existing unzipped files?", default: config.overwriteUnzipped });

    config.recentSubmissionsFolders = addRecent(config.recentSubmissionsFolders, folder);
    config.overwriteUnzipped = overwrite;
    saveConfig(config);
    await runProgram("UnzipFiles.mjs", buildArguments(folder, overwrite));
}

/** chooseRecentOrBrowse function
 * Let the user pick one of the recent paths that still exist, or browse for another.
 * @param {Object} options
 * @param {string} options.message
 * @param {Array<string>} options.recent - Recent paths, most recent first
 * @param {string} options.browseLabel - The menu choice that opens the file picker
 * @param {function(string): Promise<{path: string}|null>} options.browse - Opens the file picker at a folder
 * @returns {Promise<string|null>} The chosen path, or null to go back to the main menu
 */
async function chooseRecentOrBrowse({ message, recent, browseLabel, browse }) {
    const existing = recent.filter((recentPath) => fs.existsSync(recentPath));
    let choice = "browse";
    if (existing.length > 0) {
        choice = await select({
            message,
            choices: [
                ...existing.map((recentPath) => ({ name: shortenPath(recentPath), value: recentPath })),
                { name: browseLabel, value: "browse" },
                { name: "Back", value: "back" },
            ],
        });
    }
    if (choice === "back") {
        return null;
    }
    if (choice !== "browse") {
        return choice;
    }
    // Start the file picker where the last choice was
    const start = existing.length > 0 ? path.dirname(existing[0]) : os.homedir();
    const item = await browse(start);
    return item === null ? null : item.path;
}

/** runProgram function
 * Show the command, then run it with its output going straight to the terminal.
 * @param {string} script - TestAnyLab.mjs or UnzipFiles.mjs
 * @param {Array<string>} args - The command line arguments
 * @returns {Promise<number|null>} The exit code
 */
async function runProgram(script, args) {
    console.log(`\nRunning: node ${script} ${args.map(quoteForDisplay).join(" ")}\n`);
    // Ctrl+C stops the program, and the menu keeps running
    const ignoreInterrupt = () => { };
    process.on("SIGINT", ignoreInterrupt);
    try {
        const exitCode = await new Promise((resolve, reject) => {
            const child = spawn(process.execPath, [path.join(appDir, script), ...args], { cwd: appDir, stdio: "inherit" });
            child.on("error", reject);
            child.on("close", resolve);
        });
        console.log(exitCode === 0 ? `\n${script} finished.\n` : `\n${script} stopped (exit code ${exitCode}).\n`);
        return exitCode;
    } finally {
        process.off("SIGINT", ignoreInterrupt);
    }
}

/** buildArguments function
 * @param {string} target - The requirements file or the download folder
 * @param {boolean} overwrite
 * @param {string} [submissionsFolder] - For TestAnyLab: a submissions folder to use instead of the one in the requirements file
 * @returns {Array<string>} The command line arguments for TestAnyLab or UnzipFiles
 */
export function buildArguments(target, overwrite, submissionsFolder) {
    const args = overwrite ? [target, "--overwrite"] : [target];
    if (submissionsFolder) {
        args.push("--submissions", submissionsFolder);
    }
    return args;
}

/** addRecent function
 * @param {Array<string>} recent - Most recent first
 * @param {string} item
 * @returns {Array<string>} A new list with the item first, without duplicates, and at most maxRecent long
 */
export function addRecent(recent, item) {
    return [item, ...recent.filter((other) => other !== item)].slice(0, maxRecent);
}

/** loadConfig function
 * Read the recent choices. A missing or unreadable file gives the defaults.
 * @param {string} [filePath]
 * @returns {MenuConfig}
 */
export function loadConfig(filePath = configPath) {
    const defaults = {
        recentRequirementsFiles: [],
        recentSubmissionsFolders: [],
        recentCheckedFolders: [],
        overwriteReports: false,
        overwriteUnzipped: false,
        lastAction: "check",
    };
    let saved = {};
    try {
        saved = JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch (error) {
        if (error.code !== "ENOENT") {
            console.warn(`Warning: could not read ${filePath} (${error.message}). Starting with no recent choices.`);
        }
    }
    const config = { ...defaults };
    // Keep only values of the right type, so a hand-edited file can't break the menu
    for (const key of Object.keys(defaults)) {
        const value = saved?.[key];
        if (Array.isArray(defaults[key])) {
            if (Array.isArray(value)) {
                config[key] = value.filter((item) => typeof item === "string").slice(0, maxRecent);
            }
        } else if (typeof value === typeof defaults[key]) {
            config[key] = value;
        }
    }
    return config;
}

/** saveConfig function
 * @param {MenuConfig} config
 * @param {string} [filePath]
 */
export function saveConfig(config, filePath = configPath) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(config, null, 4) + "\n");
    } catch (error) {
        console.warn(`Warning: could not save the recent choices in ${filePath} (${error.message}).`);
    }
}

/** shortenPath function
 * @param {string} fullPath
 * @returns {string} The path with the home folder shown as ~
 */
function shortenPath(fullPath) {
    const home = os.homedir();
    return fullPath.startsWith(home + path.sep) ? "~" + fullPath.slice(home.length) : fullPath;
}

/** quoteForDisplay function
 * @param {string} arg
 * @returns {string} The argument in quotes if it has spaces, for showing the command
 */
function quoteForDisplay(arg) {
    return /\s/.test(arg) ? `"${arg}"` : arg;
}
