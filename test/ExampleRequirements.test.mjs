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

            it('has all 8 settings values and a submissions path relative to the file', () => {
                expect(warnings).to.deep.equal([]);
                expect(loaded.labSettings.submissionsPath.startsWith(docsDir + path.sep)).to.equal(true);
                expect(loaded.labSettings).to.include({ numberOfParts: 1, isHTML: true, isJavaScript: false });
            });

            it('has the moreRequirements values in the current positions', () => {
                const more = loaded.htmlAndCssChecker.requirements.additionalRequirements;
                expect(more[0]).to.equal('index');                 // special file name
                expect(parseInt(more[1])).to.be.a('number');       // number of HTML files
                expect(more[1]).to.match(/^\d+$/);
                expect(more[2]).to.match(/^\d+$/);                 // number of CSS files
                expect(more[3]).to.match(/^(true|false)$/i);       // validate HTML
                expect(more[4]).to.match(/^(true|false)$/i);       // validate CSS
                for (const optional of more.slice(5)) {            // minimum CSS rules and properties
                    expect(optional).to.match(/^\d+$/);
                }
            });

            it('has a minimum number for each required element, and valid selectors', () => {
                const { requirements } = loaded.htmlAndCssChecker;
                expect(requirements.requiredElements1.length).to.be.greaterThan(0);
                expect(requirements.minElements1).to.have.length(requirements.requiredElements1.length);
                for (const selector of [...requirements.requiredElements1, ...requirements.requiredCssSelectors]) {
                    expect(() => document.querySelectorAll(selector), selector).to.not.throw();
                }
            });

            it('has regular expressions that compile, each with a description', () => {
                const { requirements } = loaded.htmlAndCssChecker;
                for (const expression of [...requirements.regExpForHTML1, ...requirements.regExpForCSS1]) {
                    expect(() => new RegExp(expression, 'gim'), expression).to.not.throw();
                }
                expect(requirements.regExpForHTML1Description).to.have.length(requirements.regExpForHTML1.length);
                expect(requirements.regExpForCSS1Description).to.have.length(requirements.regExpForCSS1.length);
            });
        });
    }
});
