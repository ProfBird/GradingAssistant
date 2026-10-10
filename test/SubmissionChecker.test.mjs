import { getEmbeddedCssSelectorsAndProperties,
    getInlineStyles,
    checkSpecialFileName,
    summarizeAdditionalRequirements,
    checkSubmission } from '../SubmissionChecker.mjs';
import { expect } from 'chai';
import jsdom from 'jsdom';
import fs from 'fs';
import os from 'os';
import path from 'path';

describe('SubmissionChecker', () => {

    // Test the checkSpecialFileName() function
    describe('#checkSpecialFileName()', () => {
        it('accepts a name with the right case', () => {
            expect(checkSpecialFileName('index.html', 'index')).to.equal('ok');
            expect(checkSpecialFileName('Lab1/index.htm', 'index')).to.equal('ok');
        });
        it('reports a name with the wrong case', () => {
            expect(checkSpecialFileName('Index.html', 'index')).to.equal('wrong-case');
            expect(checkSpecialFileName('site/INDEX.HTML', 'index')).to.equal('wrong-case');
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
    });

});
