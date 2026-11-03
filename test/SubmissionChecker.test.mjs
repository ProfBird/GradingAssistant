import { getEmbeddedCssSelectorsAndProperties,
    getInlineStyles,
    checkSpecialFileName,
    summarizeAdditionalRequirements,
    getCssRulesAndPropertyNames,
    checkSubmission } from '../SubmissionChecker.mjs';
import { expect } from 'chai';
import jsdom from 'jsdom';
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

    // Test the getEmbeddedCssSelectorsAndProperties() function
    describe('#getEmbeddedCssSelectorsAndProperties()', () => {
        it('should return correct selectors and properties', () => {
            // Arrange
            const styleElement = {
                textContent: '.test { color: red; } #id { background-color: blue; }'
            };
            const requiredSelectors = ['.test', '#id'];
            // Note the required property value, red is included, 
            // and a property that won't be found, float: left
            const requiredProperties = ['color: red', 'background-color', 'float: left'];

            // Act
            const result = getEmbeddedCssSelectorsAndProperties(styleElement, requiredSelectors, requiredProperties);

            // Assert
            expect(result).to.deep.equal({
                allSelectors: ['.test', '#id'],
                foundSelectors: ['.test', '#id'],
                allProperties: ['color: red', 'background-color: blue'],
                foundProperties: ['color: red', 'background-color']
            });
        });
    });

    // Test the getInlineStyles() function
    const { JSDOM } = jsdom;
    describe('SubmissionChecker', () => {
        describe('#getInlineStyles()', () => {
            it('should return correct properties and values', () => {
                // Arrange
                const dom = new JSDOM(`
                <div style="color: red; background-color: white;"></div>
                <div style="color: blue;"></div>
            `);
            const requiredProperties = ['color: blue', 'background-color', 'float: left'];
                const elements = [...dom.window.document.querySelectorAll('div')];

                // Act
                const result = getInlineStyles(elements, requiredProperties);

                // Assert
                expect(result).to.deep.equal({
 
                        allProperties: ['color: red', 'background-color: white', 'color: blue'],
                        foundProperties: ['background-color', 'color: blue']
                });
            });
        });
    });

    // Test the counts of HTML and CSS files
    describe('#getCssRulesAndPropertyNames()', () => {
        it('returns the selector of each rule, including rules inside @media, and the property names', () => {
            const css = 'body { Color: red; margin: 0 }\n@media (min-width: 600px) { .nav > a, h1 { color: blue } }\n/* p { x: y } */';
            const result = getCssRulesAndPropertyNames(css);
            expect(result.selectors).to.deep.equal(['body', '.nav>a,h1']);
            expect(result.propertyNames).to.deep.equal(['color', 'margin', 'color']);
        });
        it('returns empty arrays when there are no rules', () => {
            expect(getCssRulesAndPropertyNames('/* 123 */ 456')).to.deep.equal({ selectors: [], propertyNames: [] });
        });
    });

    describe('#summarizeAdditionalRequirements()', () => {
        // additionalRequirements: special file name, # of html files, # of css files, validate html
        const requirements = ["", "1", "2", "false"];

        it('reports too few CSS files using the CSS count', () => {
            const report = summarizeAdditionalRequirements(5, 1, [], [], [], [], requirements, [true]);
            expect(report).to.include('Found 1 css files. Expected 2');
            expect(report).to.not.include('html files');
        });

        it('does not report CSS files as missing when there are enough, even if there are few HTML files', () => {
            const report = summarizeAdditionalRequirements(1, 3, [], [], [], [], requirements, [true]);
            expect(report).to.include('All additional requirements met');
        });

        it('reports too few HTML files', () => {
            const report = summarizeAdditionalRequirements(0, 3, [], [], [], [], requirements, [true]);
            expect(report).to.include('Found 0 html files. Expected 1');
        });

        describe('minimum numbers of css rules and distinct properties', () => {
            // ... validate html, validate css, minimum rules, minimum distinct properties
            const withMinimums = ["", "0", "0", "false", "false", "3", "2"];

            it('reports too few css rules', () => {
                const report = summarizeAdditionalRequirements(0, 0, ['p', 'h1'], ['color', 'margin'], [], [], withMinimums, [true]);
                expect(report).to.include('Found 2 css rules. Expected 3');
                expect(report).to.not.include('properties');
            });

            it('counts distinct properties, not every declaration', () => {
                const report = summarizeAdditionalRequirements(0, 0, ['p', 'h1', 'h2'], ['color', 'color', 'color'], [], [], withMinimums, [true]);
                expect(report).to.include('Found 1 distinct css properties. Expected 2');
                expect(report).to.not.include('css rules');
            });

            it('passes when the minimums are met', () => {
                const report = summarizeAdditionalRequirements(0, 0, ['p', 'h1', 'h2'], ['color', 'margin', 'color'], [], [], withMinimums, [true]);
                expect(report).to.include('All additional requirements met');
            });

            it('has no minimums when the values are missing, and the validate flags are not read as numbers', () => {
                const report = summarizeAdditionalRequirements(0, 0, [], [], [], [], ["", "0", "0", "true", "true"], [true]);
                expect(report).to.include('All additional requirements met');
            });
        });
    });

    describe('#checkSubmission() file counts', () => {
        let baseDir;
        const requirements = {
            requiredElements1: [], requiredElements2: [],
            requiredCssSelectors: [], requiredCssProperties: [],
            // special file name (none), 2 html files, 0 css files, don't validate html
            additionalRequirements: ["", "2", "0", "false"],
            regExpForHTML1: [], regExpForHTML1Description: [],
            regExpForCSS1: [], regExpForCSS1Description: [],
        };

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

            const reportA = await checkSubmission(studentA, "", 1, {}, requirements);
            const reportB = await checkSubmission(studentB, "", 1, {}, requirements);

            expect(reportA).to.include('All additional requirements met');
            // Student B has only one file, even though the earlier student had two
            expect(reportB).to.include('Found 1 html files. Expected 2');
        });

        it('treats a file name with an upper case extension as an HTML file', async () => {
            const student = makeStudentDir('c', ['index.html', 'About.HTML']);

            const report = await checkSubmission(student, "", 1, {}, requirements);

            expect(report).to.include('Checking the About.HTML file');
            expect(report).to.include('All additional requirements met');
        });

        describe('with CSS files (CSS validation turned off, so no network is used)', () => {
            const cssRequirements = {
                ...requirements,
                // no special file name, 0 html files, 1 css file, don't validate html or css
                additionalRequirements: ["", "0", "1", "false", "false"],
                regExpForCSS1: ["color:\\s+red"],
                regExpForCSS1Description: ["red color"],
            };

            it('matches CSS regular expressions against the original text, with whitespace', async () => {
                const student = makeStudentDir('e', []);
                fs.writeFileSync(path.join(student, 'styles.css'), 'p {\n    color:   red;\n}\n');

                const report = await checkSubmission(student, "", 1, {}, cssRequirements);

                expect(report).to.include('All regular expression searches passed');
            });

            it('does not crash on a CSS file with no selectors or properties', async () => {
                const student = makeStudentDir('f', []);
                fs.writeFileSync(path.join(student, 'styles.css'), '/* 123 */ 456');

                const report = await checkSubmission(student, "", 1, {}, cssRequirements);

                expect(report).to.include('Checking the styles.css file');
                expect(report).to.not.include('W3C');
            });
        });

        describe('counting css rules and properties', () => {
            const countRequirements = {
                ...requirements,
                // no special file name, no html or css file counts, no validation, at least 3 rules and 3 distinct properties
                additionalRequirements: ["", "0", "0", "false", "false", "3", "3"],
            };
            const page = (styles) => `<!DOCTYPE html><html><head><title>T</title>${styles}</head><body></body></html>`;

            it('counts rules and properties in external css and in every style element', async () => {
                const student = makeStudentDir('g', []);
                fs.writeFileSync(path.join(student, 'styles.css'), 'p { color: red }');
                fs.writeFileSync(path.join(student, 'index.html'),
                    page('<style>h1 { margin: 0 }</style><style>h2 { padding: 0; color: blue }</style>'));

                const report = await checkSubmission(student, "", 1, {}, countRequirements);

                // 4 rules, and color + margin + padding
                expect(report).to.include('All additional requirements met');
            });

            it('reports too few rules and properties', async () => {
                const student = makeStudentDir('h', []);
                fs.writeFileSync(path.join(student, 'styles.css'), 'p { color: red }\nh1 { color: blue }');

                const report = await checkSubmission(student, "", 1, {}, countRequirements);

                expect(report).to.include('Found 2 css rules. Expected 3');
                expect(report).to.include('Found 1 distinct css properties. Expected 3');
            });
        });

        it('ignores __MACOSX and hidden files', async () => {
            const student = makeStudentDir('d', ['index.html']);
            fs.mkdirSync(path.join(student, '__MACOSX'));
            fs.writeFileSync(path.join(student, '__MACOSX', '._index.html'), 'junk');
            fs.writeFileSync(path.join(student, '.hidden.html'), '<html></html>');

            const report = await checkSubmission(student, "", 1, {}, requirements);

            expect(report).to.not.include('._index.html');
            expect(report).to.include('Found 1 html files. Expected 2');
        });
    });

});
