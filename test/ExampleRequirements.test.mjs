import { loadSettings } from '../TestAnyLab.mjs';
import { expect } from 'chai';
import { JSDOM } from 'jsdom';
import path from 'path';
import { fileURLToPath } from 'url';

// The example requirements files in the docs folder must stay in the layout the program reads
describe('Example requirements files in docs', () => {
    const docsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'docs');
    const examples = ['ExampleLab1Requirements.csv', 'CIS195Lab06GradeAssist.csv', 'CIS195TermProjectGradeAssist.csv'];
    const document = new JSDOM('<html></html>').window.document;

    for (const fileName of examples) {
        describe(fileName, () => {
            const filePath = path.join(docsDir, fileName);
            let loaded;
            let warnings;

            before(() => {
                const warn = console.warn;
                warnings = [];
                console.warn = (message) => warnings.push(message);
                try {
                    loaded = loadSettings(filePath, 'darwin');
                } finally {
                    console.warn = warn;
                }
            });

            it('has no warnings, all the settings values, and a submissions path relative to the file', () => {
                expect(warnings).to.deep.equal([]);
                expect(loaded.labSettings.submissionsPath.startsWith(docsDir + path.sep)).to.equal(true);
                expect(loaded.labSettings).to.include({ numberOfParts: 1, isHTML: true });
            });

            it('has the moreRequirements values in the current positions', () => {
                const { moreRequirements } = loaded.htmlAndCssChecker.requirements;
                expect(moreRequirements.specialFileName).to.equal('index');
                expect(moreRequirements.htmlFileCount).to.be.a('number');
                expect(moreRequirements.cssFileCount).to.be.a('number');
                expect(moreRequirements.htmlValidator).to.be.oneOf([null, 'html-validate', 'w3c', 'vnu']);
                expect(moreRequirements.validateCss).to.be.a('boolean');
                expect(moreRequirements.valueCount).to.be.oneOf([5, 7]);
            });

            it('has a minimum number for each required element, and valid selectors', () => {
                const { requirements } = loaded.htmlAndCssChecker;
                expect(requirements.requiredElements1.length).to.be.greaterThan(0);
                for (const { selector, minimum } of requirements.requiredElements1) {
                    expect(minimum, selector).to.be.at.least(1);
                }
                const selectors = [...requirements.requiredElements1.map((e) => e.selector), ...requirements.requiredCssSelectors];
                for (const selector of selectors) {
                    expect(() => document.querySelectorAll(selector), selector).to.not.throw();
                }
            });

            it('has regular expressions that compile, each with its own description', () => {
                const { requirements } = loaded.htmlAndCssChecker;
                for (const { pattern, description } of [...requirements.htmlRegExps, ...requirements.cssRegExps]) {
                    expect(() => new RegExp(pattern, 'gim'), pattern).to.not.throw();
                    expect(description, pattern).to.not.match(/^a match for/);
                }
            });
        });
    }
});
