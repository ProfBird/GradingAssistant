# GradingAssistant

Node.js (ES modules, `.mjs`) tools that help grade student web-development labs. `TestAnyLab.mjs` checks each student's unzipped submission against a requirements `.csv` file and writes a `<studentDir>_report.txt` into each student's folder. It checks HTML and CSS now. JavaScript checking with Mocha is in progress. The user is an instructor (CIS 195 Web Authoring at Lane CC) and works solo, directly on `main`.

## Commands

```bash
npm start                                  # arrow-key menu (Menu.mjs) that runs the two programs below
npm test                                   # Mocha unit tests (test/*.test.mjs)
node TestAnyLab.mjs <requirements.csv> --overwrite   # check a lab; --help lists options
node TestAnyLab.mjs <requirements.csv> --submissions <folder>  # check this folder instead of the one in the file
node UnzipFiles.mjs <folder-holding-the-download.zip> # unzip every .zip in the folder (Canvas or Moodle)
npm run docs                               # JSDoc into docs/
```

`TestAnyLab.mjs` takes optional options after the requirements file, in any order: `--help`, `--overwrite` and `--submissions <folder>` (or `--submissions=<folder>`). Without `--overwrite` it skips students who already have a report; an unrecognized option prints "Unknown option" and quits. `--submissions` replaces the folder from the requirements file's `settings` column (so a file with no path for this platform works); a relative path is relative to the current folder, and a folder that doesn't exist stops the run with exit code 1 (`loadSettings()`'s third argument). With `--overwrite`, `backupReport()` first copies a changed report to `<studentDir>_report_backup_<date>_<time>.txt` (the old report's save time); if the backup fails, the report is not overwritten. `isJunk()` ignores both report and backup files. Each run writes `TestAnyLab_<date>_<time>.log` (made by `makeRunLog()`: start time, requirements file, count and list of students checked, not skipped ones) in the submissions folder; it's a file, so it's never mistaken for a student folder. Requirements files normally live in the CIS195-CourseMaterials repo (`LabAutoGrading/`), not in this repo. Each one has a path to the submissions folder in its `settings` column.

## Layout

| File | Role |
|---|---|
| `TestAnyLab.mjs` | Main program. `main()` runs only when the file is started with node (tests import it). `parseArguments()`, `loadSettings()` (reads the requirements file and makes the checkers) and `getSubmissionsPath()` are exported. Loops over student folders. Writes reports. |
| `Requirements.mjs` | **The only reader of the requirements csv** (except the deprecated `JsChecker`). `parseRequirements()` / `readRequirementsFile()` return named fields (`settings`, `moreRequirements`, `requiredElements1` as `{selector, minimum}`, `htmlRegExps` as `{pattern, description}`, ...) plus `warnings` (unknown columns, too few settings, non-numeric counts, unknown validator). `makeRequirements()` builds requirements for tests. |
| `SubmissionFolders.mjs` | Finds the folder that holds a submission (skips wrapper folders and junk) and splits it into parts. |
| `SubmissionChecker.mjs` | `checkSubmission(labDir, part, requirements)` returns the report text. `runChecks()` reads each HTML/CSS file once (contents, JSDOM, parsed CSS), passes it to every check, and returns structured results (`{files, sections}`); `formatReport()` is the only place report text is laid out. |
| `HtmlAndCssChecks.mjs` | The checks. Each `make...Check()` returns `{name, checkFile(file), summarize()}` with its own state; results are `{check, passed, message}` (`passed` is `null` for information like validator output). |
| `CssParser.mjs` | The only CSS reader. `parseStylesheet()` (external files, `<style>`) and `parseInlineStyle()` return `{rules, declarations}` tagged with their source. `findRequiredSelectors()` and `findRequiredProperties()` hold the matching rules. |
| `HtmlAndCssChecker.mjs` | Holds the parsed requirements for the HTML/CSS checks. `validateCSS` is here. |
| `HtmlValidators.mjs` | Pluggable HTML validators: `html-validate` (default), `w3c`, `vnu`. |
| `JsChecker.mjs`, `Checker.mjs` | JS checker (runs Mocha tests on student JS) and the base class. In progress. |
| `UnzipFiles.mjs` | Unzips LMS bulk downloads. Canvas (top-level files named `name_[LATE_]userid_submissionid_file`, see `parseCanvasFileName()`): `organizeCanvasDownload()` moves them into `name/` (`name_LATE`, `name_userid` for duplicate names). Moodle (a folder per student, `..._assignsubmission_file_`): `renameMoodleFolders()` strips digits, spaces and underscores, and merges into an existing folder on a rerun. Students' own archives (`isStudentArchive()`: `.zip`, `.7z`, `.rar`) are unzipped in their folders and deleted if that worked. `unzip()` runs `7z` on Windows, `unzip` for `.zip` and `tar` for `.7z`/`.rar` elsewhere (macOS `tar` is bsdtar, which reads them; GNU tar on Linux does not, so the archive is reported and kept), with `execFileSync` and an argument list, never a shell string, because file names come from students. `makeWritable()` adds owner write permission to everything it unzips (some zips store read-only folders, which blocked unzipping and saving reports). The main program runs only when started with node, so tests can import it. |
| `Menu.mjs` | `npm start`. Arrow-key menu (`@inquirer/prompts`, `inquirer-file-selector`) that builds and runs the TestAnyLab/UnzipFiles command lines as child processes. Recent choices (requirements files, download folders, and submissions folders chosen to override the requirements file) are in `.gradingassistant.json` (gitignored); `loadConfig()` falls back to defaults for a missing or bad file. If a program gets a new option, add a prompt for it here. |

