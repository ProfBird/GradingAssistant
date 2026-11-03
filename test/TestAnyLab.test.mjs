import { main, parseArguments, loadSettings, getSubmissionsPath, parseBoolean } from '../TestAnyLab.mjs';
import { expect } from 'chai';
import fs from 'fs';
import os from 'os';
import path from 'path';

describe('TestAnyLab', () => {
    let baseDir;
    beforeEach(() => { baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'testanylab-')); });
    afterEach(() => { fs.rmSync(baseDir, { recursive: true, force: true }); });

    // Write a requirements file from columns: {columnName: [values]}. Short columns are padded with empty cells.
    function writeRequirements(columns, fileName = 'req.csv') {
        const names = Object.keys(columns);
        const rowCount = Math.max(...names.map((name) => columns[name].length));
        const rows = [names.join(',')];
        for (let i = 0; i < rowCount; i++) {
            rows.push(names.map((name) => columns[name][i] ?? '').join(','));
        }
        const filePath = path.join(baseDir, fileName);
        fs.writeFileSync(filePath, rows.join('\n'));  // no trailing newline, like some exports
        return filePath;
    }

    describe('#parseArguments()', () => {
        it('shows the help message when there are no arguments or --help is first', () => {
            for (const args of [[], ['--help'], ['--help', '--overwrite']]) {
                const result = parseArguments(args);
                expect(result.quitProgram).to.equal(true);
                expect(result.message).to.include('Usage: node TestAnyLab.mjs');
            }
        });
        it('runs without overwriting when there is no option', () => {
            const result = parseArguments(['req.csv']);
            expect(result).to.include({ requirementsFilePath: 'req.csv', overwrite: false, quitProgram: false });
        });
        it('overwrites with --overwrite', () => {
            const result = parseArguments(['req.csv', '--overwrite']);
            expect(result).to.include({ overwrite: true, quitProgram: false });
        });
        it('shows the help message for --help after the file path', () => {
            expect(parseArguments(['req.csv', '--help']).quitProgram).to.equal(true);
        });
        it('quits on an unknown option', () => {
            const result = parseArguments(['req.csv', '--bogus']);
            expect(result.quitProgram).to.equal(true);
            expect(result.message).to.equal('Unknown option: --bogus');
        });
    });

    describe('#parseBoolean()', () => {
        it('reads true and false ignoring case and spaces', () => {
            expect(parseBoolean(' TRUE ', false)).to.equal(true);
            expect(parseBoolean('False', true)).to.equal(false);
        });
        it('uses the default for a missing or empty value', () => {
            expect(parseBoolean(undefined, true)).to.equal(true);
            expect(parseBoolean('  ', false)).to.equal(false);
        });
    });

    describe('#getSubmissionsPath()', () => {
        const req = '/courses/Lab1/req.csv';
        it('uses the Mac OS path (settings[0]) on mac and other systems', () => {
            expect(getSubmissionsPath({ macSubmissionsPath: '/abs/subs', windowsSubmissionsPath: 'C:/win' }, req, 'darwin')).to.equal('/abs/subs');
            expect(getSubmissionsPath({ macSubmissionsPath: '/abs/subs', windowsSubmissionsPath: 'C:/win' }, req, 'linux')).to.equal('/abs/subs');
        });
        it('uses the Windows path (settings[1]) on Windows', () => {
            expect(getSubmissionsPath({ macSubmissionsPath: '/abs/subs', windowsSubmissionsPath: 'C:/win/subs' }, req, 'win32')).to.equal('C:/win/subs');
        });
        it('makes a relative path relative to the requirements file', () => {
            expect(getSubmissionsPath({ macSubmissionsPath: 'subs/lab1' }, req, 'darwin')).to.equal('/courses/Lab1/subs/lab1');
            expect(getSubmissionsPath({ macSubmissionsPath: 'x', windowsSubmissionsPath: 'subs' }, 'C:\\courses\\req.csv', 'win32')).to.equal('C:\\courses\\subs');
        });
        it('throws if there is no path for the platform', () => {
            expect(() => getSubmissionsPath({ macSubmissionsPath: '/abs' }, req, 'win32')).to.throw('does not contain a submissions path');
            expect(() => getSubmissionsPath({  }, req, 'darwin')).to.throw('does not contain a submissions path');
        });
    });

    describe('#loadSettings()', () => {
        it('reads all the settings, including the last row when there is no trailing newline', () => {
            const filePath = writeRequirements({ settings: ['subs', 'winsubs', '2', 'Lab 3', 'false', 'true', 'true', 'false'] });
            const { labSettings, htmlAndCssChecker, jsChecker } = loadSettings(filePath, 'darwin');
            expect(labSettings).to.deep.equal({
                submissionsPath: path.join(baseDir, 'subs'),
                numberOfParts: 2,
                areAllInOneDir: false,
                isHTML: true,
                isCSS: true,
                isJavaScript: false,
            });
            expect(htmlAndCssChecker.requirements).to.be.an('object');
            expect(jsChecker).to.equal(null);
        });
        it('uses defaults for missing values', () => {
            const filePath = writeRequirements({ settings: ['subs'] });
            const warn = console.warn;
            let warning = '';
            console.warn = (message) => { warning += message; };
            try {
                const { labSettings } = loadSettings(filePath, 'darwin');
                expect(labSettings).to.include({ numberOfParts: 1, areAllInOneDir: true, isHTML: false, isCSS: false, isJavaScript: false });
            } finally {
                console.warn = warn;
            }
            expect(warning).to.include('1 of the 8 expected values');
        });
        it('only creates the JavaScript checker for a JavaScript lab', () => {
            const filePath = writeRequirements({ settings: ['subs', 'subs', '1', 'Lab', 'true', 'false', 'false', 'true'] });
            expect(loadSettings(filePath, 'darwin').jsChecker).to.not.equal(null);
        });
        it('throws a message naming the file if it cannot be read', () => {
            const missing = path.join(baseDir, 'missing.csv');
            expect(() => loadSettings(missing, 'darwin')).to.throw(`Error processing requirements file ${missing}`);
        });
    });

    describe('#main()', () => {
        const htmlPage = '<!DOCTYPE html><html><head><title>T</title></head><body><h1>Hi</h1></body></html>';
        let log, error, warn;

        // Keep the program's console output out of the test results
        beforeEach(() => {
            ({ log, error, warn } = console);
            console.log = console.error = console.warn = () => { };
        });
        afterEach(() => {
            Object.assign(console, { log, error, warn });
            process.exitCode = undefined;
        });

        function makeLab() {
            const subs = path.join(baseDir, 'subs');
            fs.mkdirSync(path.join(subs, 'Ann', 'Lab'), { recursive: true });
            fs.writeFileSync(path.join(subs, 'Ann', 'Lab', 'index.html'), htmlPage);
            fs.mkdirSync(path.join(subs, 'Bob'));  // no files at all
            fs.mkdirSync(path.join(subs, 'Cy_onlinetext'));
            fs.mkdirSync(path.join(subs, '.hidden'));
            // Check HTML, requiring an h1 and index.html, 1 html file, 0 css files, no validation
            const requirements = writeRequirements({
                settings: ['subs', 'subs', '1', 'Lab 1', 'true', 'true', 'false', 'false'],
                requiredElements1: ['h1'],
                moreRequirements: ['index', '1', '0', 'false', 'false'],
            });
            return { subs, requirements };
        }

        it('writes a report in each student folder, skipping online text and hidden folders', async () => {
            const { subs, requirements } = makeLab();
            await main([requirements]);

            const ann = fs.readFileSync(path.join(subs, 'Ann', 'Ann_report.txt'), 'utf8');
            expect(ann).to.include('Submission found in Lab');
            expect(ann).to.include('All required elements found');
            expect(fs.existsSync(path.join(subs, 'Bob', 'Bob_report.txt'))).to.equal(true);
            expect(fs.existsSync(path.join(subs, 'Cy_onlinetext', 'Cy_onlinetext_report.txt'))).to.equal(false);
            expect(fs.existsSync(path.join(subs, '.hidden', '.hidden_report.txt'))).to.equal(false);
        });

        it('skips students who have a report unless --overwrite is given', async () => {
            const { subs, requirements } = makeLab();
            const reportPath = path.join(subs, 'Ann', 'Ann_report.txt');
            fs.writeFileSync(reportPath, 'old report');

            await main([requirements]);
            expect(fs.readFileSync(reportPath, 'utf8')).to.equal('old report');

            await main([requirements, '--overwrite']);
            expect(fs.readFileSync(reportPath, 'utf8')).to.include('Checking the Ann directory');
        });

        it('keeps checking the other students when a report cannot be saved', async function () {
            if (process.getuid?.() === 0) {
                this.skip();  // root can write to a read-only folder
            }
            const { subs, requirements } = makeLab();
            const annDir = path.join(subs, 'Ann');
            fs.chmodSync(annDir, 0o555);  // read-only, like a folder unzipped from some zip files
            const errors = [];
            console.error = (message) => errors.push(message);
            try {
                await main([requirements]);
            } finally {
                fs.chmodSync(annDir, 0o755);
            }

            expect(fs.existsSync(path.join(annDir, 'Ann_report.txt'))).to.equal(false);
            expect(fs.existsSync(path.join(subs, 'Bob', 'Bob_report.txt'))).to.equal(true);
            expect(errors.join('\n')).to.include('Could not save the report for Ann');
            expect(errors.join('\n')).to.include('Ann (the folder is read-only)');
            expect(process.exitCode).to.equal(1);
        });

        it('sets a failing exit code when the requirements file is missing', async () => {
            await main([path.join(baseDir, 'missing.csv')]);
            expect(process.exitCode).to.equal(1);
        });
    });
});
