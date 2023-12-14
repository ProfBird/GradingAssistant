# GradeAssist Roadmap

## Vision for the Program

The purpose of GradeAssist is not to fully automate grading, but to assist an instructor by automating aspects of grading that are repetitive, tedious, and that don't require subjective judgement or evaluation.

Here capabilities I'd like to add to the program, in priority order:

1. Check JavaScript code that is not in functions (can't use unit tests). This could be code in `<script>` elements or in `.js` files linked to a web page.
2. Be able to launch a build script (like MSBuild) and run it on each submission.

   - This would allow checking programs that need to be compiled.

   - This would add  the possibility of adding standard modules like linters to the build script.
3. Ability to launch unit tests using a unit testing framework and add the results to the summary report. If the program is launching a build script, then this could be done in the build script.
4. Read the points for each requirement from the grading rubric and add point values to the summary report for each assignment submission.
5. Put the summary report for each submission in a format that can be opened or imported into a spreadsheet.
6. Adapt the program so it can be run on a web server when a student uploads their files. For example, have a student's web site scanned when they upload it to citstudent so the student can get immediate feedback. 
7. Adapt the program so it can be run in GitHub Actions so that it gives a student immediate feedback when they push the code to GitHub.



