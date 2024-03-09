# Code Documentation

I'm writing this becasue I forgot what I was doing after taking a two or three month break from work on this project! (3/8/24)

[TOC]

## Modules



### TestAnyLab.mjs

This is where the main program is.

#### LoadSettings

Loads the following settings

- Path to dir with all student's submissions
- Number of parts to the lab (most labs have a part1 and part2)
- areAllInONeDir is true if all the files are in one directory.
- isHTMLandCSS
- isJavaScript





----



### SubmissionChecker.mjs

This has a big main loop that searches the student's submission directory and subdirectories for files to check.

---



### JsChecker.mjs

This is a new ES6 module for checking files with JS in them (.html or .js)

#### LoadRequirements

A specialized version of this method to load requirements for checking JS code. (Can this be generalized to work for both HTML/CSS and JS?)

---



### HtmlAndCssChecker.mjs

This is a new ES6 module that the HTML and CSS checking code is being migrated into. The code used to all be in SubmissionChecker.





