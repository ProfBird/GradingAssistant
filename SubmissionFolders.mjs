import fs from "fs";
import path from "path";

/* Functions that locate the files of a student's submission inside the
   student's folder. Unzipped submissions often have one or more wrapper
   folders, like StudentName/Lab/index.html, or extra junk like __MACOSX. */

const archiveExtensions = /\.(zip|7z|rar|tar|gz)$/i;

/** isJunk function
 * Entries that are not part of a student's work and are ignored when deciding
 * where the submission is.
 * @param {fs.Dirent} dirent - Directory entry
 * @returns {boolean}
 */
function isJunk(dirent) {
    const name = dirent.name;
    return name.startsWith(".")                 // .DS_Store, .git, etc.
        || /^_*MACOSX$/i.test(name)             // __MACOSX, or MACOSX after UnzipFiles removes underscores
        || /_report\.txt$/i.test(name)          // report files written by this program
        || (dirent.isFile() && archiveExtensions.test(name));  // leftover zip files
}

/** findSubmissionRoot function
 * Find the folder that holds a student's submission. Starting at the student folder,
 * ignore junk entries. While the folder contains no files and exactly one sub-folder,
 * step into that sub-folder. Stops at a folder that has files or several sub-folders.
 * @param {string} studentDirPath - Path to the student's folder
 * @returns {string} Path to the folder that holds the submission (may be studentDirPath)
 */
export function findSubmissionRoot(studentDirPath) {
    const chain = unwrapChain(studentDirPath);
    return chain[chain.length - 1];
}

/** unwrapChain function
 * The folders visited by findSubmissionRoot, from the student folder to the submission root.
 * @param {string} studentDirPath - Path to the student's folder
 * @returns {Array<string>}
 */
function unwrapChain(studentDirPath) {
    const chain = [studentDirPath];
    for (;;) {
        const current = chain[chain.length - 1];
        const entries = fs.readdirSync(current, { withFileTypes: true })
            .filter((dirent) => !isJunk(dirent));
        const hasFiles = entries.some((dirent) => !dirent.isDirectory());
        const subDirs = entries.filter((dirent) => dirent.isDirectory());
        if (hasFiles || subDirs.length !== 1) {
            return chain;
        }
        chain.push(path.join(current, subDirs[0].name));
    }
}

/** getPartDirs function
 * Get the folder to check for each part of a lab.
 * If all parts are in one folder (or there is only one part), every part uses the
 * submission root. Otherwise the sub-folders of the root are the parts, in
 * natural order (website 1, website 2, website 10). A part with no folder gets null.
 * @param {string} studentDirPath - Path to the student's folder
 * @param {number} numberOfParts - Number of parts in the lab
 * @param {boolean} areAllInOneDir - true if all the parts are in one folder
 * @returns {{root: string, partDirs: Array<string|null>}}
 *   partDirs[0] is the folder for part 1, etc.
 */
export function getPartDirs(studentDirPath, numberOfParts, areAllInOneDir) {
    const chain = unwrapChain(studentDirPath);
    let root = chain[chain.length - 1];
    if (numberOfParts <= 1 || areAllInOneDir) {
        return { root, partDirs: Array(Math.max(numberOfParts, 1)).fill(root) };
    }
    let subDirs = listSubDirs(root);
    // A student who only submitted one part (Lab/Part1/index.html) was unwrapped past
    // the folder that holds the parts, so step back out to it.
    if (subDirs.length === 0 && chain.length > 1) {
        root = chain[chain.length - 2];
        subDirs = listSubDirs(root);
    }
    const partDirs = [];
    for (let i = 0; i < numberOfParts; i++) {
        partDirs.push(i < subDirs.length ? path.join(root, subDirs[i]) : null);
    }
    return { root, partDirs };
}

/** listSubDirs function
 * @param {string} dirPath
 * @returns {Array<string>} Names of the non-junk sub-folders in natural order
 */
function listSubDirs(dirPath) {
    return fs.readdirSync(dirPath, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory() && !isJunk(dirent))
        .map((dirent) => dirent.name)
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
}
