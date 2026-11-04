import { main, parseArguments, loadSettings, getSubmissionsPath, parseBoolean, backupReport, makeRunLog } from '../TestAnyLab.mjs';
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
        it('has no submissions folder unless --submissions is given', () => {
            expect(parseArguments(['req.csv']).submissionsPath).to.equal(undefined);
        });
        it('reads --submissions with the folder as the next argument or after an equals sign', () => {
            expect(parseArguments(['req.csv', '--submissions', '/a b/subs'])).to.include({ submissionsPath: '/a b/subs', quitProgram: false });
            expect(parseArguments(['req.csv', '--submissions=/a b/subs'])).to.include({ submissionsPath: '/a b/subs', quitProgram: false });
        });
        it('reads --submissions and --overwrite in either order', () => {
            expect(parseArguments(['req.csv', '--submissions', 'subs', '--overwrite']))
                .to.include({ submissionsPath: 'subs', overwrite: true, quitProgram: false });
            expect(parseArguments(['req.csv', '--overwrite', '--submissions', 'subs']))
                .to.include({ submissionsPath: 'subs', overwrite: true, quitProgram: false });
        });
        it('quits when --submissions has no folder', () => {
            for (const args of [['req.csv', '--submissions'], ['req.csv', '--submissions=']]) {
                const result = parseArguments(args);
                expect(result.quitProgram).to.equal(true);
                expect(result.message).to.equal('Missing folder after --submissions');
            }
        });
        it('quits on an unknown option even after a good one, and describes --submissions in the help', () => {
            expect(parseArguments(['req.csv', '--overwrite', '--bogus'])).to.include({ quitProgram: true, message: 'Unknown option: --bogus' });
            expect(parseArguments(['req.csv', '--submissions', 'subs', '--help']).message).to.include('--submissions <folder>');
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
        it('uses a given submissions folder instead of the one in the file, even if the file has none', () => {
            const other = path.join(baseDir, 'other');
            fs.mkdirSync(other);
            const withPath = writeRequirements({ settings: ['subs', 'winsubs', '1', 'Lab', 'true', 'true', 'true', 'false'] });
            expect(loadSettings(withPath, 'darwin', other).labSettings.submissionsPath).to.equal(other);
            const noPath = writeRequirements({ settings: ['', '', '1', 'Lab', 'true', 'true', 'true', 'false'] }, 'nopath.csv');
            expect(loadSettings(noPath, 'darwin', other).labSettings.submissionsPath).to.equal(other);
        });
        it('throws if the given submissions folder is missing or is a file', () => {
            const filePath = writeRequirements({ settings: ['subs', 'subs', '1', 'Lab', 'true', 'true', 'true', 'false'] });
            const missing = path.join(baseDir, 'nope');
            expect(() => loadSettings(filePath, 'darwin', missing)).to.throw(`the submissions folder ${missing} is not a folder`);
            expect(() => loadSettings(filePath, 'darwin', filePath)).to.throw('is not a folder');
        });
    });

    describe('#makeRunLog()', () => {
        it('has the date and time, the full path of the requirements file, the count and the students', () => {
            const log = makeRunLog(new Date(2026, 10, 2, 9, 5, 7), 'labs/Lab1.csv', ['Ann', 'Bob']);
            expect(log).to.equal([
                'Date and time: 2026-11-02 09:05:07',
                `Requirements file: ${path.resolve('labs/Lab1.csv')}`,
                'Submissions checked: 2',
                'Students:',
                '  Ann',
                '  Bob',
            ].join('\n') + '\n');
        });

        it('says 0 when every student was skipped', () => {
            expect(makeRunLog(new Date(2026, 0, 1), '/x.csv', [])).to.include('Submissions checked: 0\nStudents:\n');
        });
    });

    describe('#backupReport()', () => {
        it('does nothing when there is no report yet', () => {
            expect(backupReport(path.join(baseDir, 'Ann_report.txt'), 'new')).to.equal(null);
            expect(fs.readdirSync(baseDir)).to.deep.equal([]);
        });

        it('does nothing when the new report is the same', () => {
            const reportPath = path.join(baseDir, 'Ann_report.txt');
            fs.writeFileSync(reportPath, 'same');
            expect(backupReport(reportPath, 'same')).to.equal(null);
            expect(fs.readdirSync(baseDir)).to.deep.equal(['Ann_report.txt']);
        });

        it('copies the old report to a file named with the time it was saved', () => {
            const reportPath = path.join(baseDir, 'Ann_report.txt');
            fs.writeFileSync(reportPath, 'old');
            const savedAt = new Date(2026, 10, 2, 21, 30, 5);
            fs.utimesSync(reportPath, savedAt, savedAt);

            const backupPath = backupReport(reportPath, 'new');

            expect(path.basename(backupPath)).to.equal('Ann_report_backup_2026-11-02_21-30-05.txt');
            expect(fs.readFileSync(backupPath, 'utf8')).to.equal('old');
            expect(fs.readFileSync(reportPath, 'utf8')).to.equal('old');  // the caller overwrites it
        });

        it('does not replace an earlier backup from the same second', () => {
            const reportPath = path.join(baseDir, 'Ann_report.txt');
            const savedAt = new Date(2026, 10, 2, 21, 30, 5);
            for (const text of ['first', 'second']) {
                fs.writeFileSync(reportPath, text);
                fs.utimesSync(reportPath, savedAt, savedAt);
                backupReport(reportPath, 'new');
            }
            expect(fs.readFileSync(path.join(baseDir, 'Ann_report_backup_2026-11-02_21-30-05.txt'), 'utf8')).to.equal('first');
            expect(fs.readFileSync(path.join(baseDir, 'Ann_report_backup_2026-11-02_21-30-05_2.txt'), 'utf8')).to.equal('second');
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

        it('checks the folder given with --submissions instead of the one in the requirements file', async () => {
            const { subs, requirements } = makeLab();
            const other = path.join(baseDir, 'other');
            fs.cpSync(subs, other, { recursive: true });
            fs.rmSync(path.join(subs, 'Ann', 'Lab'), { recursive: true });  // the file's own folder would give a different report

            await main([requirements, '--submissions', other]);

            expect(fs.readFileSync(path.join(other, 'Ann', 'Ann_report.txt'), 'utf8')).to.include('All required elements found');
            expect(fs.existsSync(path.join(subs, 'Ann', 'Ann_report.txt'))).to.equal(false);
            expect(fs.readdirSync(other).some((name) => /^TestAnyLab_.*\.log$/.test(name))).to.equal(true);
        });

        it('reports a --submissions folder that does not exist and checks nothing', async () => {
            const { subs, requirements } = makeLab();
            await main([requirements, '--submissions', path.join(baseDir, 'nope')]);
            expect(process.exitCode).to.equal(1);
            expect(fs.existsSync(path.join(subs, 'Ann', 'Ann_report.txt'))).to.equal(false);
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

        it('keeps a backup of a report it overwrites, and still finds the submission', async () => {
            const { subs, requirements } = makeLab();
            const annDir = path.join(subs, 'Ann');
            fs.writeFileSync(path.join(annDir, 'Ann_report.txt'), 'old report');

            await main([requirements, '--overwrite']);
            const backups = fs.readdirSync(annDir).filter((name) => name.startsWith('Ann_report_backup_'));
            expect(backups).to.have.length(1);
            expect(fs.readFileSync(path.join(annDir, backups[0]), 'utf8')).to.equal('old report');
            // The backup is not mistaken for part of the submission
            const report = fs.readFileSync(path.join(annDir, 'Ann_report.txt'), 'utf8');
            expect(report).to.include('Submission found in Lab');

            // The same report again: nothing new to back up
            await main([requirements, '--overwrite']);
            expect(fs.readdirSync(annDir).filter((name) => name.startsWith('Ann_report_backup_'))).to.have.length(1);
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

        it('saves a run log in the submissions folder listing the students checked', async () => {
            const { subs, requirements } = makeLab();
            fs.writeFileSync(path.join(subs, 'Bob', 'Bob_report.txt'), 'old report');  // Bob is skipped

            await main([requirements]);

            const logs = fs.readdirSync(subs).filter((name) => /^TestAnyLab_\d{4}-\d\d-\d\d_\d\d-\d\d-\d\d\.log$/.test(name));
            expect(logs).to.have.length(1);
            const log = fs.readFileSync(path.join(subs, logs[0]), 'utf8');
            expect(log).to.match(/^Date and time: \d{4}-\d\d-\d\d \d\d:\d\d:\d\d\n/);
            expect(log).to.include(`Requirements file: ${requirements}\n`);
            expect(log).to.include('Submissions checked: 1\nStudents:\n  Ann\n');
            expect(log).to.not.include('Bob');
        });

        it('sets a failing exit code when the requirements file is missing', async () => {
            await main([path.join(baseDir, 'missing.csv')]);
            expect(process.exitCode).to.equal(1);
        });
    });
});
