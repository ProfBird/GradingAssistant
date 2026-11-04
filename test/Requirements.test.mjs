import { parseRequirements, readRequirementsFile, makeRequirements, parseBoolean, parseMinimum } from '../Requirements.mjs';
import { expect } from 'chai';
import fs from 'fs';
import os from 'os';
import path from 'path';

describe('Requirements', () => {
    // A requirements file in the current layout, with all 7 settings values
    const settingsRows = ['/subs', 'C:/subs', '2', 'Lab 3', 'false', 'true', 'true'];
    function csvWith(columns) {
        const names = ['settings', ...Object.keys(columns)];
        const all = { settings: settingsRows, ...columns };
        const rowCount = Math.max(...names.map((name) => all[name].length));
        const rows = [names.join(',')];
        for (let i = 0; i < rowCount; i++) {
            rows.push(names.map((name) => all[name][i] ?? '').join(','));
        }
        return rows.join('\n');
    }

    describe('#parseRequirements()', () => {
        it('reads the settings column by position into named fields', () => {
            const { settings, warnings } = parseRequirements(csvWith({}));
            expect(settings).to.deep.equal({
                macSubmissionsPath: '/subs',
                windowsSubmissionsPath: 'C:/subs',
                numberOfParts: 2,
                labName: 'Lab 3',
                areAllInOneDir: false,
                checkHtml: true,
                checkCss: true,
            });
            expect(warnings).to.deep.equal([]);
        });

        it('uses defaults and warns when settings values are missing', () => {
            const { settings, warnings } = parseRequirements('settings\n/subs', 'lab.csv');
            expect(settings).to.include({ macSubmissionsPath: '/subs', numberOfParts: 1, areAllInOneDir: true,
                checkHtml: false, checkCss: false });
            expect(warnings).to.deep.equal(['Warning: lab.csv has 1 of the 7 expected values in its settings column. Defaults will be used for the missing ones.']);
        });

        it('reads the moreRequirements column by position into named fields', () => {
            const { moreRequirements } = parseRequirements(csvWith({ moreRequirements: ['index', '2', '1', 'TRUE', 'True', '6', '5'] }));
            expect(moreRequirements).to.deep.equal({
                specialFileName: 'index',
                htmlFileCount: 2,
                cssFileCount: 1,
                htmlValidator: 'html-validate',
                validateCss: true,
                minCssRules: 6,
                minCssProperties: 5,
                valueCount: 7,
            });
        });

        it('has no additional requirements when moreRequirements is missing', () => {
            expect(parseRequirements(csvWith({})).moreRequirements).to.deep.equal(makeRequirements().moreRequirements);
        });

        it('reads "" as no special file name, false as no validation, and a validator name', () => {
            const { moreRequirements } = parseRequirements(csvWith({ moreRequirements: ['""""""', '1', '0', 'vnu', 'false'] }));
            expect(moreRequirements).to.include({ specialFileName: null, htmlValidator: 'vnu', validateCss: false,
                minCssRules: null, minCssProperties: null });
        });

        it('warns about a count that is not a number and an unknown HTML validator', () => {
            const { moreRequirements, warnings } = parseRequirements(csvWith({ moreRequirements: ['index', 'two', '0', 'tidy'] }), 'lab.csv');
            expect(moreRequirements.htmlFileCount).to.equal(null);
            expect(warnings).to.have.length(2);
            expect(warnings[0]).to.include('"two" for "Number of HTML files"');
            expect(warnings[1]).to.include('HTML validator named "tidy"');
        });

        it('reads each element with the minimum from the same row', () => {
            const requirements = parseRequirements(csvWith({
                requiredElements1: ['title', 'a[href]', 'img', '', 'br'],
                number1: ['1', '2', '', '5', '2'],  // blank means 1; a number with no element is ignored
                requiredElements2: ['h1', '', 'p'],
                number2: ['3'],
            }));
            expect(requirements.requiredElements1).to.deep.equal([
                { selector: 'title', minimum: 1 }, { selector: 'a[href]', minimum: 2 },
                { selector: 'img', minimum: 1 }, { selector: 'br', minimum: 2 }]);
            expect(requirements.requiredElements2).to.deep.equal([{ selector: 'h1', minimum: 3 }, { selector: 'p', minimum: 1 }]);
        });

        it('keeps the spaces in a selector', () => {
            const { requiredElements1 } = parseRequirements(csvWith({ requiredElements1: ['" ol > li"'] }));
            expect(requiredElements1[0].selector).to.equal(' ol > li');
        });

        it('reads each regular expression with the description from the same row', () => {
            const requirements = parseRequirements(csvWith({
                regExpForHTML1: ['"<a href=""x"">"', '', '<b>'],
                regExpForHTML1Description: ['a link to x', 'a description with no pattern', ''],
                regExpForCSS1: ['margin'],
                regExpForCSS1Description: ['a margin'],
            }));
            expect(requirements.htmlRegExps).to.deep.equal([
                { pattern: '<a href="x">', description: 'a link to x' },
                { pattern: '<b>', description: 'a match for /<b>/' }]);  // no description: show the pattern
            expect(requirements.cssRegExps).to.deep.equal([{ pattern: 'margin', description: 'a margin' }]);
        });

        it('warns about an invalid regular expression once and leaves it out', () => {
            const requirements = parseRequirements(csvWith({
                regExpForHTML1: ['(unclosed', '<b>'],
                regExpForCSS1: ['[a-'],
            }), 'lab.csv');
            expect(requirements.htmlRegExps.map((search) => search.pattern)).to.deep.equal(['<b>']);
            expect(requirements.cssRegExps).to.deep.equal([]);
            const invalid = requirements.warnings.filter((warning) => warning.includes('invalid regular expression'));
            expect(invalid).to.have.length(2);
            expect(invalid[0]).to.include('lab.csv').and.to.include('(unclosed');
        });

        it('reads the css selectors, and the css properties with the whitespace removed', () => {
            const requirements = parseRequirements(csvWith({
                requiredCssSelectors: ['.nav', '', '#main'],
                requiredCssProperties: ['color : red', 'font-size: 2em'],
            }));
            expect(requirements.requiredCssSelectors).to.deep.equal(['.nav', '#main']);
            expect(requirements.requiredCssProperties).to.deep.equal(['color:red', 'font-size:2em']);
        });

        it('reads the last row when the file has no trailing newline, and the same with one', () => {
            const text = csvWith({ requiredElements1: ['h1', 'p'] });
            for (const contents of [text, text + '\n', Buffer.from(text)]) {
                expect(parseRequirements(contents).requiredElements1.map((e) => e.selector)).to.deep.equal(['h1', 'p']);
            }
        });

        it('does not change the buffer it is given', () => {
            const buffer = Buffer.from(csvWith({ regExpForHTML1: ['"a""b"'] }));
            const copy = Buffer.from(buffer);
            parseRequirements(buffer);
            expect(buffer.equals(copy)).to.equal(true);
        });

        it('ignores a byte order mark at the start of the file', () => {
            const { settings, warnings } = parseRequirements('\uFEFF' + csvWith({}));
            expect(settings.macSubmissionsPath).to.equal('/subs');
            expect(warnings).to.deep.equal([]);
        });

        describe('column names', () => {
            it('warns about each column the program does not use', () => {
                const { warnings } = parseRequirements(csvWith({ regExp: ['x'], RecElem1Qty: ['1'] }), 'old.csv');
                expect(warnings).to.deep.equal([
                    'Warning: old.csv has a column named "regExp" that this program does not use. Its values are ignored.',
                    'Warning: old.csv has a column named "RecElem1Qty" that this program does not use. Its values are ignored.',
                ]);
            });

            it('does not warn about note columns, description columns, or blank headers', () => {
                const text = 'line,settings,settingsDescription,moreReqsDescription,Description,Notes,\n' +
                    settingsRows.map((value, i) => `${i},${value},,,,,`).join('\n');
                expect(parseRequirements(text).warnings).to.deep.equal([]);
            });
        });
    });

    describe('#readRequirementsFile()', () => {
        it('reads a file and names it in the warnings', () => {
            const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'requirements-'));
            try {
                const filePath = path.join(dir, 'lab.csv');
                fs.writeFileSync(filePath, 'settings\n/subs');
                expect(readRequirementsFile(filePath).warnings[0]).to.include(filePath);
            } finally {
                fs.rmSync(dir, { recursive: true, force: true });
            }
        });
    });

    describe('#makeRequirements()', () => {
        it('has nothing required by default', () => {
            const requirements = makeRequirements();
            expect(requirements.requiredElements1).to.deep.equal([]);
            expect(requirements.moreRequirements).to.include({ specialFileName: null, htmlFileCount: null, valueCount: 0 });
        });
        it('replaces fields, and parts of settings and moreRequirements', () => {
            const requirements = makeRequirements({ requiredCssSelectors: ['p'], moreRequirements: { htmlFileCount: 2 } });
            expect(requirements.requiredCssSelectors).to.deep.equal(['p']);
            expect(requirements.moreRequirements).to.include({ htmlFileCount: 2, cssFileCount: null });
        });
    });

    describe('#parseBoolean() and #parseMinimum()', () => {
        it('reads true and false ignoring case and spaces, with a default for a missing value', () => {
            expect(parseBoolean(' TRUE ', false)).to.equal(true);
            expect(parseBoolean('False', true)).to.equal(false);
            expect(parseBoolean(undefined, true)).to.equal(true);
            expect(parseBoolean('  ', false)).to.equal(false);
        });
        it('reads whole numbers and uses 1 for anything else', () => {
            expect(parseMinimum('3')).to.equal(3);
            expect(parseMinimum(' 2 ')).to.equal(2);
            expect(parseMinimum('')).to.equal(1);
            expect(parseMinimum(undefined)).to.equal(1);
            expect(parseMinimum('two')).to.equal(1);
        });
    });
});
