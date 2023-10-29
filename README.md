# GradingAssistant
I initially wrote this software to check web pages containing HTML and CSS for my CIS 195, Web Authoring class at Lane Community College.
This is my first Node.js project and I'm still learning. In fact, I haven't learned to use ES6 classes yet. At some point I will refactor this code to make it object oriented!
I am now expanding the software to check JavaScript code in web pages for my CIS 133JS, Beginning JavaScript class.

## UnzipFiles.mjs
This is a Node module for unzipping files that have been bulk downloaded from the Moodle Learning Management System. 
Before running this code, edit the source code to change the submissions path variable.
This is the command to run it:  
`node UnzipFiles.mjs`  
The downloaded submissions are expected to be in a file with a name like: `CS 133JS Sp23 (Bird 41334)-Lab 6 Production Version-3803210.zip`  
The zip file is expected to contain:  
- One or more .zip archives containing:  
  - One or more sub-directories.  
This is what is used to unzip the files:  
- On Windows: 7zip  
- On Mac OS: unzip  
  - 7zip can be installed on Mac Os using Homebrew: brew install p7zip

## TestAnyLab.mjs
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

### Requirements file
The requirements file can be written in a spreadsheet and then saved in .csv format.

