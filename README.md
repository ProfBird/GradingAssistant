# GradingAssistant
I initially wrote this software to check web pages containing HTML and CSS for my [CIS 195 Web Authoring](https://github.com/LCC-CIT/CIS195-CourseMaterials) course at Lane Community College.
This is my first Node.js project and I'm still learning. In fact, I haven't learned to use ES6 classes yet. At some point I will refactor this code to make it object oriented!

I am currently working on expanding the software to check JavaScript code in web pages for my [CS 133JS Beginning JavaScript Programming](https://github.com/LCC-CIT/CS133JS-CourseMaterials) course.

There are two programs in this repository:
-  [UnzipFiles](#UnzipFiles)
-  [TestAnyLab](#TestAnyLab)

## Contributing
If you would like to help with development take a look at the GitHub Issues and the [roadmap](./docs/GradeAssistRoadmap.md)
Then send me a message so we can keep our work coordinated. Feel free to:
- Let me know which issue you would like to work on so I can send you some test data (anonymized student lab submissions)
- Let me know which enhancement or new feature you would like to work on.
- Ask for more documentation or information.

### Development Workflow
We will follow the [GitHub flow](https://docs.github.com/en/get-started/quickstart/github-flow). A dev making a code change will do it on a new branch, the dev will issue a PR to me for code review, and once approved the dev can merge the branch into main.  

### Unit Testing
[Mocha](https://mochajs.org) unit test files are in the test subfolder. Each bug fix or enhancement should include a unit test if one does not already exist.

### JSDoc
On 1/5/2024, I started using [JSDoc](https://jsdoc.app). I maninly did this so I could keep track of types.
New code has JSDoc comments, I'm slowly adding JSDoc comments to old code.

### ES6 Classes
On 1/5/2024, I started refactoring the code to use ES6 classes. Part of the reason was to make the code more modular. I want to have a separate class for each type of testing: HTML+CSS, JavaScript, C#, etc.
There are currently these two classes: 
- HtmlAndCssChecker - I'm in the process of moving code specific to checking HTML and CSS out of SubmissionChecker into this class.
- JSChecker - This is a new class for checking JavaScript in web pages and .js files.

------------

## UnzipFiles
This is a Node module for unzipping files that have been bulk downloaded from the Moodle Learning Management System. 

### Usage

To run the program use the following CLI command:

`node UnzipFiles.mjs filePath [options]`

- file path  
  If the file path contains spaces, enclose it in quotes. For example:

  - Windows path: "G:/My Drive/Courses/CS133JS/23F/Labs"
    
  - Mac OS path: "/Volumes/GoogleDrive/My Drive/Courses/CIS195/2023-Fall/Labs"


- options
  -    `--help`   Display the help message
  -   `--overwrite`   Overwrite existing unzipped files

### Downloaded Zip File Expectations

The downloaded submissions are expected to be in a file with a name like: `CS 133JS Sp23 (Bird 41334)-Lab 6 Production Version-3803210.zip`  
The zip file is expected to contain one or more .zip archives, one or two for each student. Each zip archive may contain one or more sub-folders.  

This is what UnzipFiles uses to unzip the files:  

- On Windows: [7zip](url)  
- On Mac OS: unzip (a built-in Mac OS Archive Utility)

  Note, If you want to use 7zip on Mac OS, it can be installed using Homebrew: 

   `brew install p7zip`

-----------

## TestAnyLab

This is the software that checks the lab assignemnts unzipped by Unzipfiles. This is the expected folder structure:  
`StudentName_file/LabX/<website files and folders>`  
Or, if there are two parts:  
`StudentName_file/Part1/<website files and folders>`  
`                 Part2/<website files and folders>`  

 ### Running the program
 Use this command to run the program:  
`node TestAnyLab.mjs requirementsFileName.csv [options]`  
Here are the options:  
`--help      Display a help message`  
`--overwrite Overwrite existing report files`  

### Current Capabilities
The program currently just does static checking of HTML and CSS files.
See the [Roadmap](Docs/GradeAssistRoadmap.md) for plans to add additioanl capabilitites.

#### Requirements Checking

The program can currently (as of 12/14/23) check the following kinds of requirements:

- HTML
  - Elements  
    Check for specific required elements
  - Attributes  
    Check for specific required attributes in particular elements
  - Syntax  
    Check using the W3C HTML validator web service
- CSS  
  This works for external, embedded and inline CSS. 
  - Selectors  
    This includes complex selectors
  - Properties
  - Syntax
- Number of CSS and number of HTML files
- Regular expression searches of the HTML or CSS code
- Existence of special file names, like index.html

### Requirements file

A requirements file is used to configure the program to test a particular lab assignment. The requirements file can be written in a spreadsheet and then saved in .csv format.

See the Docs folder for example requirements files.

### Output
A text file with a summary report is saved in the lab assignment folder for each student's submission. Here is an example of a summary report:

```
Checking the TyTitan_file directory
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



