# GradingAssistant

Software that automates some of the more tedious aspects of grading web-development homework. It checks each student's submission against a requirements file and writes a text report into the student's folder. It does not assign grades; it handles the repetitive checks so the instructor can concentrate on the parts that need judgement.

It currently checks **HTML and CSS**. **JavaScript** checking, which runs Mocha unit tests against a student's `.js` file, is working but still in progress. The checks include:

- Syntax
- Presence of required features
- Some aspects of coding style
- Functionality of the code (JavaScript, in progress)

## Introduction

I initially wrote this software to check web pages containing HTML and CSS for my [CIS 195 Web Authoring](https://github.com/LCC-CIT/CIS195-CourseMaterials) course at Lane Community College (LCC). This is my first Node.js project and I'm still learning.

I am expanding the software to check JavaScript code for my [CS 133JS Beginning JavaScript Programming](https://github.com/LCC-CIT/CS133JS-CourseMaterials) course, and refactoring it to be more modular with ES6 classes. That work has been merged into `main`; the older `HtmlCssAndJsCheckers` branch is no longer where development happens.

There are two programs in this repository:

- [UnzipFiles](#unzipfiles-program) unzips assignment files that were bulk downloaded from [Moodle](https://moodle.com/), the LMS we use at LCC.
- [TestAnyLab](#testanylab-program) is a customizable test runner that checks all the unzipped assignment files against the requirements. The requirements for each assignment are specified in a `.csv` file.

## Getting started

You need [Node.js](https://nodejs.org/) (the code uses ES modules, `.mjs`). Then install the dependencies:

```bash
npm install
```

Other commands:

```bash
npm test        # run the Mocha unit tests in test/
npm run docs    # generate JSDoc documentation into docs/
```

------------

## UnzipFiles Program

A Node program for unzipping files that have been bulk downloaded from the Moodle Learning Management System.

### Usage

```bash
node UnzipFiles.mjs filePath [options]
```

- `filePath`
  If the file path contains spaces, enclose it in quotes. For example:
  - Windows path: `"G:/My Drive/Courses/CS133JS/23F/Labs/Lab01.zip"`
  - Mac OS path: `"/Volumes/GoogleDrive/My Drive/Courses/CIS195/2023-Fall/Labs/Lab01.zip"`
- options
  - `--help` Display the help message
  - `--overwrite` Overwrite existing unzipped files

### Downloaded zip file expectations

The downloaded submissions are expected to be in a zip file. That zip file is expected to contain one or more .zip archives, one or two for each student. Each archive may contain one or more sub-folders.

UnzipFiles renames the student folders by stripping digits, spaces and underscores from the names Moodle gives them (for example `TyTitan_file`), and it unzips with:

- On Windows: [7-Zip](https://www.7-zip.org/) (`7z` must be on the path)
- On Mac OS: `unzip` (built in)

  If you want to use 7-Zip on Mac OS, it can be installed using Homebrew: `brew install p7zip`

-----------

## TestAnyLab Program

TestAnyLab checks the lab assignments unzipped by UnzipFiles. It loops over the student folders in the submissions folder and writes a report file, `<studentFolder>_report.txt`, into each one.

### Running the program

```bash
node TestAnyLab.mjs requirementsFileName.csv [option]
```

- `requirementsFileName.csv` is the path to the requirements file, including the file name.
- The option is optional. Without one, the lab is checked and folders that already contain a `_report.txt` file are skipped. The options are:
  - `--help` displays a help message
  - `--overwrite` overwrites existing report files. Without it, folders that already contain a `_report.txt` file are skipped.

Requirements files normally live in the [CIS195-CourseMaterials](https://github.com/LCC-CIT/CIS195-CourseMaterials) repo (in `LabAutoGrading/`), not in this repo. Each one has the path to its submissions folder in its `settings` column.

Because a run writes a report file into every student folder, it is a good idea to try the program on a **copy** of the submissions first.

### Expected folder structure

`StudentName/LabX/<website files and folders>`

Or, if there are two parts to the lab assignment:

```
StudentName/Part1/<website files and folders>
            Part2/<website files and folders>
```

- Every folder in the submissions folder is treated as one student's submission, except hidden folders and folders whose names end in `onlinetext` (Moodle online-text submissions, with or without an underscore before it).
- Wrapper folders are skipped automatically. Starting at the student's folder, TestAnyLab steps into the single sub-folder while a folder has no files (ignoring `__MACOSX`, hidden files, zip files and `_report.txt` files), so `StudentName/Lab/index.html` and `StudentName/Lab/Site/index.html` both work.
- If a lab has several parts and they are not all in one folder (the "all parts in one folder" setting is FALSE), the sub-folders are used as the parts in name order (`website 1`, `website 2`, ...).
- The report notes where the submission was found.

### Current capabilities

HTML and CSS are checked statically. JavaScript is checked by running Mocha unit tests. See the [Roadmap](docs/GradeAssistRoadmap.md) for plans to add more capabilities.

#### HTML and CSS requirements

- HTML
  - Elements: check for specific required elements
  - Attributes: check for specific required attributes in particular elements
  - Syntax: check HTML syntax with a choice of validators (see [HTML validators](#html-validators))
- CSS
  This works for external, embedded and inline CSS.
  - Selectors, including complex selectors
  - Properties
  - Syntax
- Number of HTML files and number of CSS files
- Regular expression searches of the HTML or CSS code
- Existence of special file names, like `index.html`. The name must match exactly, including upper/lower case. A name without an extension, like `index`, accepts `index.html` or `index.htm`. Names that merely contain it (`reindex.html`, `index.html.html`) fail. A file with the wrong case, like `Index.html`, is reported separately from a missing file.

Elements, regular expression and selector results are combined across all of a student's files: one match in any file passes.

#### JavaScript requirements (in progress)

JsChecker runs a Mocha test file against one student file per lab part. The requirements file names the test file in an `unitTests` column and the student file in a `filesToTest` column (one row per part). The unit test path is relative to the requirements file. The student file's path is passed to the tests in the `TESTED_FILE` environment variable. Checking JavaScript that is embedded in HTML (`<script>` elements) with Puppeteer is started but not finished.

### Requirements file

A requirements file configures the program for a particular lab assignment. It can be written in a spreadsheet and then saved in .csv format. In the file, each row is one line and each column holds a list of values. Empty cells are ignored.

Some of the columns are read **by position**:

`settings` column:

| Position | Value |
|---|---|
| 0 | Mac OS submissions path (absolute, or relative to the requirements file) |
| 1 | Windows submissions path (absolute, or relative to the requirements file) |
| 2 | Number of parts |
| 3 | Lab name |
| 4 | Are all parts in one folder? |
| 5 | Check HTML |
| 6 | Check CSS |
| 7 | Check JavaScript |

Missing values get defaults, and a file with fewer than 8 settings values prints a warning.

`moreRequirements` column:

| Position | Value |
|---|---|
| 0 | Special file name (for example `index`) |
| 1 | Number of HTML files |
| 2 | Number of CSS files |
| 3 | Validate HTML (`false`, `true`, or `html-validate` / `w3c` / `vnu`) |
| 4 | Validate CSS |

Other columns used for HTML and CSS checks are `requiredElements1` and `requiredElements2`, `requiredCssSelectors`, `requiredCssProperties`, and the parallel lists `regExpForHTML1` / `regExpForHTML1Description` and `regExpForCSS1` / `regExpForCSS1Description`. The JavaScript columns are `unitTests` and `filesToTest`.

Older requirements files use earlier layouts and are not compatible. See the `docs` folder for examples ([Lab 6](docs/CIS195Lab06GradeAssist.csv), [term project](docs/CIS195TermProjectGradeAssist.csv)). Note that [ExampleJsRequirementsTable.md](docs/ExampleJsRequirementsTable.md) describes an older layout.

### HTML validators

The HTML syntax check is chosen by the "Validate HTML" value in the `moreRequirements` column of the requirements file:

| Value | Validator |
|---|---|
| `false` | HTML is not validated |
| `true` or `html-validate` | [html-validate](https://html-validate.org/) npm package (default). Runs locally, is fast, and needs no network or Java. Uses its `standard` rules, so messages differ from the W3C validator's. |
| `w3c` | The W3C validator web service. Needs a network connection, and the service may reject bulk checks of many files. |
| `vnu` | The W3C Nu validator (`vnu.jar`, from the `vnu-jar` npm package) run locally. Gives the same results as the W3C service. The current `vnu-jar` 26.x needs Java 17 or newer; `vnu-jar@23.4.11` works on Java 11. |

If a validator can't run, the report says `Could not validate <file>` and the reason, and the rest of the checks continue. Validators are in `HtmlValidators.mjs`; add a function to its `validators` table to add another.

### Output

A text file with a summary report is saved in each student's folder. Here is an example of a summary report:

```
Checking the TyTitan directory
Checking the about.html file
error error found on line 28 column 39: Bad value “contact us.html” for attribute “href” on element “a”: Illegal character in path segment: space is not allowed.
info error found on line 15 column 25: Section lacks heading. Consider using “h2”-“h6” elements to add identifying headings to all sections, or else use a “div” element instead for any cases where no heading is needed.
Checking the css/style.css file
No errors found in css/style.css
Checking the index.html file
No errors found in index.html

Missing 6 required elements
Missing style element
Missing header element
Missing nav element
Missing figure element
Missing table th element
Missing article element
All required CSS selectors found
Additional requirements:
All additional requirements met
Regular expression searches in HTML files:
Missing Comment in head in files
```

## Code layout

| File | Role |
|---|---|
| `TestAnyLab.mjs` | Main program. Reads the `settings` column, loops over student folders and writes the reports. |
| `SubmissionFolders.mjs` | Finds the folder that holds a submission (skipping wrapper folders and junk) and splits it into parts. |
| `SubmissionChecker.mjs` | Old-style `checkSubmission()` that does the HTML and CSS checks. Being moved into `HtmlAndCssChecker`. |
| `HtmlAndCssChecker.mjs` | Loads the HTML and CSS requirements from the csv file. CSS validation is still here. |
| `HtmlValidators.mjs` | Pluggable HTML validators: `html-validate`, `w3c`, `vnu`. |
| `JsChecker.mjs`, `Checker.mjs` | The JavaScript checker (runs Mocha tests on student JS) and the base class. In progress. |
| `UnzipFiles.mjs` | Unzips Moodle bulk downloads. |
| `TestAnyLabOld.mjs` | The original version, kept for reference only. |

More notes are in [docs/CodeExplanation.md](docs/CodeExplanation.md).

## Contributing

If you would like to help with development, take a look at the GitHub Issues and the [roadmap](docs/GradeAssistRoadmap.md). Then send me a message so we can keep our work coordinated. Feel free to:

- Let me know which issue you would like to work on so I can send you some test data (anonymized student lab submissions).
- Let me know which enhancement or new feature you would like to work on.
- Ask for more documentation or information.

### Development workflow

I work on this project alone, directly on `main`. If you contribute, please use the [GitHub flow](https://docs.github.com/en/get-started/quickstart/github-flow): make your change on a new branch and open a pull request for review.

### Unit testing

[Mocha](https://mochajs.org) unit tests are in the `test` folder (`npm test`). Each bug fix or enhancement should include a unit test where practical. There may be good reasons to switch to Jest for unit testing; a `JestUnitTest` branch exists for trying that.

### JSDoc

Since 1/5/2024 I have used [JSDoc](https://jsdoc.app) mainly to keep track of types. New code has JSDoc comments, and I'm slowly adding them to old code. Run `npm run docs` to generate the documentation.

### ES6 classes

Since 1/5/2024 I have been refactoring the code to use ES6 classes, to make it more modular. The goal is a separate class for each type of testing: HTML+CSS, JavaScript, C#, etc. There are currently these classes, both extending `Checker`:

- `HtmlAndCssChecker`: I'm in the process of moving the code specific to checking HTML and CSS out of `SubmissionChecker` into this class.
- `JsChecker`: checks JavaScript in `.js` files by running Mocha unit tests. Checking JavaScript in web pages is not finished.
