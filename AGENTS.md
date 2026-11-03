# GradingAssistant

Node.js (ES modules, `.mjs`) tools that help grade student web-development labs. `TestAnyLab.mjs` checks each student's unzipped submission against a requirements `.csv` file and writes a `<studentDir>_report.txt` into each student's folder. It checks HTML and CSS now. JavaScript checking with Mocha is in progress. The user is an instructor (CIS 195 Web Authoring at Lane CC) and works solo, directly on `main`.

## Commands

```bash
npm test                                   # Mocha unit tests (test/*.test.mjs)
node TestAnyLab.mjs <requirements.csv> --overwrite   # check a lab; --help lists options
node UnzipFiles.mjs <path-to-downloaded.zip>         # unzip a bulk download (Moodle style)
npm run docs                               # JSDoc into docs/
```

`TestAnyLab.mjs` takes an optional 2nd argument (`--help` or `--overwrite`). Without one it checks the lab and skips students who already have a report; an unrecognized option prints "Unknown option" and quits. Requirements files normally live in the CIS195-CourseMaterials repo (`LabAutoGrading/`), not in this repo. Each one has a path to the submissions folder in its `settings` column.

## Layout

| File | Role |
|---|---|
| `TestAnyLab.mjs` | Main program. `main()` runs only when the file is started with node (tests import it). `parseArguments()`, `loadSettings()` (reads the requirements file and makes the checkers) and `getSubmissionsPath()` are exported. Loops over student folders. Writes reports. |
| `Requirements.mjs` | **The only reader of the requirements csv** (except the deprecated `JsChecker`). `parseRequirements()` / `readRequirementsFile()` return named fields (`settings`, `moreRequirements`, `requiredElements1` as `{selector, minimum}`, `htmlRegExps` as `{pattern, description}`, ...) plus `warnings` (unknown columns, too few settings, non-numeric counts, unknown validator). `makeRequirements()` builds requirements for tests. |
| `SubmissionFolders.mjs` | Finds the folder that holds a submission (skips wrapper folders and junk) and splits it into parts. |
| `SubmissionChecker.mjs` | Old-style `checkSubmission()` that does the HTML/CSS checks. Being moved into `HtmlAndCssChecker`. |
| `CssParser.mjs` | The only CSS reader. `parseStylesheet()` (external files, `<style>`) and `parseInlineStyle()` return `{rules, declarations}` tagged with their source. `findRequiredSelectors()` and `findRequiredProperties()` hold the matching rules. |
| `HtmlAndCssChecker.mjs` | Holds the parsed requirements for the HTML/CSS checks. `validateCSS` is here. |
| `HtmlValidators.mjs` | Pluggable HTML validators: `html-validate` (default), `w3c`, `vnu`. |
| `JsChecker.mjs`, `Checker.mjs` | JS checker (runs Mocha tests on student JS) and the base class. In progress. |
| `UnzipFiles.mjs` | Unzips Moodle bulk downloads. Renames folders by stripping digits, spaces and underscores. |

## Requirements file layout

Each `.csv` row is one line, and each column holds a list of values. Empty cells are ignored.

- `settings` column, **by position**: 0 Mac submissions path, 1 Windows path, 2 number of parts, 3 lab name, 4 all parts in one folder?, 5 check HTML, 6 check CSS, 7 check JS. Missing values get defaults (`loadSettings`), and a file with fewer than 8 values prints a warning.
- `moreRequirements` column, **by position**: 0 special file name (e.g. `index`), 1 number of HTML files, 2 number of CSS files, 3 validate HTML (`false`, `true`, or `html-validate`/`w3c`/`vnu`), 4 validate CSS, 5 minimum number of CSS rules, 6 minimum number of distinct CSS properties (5 and 6 count external and embedded CSS, not inline styles; both optional; to set only 6, put 0 in 5 because empty cells are skipped).
- `number1` / `number2` columns: minimum number of each `requiredElements1` / `requiredElements2` element, summed across all of a student's files. Each number is read from the same row as its element; blank means 1.
- Regex checks use the `regExpForHTML1`, `regExpForHTML1Description`, `regExpForCSS1` and `regExpForCSS1Description` columns. Each description is read from the same row as its pattern.
- Adding a column or a `settings`/`moreRequirements` position: change `Requirements.mjs` (the `knownColumns` list, the typedefs and `parseRequirements`), then use the named field. Code outside the loader never reads columns or positions. Columns named `line`, `Notes`, `...Description` or left blank are notes and are not warned about.
- Older requirements files use earlier layouts and are not compatible. The examples in `docs/` (`ExampleLab1Requirements.csv`, `CIS195Lab06GradeAssist.csv`, `CIS195TermProjectGradeAssist.csv`) use the current layout; `test/ExampleRequirements.test.mjs` checks them, so update the examples and the test when the layout changes.

## Folder conventions (Canvas and Moodle)

- Every folder in the submissions folder is a student, except hidden folders and names ending in `onlinetext`. `UnzipFiles` produces both `X_onlinetext` and `Xonlinetext`, so match the suffix without the underscore.
- Submissions often have wrapper folders (`Student/Lab/Site/index.html`) and `MACOSX` junk. Always locate the files with `getPartDirs()`. Don't assume the student folder is the lab folder.
- Test against **copies** of real submissions (the user keeps `...-TestSubmissions` copies). A run writes report files into every student folder.

## Gotchas

- **`csv-parser` modifies the buffer you give it** (when it un-escapes `""`), and it keeps a leading byte order mark in the first column name. `parseCsv()` in `Requirements.mjs` handles both; only it and the deprecated `JsChecker` use `csv-parser`.
- The special file name check is strict on purpose. `index` accepts only `index.html` or `index.htm`; a name with an extension (`styles.css`) must match exactly. Names that merely contain it (`reindex.html`, `index.html.html`) fail. The case must match (`Index.html` fails), and a wrong-case name is reported separately from a missing file.
- The W3C validator service rejects bulk requests (HTTP errors with an HTML body). That is why `html-validate` is the default. `vnu-jar` 26.x needs Java 17 or newer, and the user's machine has Java 11. `vnu-jar@23.4.11` works on Java 11.
- Regex and element results are combined across a student's files. One match in any file passes.
- CSS selector and property matching is deliberately lenient in two ways, both kept from the old substring checks, which real requirement files rely on. A required selector matches as a whole part of a rule's selector (`nav` matches `nav a`, `body > header`). A required property name matches longhands that start with it (`border` matches `border-collapse`; Lab 7 requires `text`, which only `text-align` and similar can satisfy). It no longer matches inside other names (`.nav` vs `.navbar`, `color` vs `background-color`), in values, or in comments. Change `CssParser.mjs` to make it stricter.

## Code style

Match the surrounding code: 4-space indentation, JSDoc on functions, short explanatory comments. Add or update a Mocha test in `test/` for each bug fix or feature when practical (`*.test.mjs`, chai `expect`).

## Git

Work directly on `main` (solo project, no branches or PRs needed). Commit and push only when asked. Commit messages end with the attribution line given by the harness.
