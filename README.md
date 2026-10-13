<h1>GradingAssistant</h1>

Software that automates some of the more tedious aspects of grading computer programming homework assignments. Currently it has modules for checking HTML, CSS and JavaScript (in progress). It can check things like:

- Syntax
- Presence of required features
- Some aspects of coding style
- Functionality of the code

<h3>Table of Contents</h3>

[TOC]

# Introduction

I initially wrote this software to check web pages containing HTML and CSS for my [CIS 195 Web Authoring](https://github.com/LCC-CIT/CIS195-CourseMaterials) course at Lane Community College (LCC). This is my first Node.js project and I'm still learning. In fact, when I first wrote this, I hadn't learned to use ES6 classes yet. 

I am currently working on expanding the software to check JavaScript code for my [CS 133JS Beginning JavaScript Programming](https://github.com/LCC-CIT/CS133JS-CourseMaterials) course. I am also refactoring the code to be more modular and use ES6 classes. This work is being done on the *HtmlCssAndJsCheckers* branch.

There are two programs in this repository:
-  [UnzipFiles](#UnzipFiles) which unzips assignment files that were bulk downloaded from [Moodle](https://moodle.com/)&mdash;the LMS we use at LCC.
-  [TestAnyLab](#TestAnyLab) which is a customizable test runner that checks all the downloaded assignment files for requirements. Requirements are specified in a .csv file for each assignment.



------------

# UnzipFiles Program
This is a Node module for unzipping files that have been bulk downloaded from the Moodle Learning Management System. 

## Usage

To run the program use the following CLI command:

`node UnzipFiles.mjs filePath [options]`

- file path  
  If the file path contains spaces, enclose it in quotes. For example:

  - Windows path: "G:/My Drive/Courses/CS133JS/23F/Labs/Lab01.zip"
    
  - Mac OS path: "/Volumes/GoogleDrive/My Drive/Courses/CIS195/2023-Fall/Labs/Lab01.zip"


- options
  -    `--help`   Display the help message
  -   `--overwrite`   Overwrite existing unzipped files

## Downloaded Zip File Expectations

The downloaded submissions are expected to be in a zip file.  
The zip file is expected to contain one or more .zip archives, one or two for each student. Each zip archive may contain one or more sub-folders.  

This is what UnzipFiles uses to unzip the files:  

- On Windows: [7zip](url)  
- On Mac OS: unzip (a built-in Mac OS Archive Utility)

  Note, If you want to use 7zip on Mac OS, it can be installed using Homebrew: 

   `brew install p7zip`

-----------

# TestAnyLab Program

This is the software that checks the lab assignemnts unzipped by Unzipfiles. This is the expected folder structure:  
`StudentName/LabX/<website files and folders>`  
Or, if there are two parts to the lab assignment:  
`StudentName/Part1/<website files and folders>`  
`            Part2/<website files and folders>`  
Every folder in the submissions folder is treated as one student's submission, except hidden folders and folders whose names end in `onlinetext` (Moodle online-text submissions, with or without an underscore before it).  
Wrapper folders are skipped automatically: starting at the student's folder, TestAnyLab steps into the single sub-folder while a folder has no files (ignoring `__MACOSX`, hidden files, zip files and `_report.txt` files), so `StudentName/Lab/index.html` and `StudentName/Lab/Site/index.html` both work. If a lab has several parts and the parts are not all in one folder (the "all parts in one folder" setting is FALSE), the sub-folders are used as the parts in name order (`website 1`, `website 2`, ...). The report notes where the submission was found.  

 ## Running the program
 Use this command to run the program:  
`node TestAnyLab.mjs requirementsFileName.csv [options]`  

- `requirementsFileName`  the absolute path to the requirements file including the file name.
- Here are the options:  
  `--help`  displays a help message  
  `--overwrite` overwrites existing report files  

## Current Capabilities
The program currently just does static checking of HTML and CSS files.
See the [Roadmap](Docs/GradeAssistRoadmap.md) for plans to add additioanl capabilitites.

### Requirements Checking

The program can currently (as of 12/14/23) check the following kinds of requirements:

- HTML
  - Elements  
    Check for specific required elements
  - Attributes  
    Check for specific required attributes in particular elements
  - Syntax  
    Check HTML syntax with a choice of validators (see [HTML validators](#html-validators))
- CSS  
  This works for external, embedded and inline CSS. 
  - Selectors  
    This includes complex selectors
  - Properties
  - Syntax
- Number of CSS and number of HTML files
- Regular expression searches of the HTML or CSS code
- Existence of special file names, like `index.html`. The name must match exactly, including upper/lower case. A name without an extension, like `index`, accepts `index.html` or `index.htm`. A file with the wrong case, like `Index.html`, is reported separately from a missing file.

## Requirements file

A requirements file is used to configure the program to test a particular lab assignment. The requirements file can be written in a spreadsheet and then saved in .csv format.

See the Docs folder for example requirements files and a description of how the files are composed.

### HTML validators

The HTML syntax check is chosen by the "Validate HTML" value in the `moreRequirements` column of the requirements file (the 4th value in that column; the first is the special file name, then the number of HTML files, then the number of CSS files):

| Value | Validator |
|---|---|
| `false` | HTML is not validated |
| `true` or `html-validate` | [html-validate](https://html-validate.org/) npm package (default). Runs locally, is fast, and needs no network or Java. Uses its `standard` rules, so messages differ from the W3C validator's. |
| `w3c` | The W3C validator web service. Needs a network connection, and the service may reject bulk checks of many files. |
| `vnu` | The W3C Nu validator (`vnu.jar`, from the `vnu-jar` npm package) run locally. Gives the same results as the W3C service. Needs Java 17 or newer installed. |

If a validator can't run, the report says `Could not validate <file>` and the reason, and the rest of the checks continue. Validators are in `HtmlValidators.mjs`; add a function to its `validators` table to add another.

## Output
A text file with a summary report is saved in the lab assignment folder for each student's submission. Here is an example of a summary report:

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



# Contributing

If you would like to help with development take a look at the GitHub Issues and the [roadmap](./docs/GradeAssistRoadmap.md)
Then send me a message so we can keep our work coordinated. Feel free to:

- Let me know which issue you would like to work on so I can send you some test data (anonymized student lab submissions)
- Let me know which enhancement or new feature you would like to work on.
- Ask for more documentation or information.

## Development Workflow

We will follow the [GitHub flow](https://docs.github.com/en/get-started/quickstart/github-flow). A dev making a code change will do it on a new branch, the dev will issue a PR to me for code review, and once approved the dev can merge the branch into main.  

## Unit Testing

[Mocha](https://mochajs.org) unit test files are in the test subfolder. Each bug fix or enhancement should include a unit test if one does not already exist.
4/8/25 Note: There may be good reasons to swich to Jest for unit testing... stay tuned.

## JSDoc

On 1/5/2024, I started using [JSDoc](https://jsdoc.app). I maninly did this so I could keep track of types.
New code has JSDoc comments, I'm slowly adding JSDoc comments to old code.

## ES6 Classes

On 1/5/2024, I started refactoring the code to use ES6 classes. Part of the reason was to make the code more modular. I want to have a separate class for each type of testing: HTML+CSS, JavaScript, C#, etc.
There are currently these two classes: 

- HtmlAndCssChecker - I'm in the process of moving code specific to checking HTML and CSS out of SubmissionChecker into this class.
- JSChecker - This is a new class for checking JavaScript in web pages and .js files.