## Requirements file layout

Each `.csv` row is one line, and each column holds a list of values. Empty cells are ignored.

- `settings` column, **by position**: 0 Mac submissions path, 1 Windows path, 2 number of parts, 3 lab name, 4 all parts in one folder?, 5 check HTML, 6 check CSS, 7 check JS. Missing values get defaults (`loadSettings`), and a file with fewer than 8 values prints a warning.
- `moreRequirements` column, **by position**: 0 special file name (e.g. `index`), 1 number of HTML files, 2 number of CSS files, 3 validate HTML (`false`, `true`, or `html-validate`/`w3c`/`vnu`), 4 validate CSS, 5 minimum number of CSS rules, 6 minimum number of distinct CSS properties (5 and 6 count external and embedded CSS, not inline styles; both optional; to set only 6, put 0 in 5 because empty cells are skipped).
- `number1` / `number2` columns: minimum number of each `requiredElements1` / `requiredElements2` element, summed across all of a student's files. Each number is read from the same row as its element; blank means 1.
- Regex checks use the `regExpForHTML1`, `regExpForHTML1Description`, `regExpForCSS1` and `regExpForCSS1Description` columns. Each description is read from the same row as its pattern. A pattern that isn't a valid regular expression gets a warning in `parseRequirements` and is left out; `makeRegExpCheck` compiles each pattern once and reports an invalid one as failed (only possible for requirements not made by the loader).
- Adding a check: write a `make...Check()` in `HtmlAndCssChecks.mjs` and add it to `makeHtmlAndCssChecks()` (the order there is the order in the report). `checkFile()` returns results to print under the file's name; `summarize()` returns a section or `null` to print nothing. Checks are made fresh for every student and part, so keep state inside the factory, never at module level. Report wording must stay byte-for-byte the same unless a change is intended, so compare reports from real submissions before and after.
- Adding a column or a `settings`/`moreRequirements` position: change `Requirements.mjs` (the `knownColumns` list, the typedefs and `parseRequirements`), then use the named field. Code outside the loader never reads columns or positions. Columns named `line`, `Notes`, `...Description` or left blank are notes and are not warned about.
- Older requirements files use earlier layouts and are not compatible. The examples in `docs/` (`ExampleLab1Requirements.csv`, `CIS195Lab06GradeAssist.csv`, `CIS195TermProjectGradeAssist.csv`) use the current layout; `test/ExampleRequirements.test.mjs` checks them, so update the examples and the test when the layout changes.

## Folder conventions (Canvas and Moodle)

- Every folder in the submissions folder is a student, except hidden folders and names ending in `onlinetext`. `UnzipFiles` produces both `X_onlinetext` and `Xonlinetext`, so match the suffix without the underscore.
- Submissions often have wrapper folders (`Student/Lab/Site/index.html`) and `MACOSX` junk. Always locate the files with `getPartDirs()`. Don't assume the student folder is the lab folder.
- Test against **copies** of real submissions (the user keeps `...-TestSubmissions` copies). A run writes report files into every student folder.

## Gotchas

- **`csv-parser` modifies the buffer you give it** (when it un-escapes `""`), and it keeps a leading byte order mark in the first column name. `parseCsv()` in `Requirements.mjs` handles both; only it and the deprecated `JsChecker` use `csv-parser`.
- A student folder can be read-only (from the zip, or copied from Drive). TestAnyLab prints that student's report, keeps going, and lists the folders it couldn't save at the end with exit code 1.
- The special file name check is strict on purpose. `index` accepts only `index.html` or `index.htm`; a name with an extension (`styles.css`) must match exactly. Names that merely contain it (`reindex.html`, `index.html.html`) fail. The case must match (`Index.html` fails), and a wrong-case name is reported separately from a missing file.
- The W3C validator service rejects bulk requests (HTTP errors with an HTML body). That is why `html-validate` is the default. `vnu-jar` 26.x needs Java 17 or newer, and the user's machine has Java 11. `vnu-jar@23.4.11` works on Java 11.
- Regex and element results are combined across a student's files. One match in any file passes.
- CSS selector and property matching is deliberately lenient in two ways, both kept from the old substring checks, which real requirement files rely on. A required selector matches as a whole part of a rule's selector (`nav` matches `nav a`, `body > header`). A required property name matches longhands that start with it (`border` matches `border-collapse`; Lab 7 requires `text`, which only `text-align` and similar can satisfy). It no longer matches inside other names (`.nav` vs `.navbar`, `color` vs `background-color`), in values, or in comments. Change `CssParser.mjs` to make it stricter.

## Code style

Match the surrounding code: 4-space indentation, JSDoc on functions, short explanatory comments. Add or update a Mocha test in `test/` for each bug fix or feature when practical (`*.test.mjs`, chai `expect`).

## Git

Work directly on `main` (solo project, no branches or PRs needed). Commit and push only when asked. Commit messages end with the attribution line given by the harness.
