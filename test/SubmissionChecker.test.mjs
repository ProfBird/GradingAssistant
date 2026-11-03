import { checkSubmission, runChecks, formatReport } from '../SubmissionChecker.mjs';
import { checkSpecialFileName, summarizeAdditionalRequirements } from '../HtmlAndCssChecks.mjs';
import { makeRequirements, parseRequirements } from '../Requirements.mjs';
import { expect } from 'chai';
import fs from 'fs';
import os from 'os';
import path from 'path';

describe('SubmissionChecker', () => {

    // Test the checkSpecialFileName() function
    describe('#checkSpecialFileName()', () => {
        it('accepts index.html and index.htm for the name index', () => {
            expect(checkSpecialFileName('index.html', 'index')).to.equal('ok');
            expect(checkSpecialFileName('Lab1/index.htm', 'index')).to.equal('ok');
        });
        it('reports a name with the wrong case', () => {
            expect(checkSpecialFileName('Index.html', 'index')).to.equal('wrong-case');
            expect(checkSpecialFileName('site/INDEX.HTML', 'index')).to.equal('wrong-case');
            expect(checkSpecialFileName('index.HTML', 'index')).to.equal('wrong-case');
        });
        it('does not accept names that only contain the special name', () => {
            expect(checkSpecialFileName('reindex.html', 'index')).to.equal('no');
            expect(checkSpecialFileName('index_old.html', 'index')).to.equal('no');
            expect(checkSpecialFileName('myindex.html', 'index')).to.equal('no');
            expect(checkSpecialFileName('Indexhtml.html', 'index')).to.equal('no');
            expect(checkSpecialFileName('index.html.txt', 'index')).to.equal('no');
        });
        it('does not accept a different extension for the name index', () => {
            expect(checkSpecialFileName('index.css', 'index')).to.equal('no');
        });
        it('requires an exact match when the special name has an extension', () => {
            expect(checkSpecialFileName('css/styles.css', 'styles.css')).to.equal('ok');
            expect(checkSpecialFileName('Styles.css', 'styles.css')).to.equal('wrong-case');
            expect(checkSpecialFileName('mystyles.css', 'styles.css')).to.equal('no');
        });
        it('reports other names as not matching', () => {
            expect(checkSpecialFileName('about.html', 'index')).to.equal('no');
        });
        it('only looks at the file name, not the folders', () => {
            expect(checkSpecialFileName('index/about.html', 'index')).to.equal('no');
        });
    });

    describe('#summarizeAdditionalRequirements()', () => {
        // no special file name, 1 html file, 2 css files, don't validate
        const { moreRequirements } = makeRequirements({ moreRequirements: { htmlFileCount: 1, cssFileCount: 2, valueCount: 4 } });
        const failures = (section) => section.results.filter((result) => result.passed === false).map((result) => result.message);

        it('has one result for each value that is set', () => {
            const section = summarizeAdditionalRequirements({ htmlFileCount: 5, cssFileCount: 1 }, moreRequirements);
            expect(section.results).to.deep.equal([
                { check: 'additional-requirements', passed: true, message: 'Found 5 html files. Expected 1' },
                { check: 'additional-requirements', passed: false, message: 'Found 1 css files. Expected 2' },
            ]);
            expect(section.heading).to.equal('Additional requirements:');
        });

        it('passes when there are enough CSS files, even if there are few HTML files', () => {
            expect(failures(summarizeAdditionalRequirements({ htmlFileCount: 1, cssFileCount: 3 }, moreRequirements))).to.deep.equal([]);
        });

        it('reports too few HTML files', () => {
            expect(failures(summarizeAdditionalRequirements({ htmlFileCount: 0, cssFileCount: 3 }, moreRequirements)))
                .to.deep.equal(['Found 0 html files. Expected 1']);
        });

        it('reports a missing special file, and one with the wrong case', () => {
            const withIndex = makeRequirements({ moreRequirements: { specialFileName: 'index', valueCount: 1 } }).moreRequirements;
            expect(failures(summarizeAdditionalRequirements({ htmlFileCount: 1, cssFileCount: 0, specialFileFound: false }, withIndex)))
                .to.deep.equal(['Missing index file (index.html or index.htm)']);
            expect(failures(summarizeAdditionalRequirements({ htmlFileCount: 1, cssFileCount: 0, specialFileFound: false,
                wrongCaseFileNames: ['Index.html', 'Index.html'] }, withIndex)))
                .to.deep.equal(['File name has the wrong upper/lower case: Index.html. It must be named index.html or index.htm']);
        });

        describe('minimum numbers of css rules and distinct properties', () => {
            // at least 3 css rules and 2 distinct properties
            const withMinimums = makeRequirements({ moreRequirements: {
                htmlFileCount: 0, cssFileCount: 0, minCssRules: 3, minCssProperties: 2, valueCount: 7 } }).moreRequirements;

            it('reports too few css rules', () => {
                expect(failures(summarizeAdditionalRequirements(
                    { htmlFileCount: 0, cssFileCount: 0, ruleSelectors: ['p', 'h1'], propertyNames: ['color', 'margin'] }, withMinimums)))
                    .to.deep.equal(['Found 2 css rules. Expected 3']);
            });

            it('counts distinct properties, not every declaration', () => {
                expect(failures(summarizeAdditionalRequirements(
                    { htmlFileCount: 0, cssFileCount: 0, ruleSelectors: ['p', 'h1', 'h2'], propertyNames: ['color', 'color', 'color'] }, withMinimums)))
                    .to.deep.equal(['Found 1 distinct css properties. Expected 2']);
            });

            it('passes when the minimums are met', () => {
                expect(failures(summarizeAdditionalRequirements(
                    { htmlFileCount: 0, cssFileCount: 0, ruleSelectors: ['p', 'h1', 'h2'], propertyNames: ['color', 'margin', 'color'] }, withMinimums)))
                    .to.deep.equal([]);
            });

            it('has no minimums when the values are missing', () => {
                const { moreRequirements: noMinimums } = parseRequirements('moreRequirements\n""""""\n0\n0\ntrue\ntrue');
                const section = summarizeAdditionalRequirements({ htmlFileCount: 0, cssFileCount: 0 }, noMinimums);
                expect(section.results.map((result) => result.message)).to.deep.equal(
                    ['Found 0 html files. Expected 0', 'Found 0 css files. Expected 0']);
            });
        });
    });

    describe('#formatReport()', () => {
        const section = (changes) => ({ check: 'x', heading: null, results: [], failureCountLabel: null, allPassedMessage: 'All passed', ...changes });

        it('lists each file with its results, then each section', () => {
            const report = formatReport({
                files: [{ relativePath: 'index.html', results: [{ check: 'v', passed: null, message: 'line 1\nline 2' }] },
                    { relativePath: 'css/s.css', results: [] }],
                sections: [section({ heading: 'Heading:' })],
            });
            expect(report).to.equal('Checking the index.html file\nline 1\nline 2\nChecking the css/s.css file\nHeading:\nAll passed\n');
        });

        it('shows only the failures of a section, with a count line if it has a label', () => {
            const results = [{ check: 'x', passed: true, message: 'ok' }, { check: 'x', passed: false, message: 'bad 1' },
                { check: 'x', passed: false, message: 'bad 2' }];
            expect(formatReport({ files: [], sections: [section({ results, failureCountLabel: 'required things' })] }))
                .to.equal('Missing 2 required things\nbad 1\nbad 2\n');
            expect(formatReport({ files: [], sections: [section({ results })] })).to.equal('bad 1\nbad 2\n');
        });
    });

    describe('#runChecks()', () => {
        let baseDir;
        beforeEach(() => { baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'runchecks-')); });
        afterEach(() => { fs.rmSync(baseDir, { recursive: true, force: true }); });

        const requirements = parseRequirements([
            'requiredElements1,number1,requiredCssSelectors,regExpForHTML1,regExpForHTML1Description,moreRequirements',
            'h1,1,nav,<!--,a comment,index', 'img[alt],2,,,,1', ',,,,,0',
        ].join('\n'));

        function makeStudent(name, files) {
            const dir = path.join(baseDir, name);
            for (const [fileName, contents] of Object.entries(files)) {
                fs.mkdirSync(path.dirname(path.join(dir, fileName)), { recursive: true });
                fs.writeFileSync(path.join(dir, fileName), contents);
            }
            return dir;
        }
        const passedByCheck = ({ sections }) => Object.fromEntries(sections.map((section) =>
            [section.check, section.results.map((result) => result.passed)]));

        it('gives each requirement a passed or failed result', async () => {
            const student = makeStudent('a', {
                'index.html': '<html><head><title>T</title><!-- c --></head><body><h1>x</h1><img alt="a"></body></html>',
                'css/s.css': 'nav a { color: red }',
            });

            const results = await runChecks(student, 1, requirements);

            expect(results.files.map((file) => file.relativePath)).to.deep.equal([path.join('css', 's.css'), 'index.html']);
            expect(passedByCheck(results)).to.deep.equal({
                'required-elements': [true, false],         // only one img[alt]; 2 are required
                'required-selectors': [true],
                'additional-requirements': [true, true, true],
                'html-regexps': [true],
            });
        });

        it('does not carry anything over from one student to the next', async () => {
            const complete = makeStudent('b', {
                'index.html': '<html><head><!-- c --></head><body><h1>x</h1><img alt="a"><img alt="b"></body></html>',
                's.css': 'nav { }',
            });
            const empty = makeStudent('c', { 'index.html': '' });

            expect(passedByCheck(await runChecks(complete, 1, requirements))).to.deep.equal({
                'required-elements': [true, true], 'required-selectors': [true],
                'additional-requirements': [true, true, true], 'html-regexps': [true] });
            const second = await runChecks(empty, 1, requirements);
            expect(passedByCheck(second)).to.deep.equal({
                'required-elements': [false, false], 'required-selectors': [false],
                'additional-requirements': [false, true, false], 'html-regexps': [false] });
            expect(second.files).to.deep.equal([{ relativePath: 'index.html',
                results: [{ check: 'files', passed: null, message: 'File index.html is empty' }] }]);
        });
    });

    describe('#checkSubmission() file counts', () => {
        let baseDir;
        // no special file name, 2 html files, 0 css files, don't validate
        const requirements = makeRequirements({ moreRequirements: { htmlFileCount: 2, cssFileCount: 0, valueCount: 4 } });

        function makeStudentDir(name, htmlFileNames) {
            const dir = path.join(baseDir, name);
            fs.mkdirSync(dir);
            for (const fileName of htmlFileNames) {
                fs.writeFileSync(path.join(dir, fileName), '<!DOCTYPE html><html><head><title>T</title></head><body></body></html>');
            }
            return dir;
        }

        beforeEach(() => { baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'checksub-')); });
        afterEach(() => { fs.rmSync(baseDir, { recursive: true, force: true }); });

        it('counts only the files of the student being checked', async () => {
            const studentA = makeStudentDir('a', ['index.html', 'page2.html']);
            const studentB = makeStudentDir('b', ['index.html']);

            const reportA = await checkSubmission(studentA, 1, requirements);
            const reportB = await checkSubmission(studentB, 1, requirements);

            expect(reportA).to.include('All additional requirements met');
            // Student B has only one file, even though the earlier student had two
            expect(reportB).to.include('Found 1 html files. Expected 2');
        });

        it('treats a file name with an upper case extension as an HTML file', async () => {
            const student = makeStudentDir('c', ['index.html', 'About.HTML']);

            const report = await checkSubmission(student, 1, requirements);

            expect(report).to.include('Checking the About.HTML file');
            expect(report).to.include('All additional requirements met');
        });

        describe('with CSS files (CSS validation turned off, so no network is used)', () => {
            const cssRequirements = makeRequirements({
                // no special file name, 0 html files, 1 css file, don't validate html or css
                moreRequirements: { htmlFileCount: 0, cssFileCount: 1, valueCount: 5 },
                cssRegExps: [{ pattern: "color:\\s+red", description: "red color" }],
            });

            it('matches CSS regular expressions against the original text, with whitespace', async () => {
                const student = makeStudentDir('e', []);
                fs.writeFileSync(path.join(student, 'styles.css'), 'p {\n    color:   red;\n}\n');

                const report = await checkSubmission(student, 1, cssRequirements);

                expect(report).to.include('All regular expression searches passed');
            });

            it('does not crash on a CSS file with no selectors or properties', async () => {
                const student = makeStudentDir('f', []);
                fs.writeFileSync(path.join(student, 'styles.css'), '/* 123 */ 456');

                const report = await checkSubmission(student, 1, cssRequirements);

                expect(report).to.include('Checking the styles.css file');
                expect(report).to.not.include('W3C');
            });
        });

        describe('minimum numbers of required elements', () => {
            const elementRequirements = makeRequirements({
                requiredElements1: [{ selector: "h1, h2, h3", minimum: 2 }, { selector: "a[href]", minimum: 2 },
                    { selector: "img[alt]", minimum: 1 }],
                requiredElements2: [{ selector: "p", minimum: 2 }],
                moreRequirements: { htmlFileCount: 0, cssFileCount: 0, valueCount: 5 },
            });
            const page = (body) => `<!DOCTYPE html><html><head><title>T</title></head><body>${body}</body></html>`;

            it('adds up the matching elements from all of the files', async () => {
                const student = makeStudentDir('m', []);
                fs.writeFileSync(path.join(student, 'index.html'), page('<h1>A</h1><a href="x">x</a><img src="a" alt="a">'));
                fs.writeFileSync(path.join(student, 'two.html'), page('<h2>B</h2><a href="y">y</a>'));

                const report = await checkSubmission(student, 1, elementRequirements);

                expect(report).to.include('All required elements found');
            });

            it('reports an element that was found fewer times than required', async () => {
                const student = makeStudentDir('n', []);
                fs.writeFileSync(path.join(student, 'index.html'), page('<h1>A</h1><a href="x">x</a><img src="a" alt="a">'));

                const report = await checkSubmission(student, 1, elementRequirements);

                expect(report).to.include('Missing 2 required elements');
                expect(report).to.include('Found 1 h1, h2, h3 elements. Expected at least 2');
                expect(report).to.include('Found 1 a[href] elements. Expected at least 2');
                expect(report).to.not.include('img[alt]');
            });

            it('still reports an element that is not there at all as missing', async () => {
                const student = makeStudentDir('o', []);
                fs.writeFileSync(path.join(student, 'index.html'), page('<h1>A</h1><h2>B</h2><a href="x">x</a><a href="y">y</a>'));

                const report = await checkSubmission(student, 1, elementRequirements);

                expect(report).to.include('Missing 1 required elements');
                expect(report).to.include('Missing img[alt] element');
            });

            it('requires 1 of each element when there is no number1 column', async () => {
                const student = makeStudentDir('p', []);
                fs.writeFileSync(path.join(student, 'index.html'), page('<h1>A</h1><a href="x">x</a><img src="a" alt="a">'));
                const withoutMinimums = parseRequirements('requiredElements1\n"h1, h2, h3"\na[href]\nimg[alt]');

                const report = await checkSubmission(student, 1, withoutMinimums);

                expect(report).to.include('All required elements found');
            });

            it('uses the part 2 elements and minimums for part 2', async () => {
                const student = makeStudentDir('q', []);
                fs.writeFileSync(path.join(student, 'index.html'), page('<p>one</p>'));

                const report = await checkSubmission(student, 2, elementRequirements);

                expect(report).to.include('Found 1 p elements. Expected at least 2');
            });
        });

        describe('required css selectors and properties in external, embedded and inline css', () => {
            it('matches them the same way in all three, using requirements from the csv loader', async () => {
                const loaded = parseRequirements('requiredCssSelectors,requiredCssProperties\n' +
                    'nav,text\n"header, footer",display: grid\n.menu,color\n,border');
                const student = makeStudentDir('v', []);
                // .navbar and the comment must not count as .menu, and background-color must not count as color
                fs.writeFileSync(path.join(student, 'styles.css'), 'body > nav a { text-align: center } .navbar { } /* .menu { color: red } */');
                fs.writeFileSync(path.join(student, 'index.html'),
                    '<!DOCTYPE html><html><head><title>T</title><style>header, footer { Display: GRID }</style></head>' +
                    '<body><table style="border-collapse: collapse; background-color: red"></table></body></html>');

                const report = await checkSubmission(student, 1, loaded);

                expect(report).to.include('Missing 1 required selectors\nMissing .menu selector');
                expect(report).to.include('Missing 1 required properties\nMissing color property');
            });
        });

        describe('required css properties in embedded and inline css', () => {
            it('finds a property and value, written with or without spaces, using requirements from the csv loader', async () => {
                // Load the requirements the way the program does, which removes the spaces
                const loaded = parseRequirements('requiredCssProperties\ndisplay: grid\ndisplay: flex\ncolor\nmargin: 0 auto');
                const student = makeStudentDir('r', []);
                fs.writeFileSync(path.join(student, 'index.html'),
                    '<!DOCTYPE html><html><head><title>T</title><style>body { display: grid; color: red }' +
                    ' main { margin:0  auto }</style></head><body><p style="display:  flex">x</p></body></html>');

                const report = await checkSubmission(student, 1, loaded);

                expect(report).to.include('All required properties found');
            });

            it('reports a property whose value is different', async () => {
                const loaded = parseRequirements('requiredCssProperties\ndisplay: grid');
                const student = makeStudentDir('s', []);
                fs.writeFileSync(path.join(student, 'index.html'),
                    '<!DOCTYPE html><html><head><title>T</title><style>body { display: flex }</style></head><body></body></html>');

                const report = await checkSubmission(student, 1, loaded);

                expect(report).to.include('Missing display:grid property');
            });
        });

        describe('regular expression searches', () => {
            const regExRequirements = makeRequirements({
                moreRequirements: { htmlFileCount: 0, cssFileCount: 0, valueCount: 5 },
                htmlRegExps: [{ pattern: "<h1>\\s*Welcome", description: "a Welcome heading" },
                    { pattern: "<img\\b[^>]*\\balt=", description: "an img with alt text" }],
            });
            const page = (body) => `<!DOCTYPE html><html><head><title>T</title></head><body>${body}</body></html>`;

            it('passes a search that matches in any one of the files', async () => {
                const student = makeStudentDir('i', []);
                fs.writeFileSync(path.join(student, 'index.html'), page('<h1>Welcome</h1>'));
                fs.writeFileSync(path.join(student, 'about.html'), page('<img src="a.png" alt="A">'));

                const report = await checkSubmission(student, 1, regExRequirements);

                expect(report).to.include('All regular expression searches passed');
            });

            it('names each search that matched in none of the files', async () => {
                const student = makeStudentDir('j', []);
                fs.writeFileSync(path.join(student, 'index.html'), page('<h1>Welcome</h1><img src="a.png">'));

                const report = await checkSubmission(student, 1, regExRequirements);

                expect(report).to.include('Missing an img with alt text in files');
                expect(report).to.not.include('Missing a Welcome heading');
                expect(report).to.not.include('All regular expression searches passed');
            });

            it('fails every search when there are no HTML files', async () => {
                const student = makeStudentDir('k', []);

                const report = await checkSubmission(student, 1, regExRequirements);

                expect(report).to.include('Missing a Welcome heading in files');
                expect(report).to.include('Missing an img with alt text in files');
            });

            it('ignores case and matches across lines', async () => {
                const student = makeStudentDir('l', []);
                fs.writeFileSync(path.join(student, 'index.html'), page('<H1>\n  WELCOME</H1><IMG\nSRC="a" ALT="x">'));

                const report = await checkSubmission(student, 1, regExRequirements);

                expect(report).to.include('All regular expression searches passed');
            });
        });

        describe('counting css rules and properties', () => {
            // no special file name, 0 html and css files, no validation, at least 3 rules and 3 distinct properties
            const countRequirements = makeRequirements({ moreRequirements: {
                htmlFileCount: 0, cssFileCount: 0, minCssRules: 3, minCssProperties: 3, valueCount: 7 } });
            const page = (styles) => `<!DOCTYPE html><html><head><title>T</title>${styles}</head><body></body></html>`;

            it('counts rules and properties in external css and in every style element', async () => {
                const student = makeStudentDir('g', []);
                fs.writeFileSync(path.join(student, 'styles.css'), 'p { color: red }');
                fs.writeFileSync(path.join(student, 'index.html'),
                    page('<style>h1 { margin: 0 }</style><style>h2 { padding: 0; color: blue }</style>'));

                const report = await checkSubmission(student, 1, countRequirements);

                // 4 rules, and color + margin + padding
                expect(report).to.include('All additional requirements met');
            });

            it('reports too few rules and properties', async () => {
                const student = makeStudentDir('h', []);
                fs.writeFileSync(path.join(student, 'styles.css'), 'p { color: red }\nh1 { color: blue }');

                const report = await checkSubmission(student, 1, countRequirements);

                expect(report).to.include('Found 2 css rules. Expected 3');
                expect(report).to.include('Found 1 distinct css properties. Expected 3');
            });
        });

        it('does not report a missing special file when none is required, even with no files', async () => {
            const student = makeStudentDir('t', []);

            const report = await checkSubmission(student, 1, requirements);

            expect(report).to.include('Found 0 html files. Expected 2');
            expect(report).to.not.match(/Missing .* file \(/);
        });

        it('reports a missing special file when there are no files', async () => {
            const student = makeStudentDir('u', []);
            const withSpecialFile = makeRequirements({ moreRequirements: { ...requirements.moreRequirements, specialFileName: 'index' } });

            const report = await checkSubmission(student, 1, withSpecialFile);

            expect(report).to.include('Missing index file (index.html or index.htm)');
        });

        it('ignores __MACOSX and hidden files', async () => {
            const student = makeStudentDir('d', ['index.html']);
            fs.mkdirSync(path.join(student, '__MACOSX'));
            fs.writeFileSync(path.join(student, '__MACOSX', '._index.html'), 'junk');
            fs.writeFileSync(path.join(student, '.hidden.html'), '<html></html>');

            const report = await checkSubmission(student, 1, requirements);

            expect(report).to.not.include('._index.html');
            expect(report).to.include('Found 1 html files. Expected 2');
        });
    });

});
