import { makeWritable, parseCanvasFileName, hasCanvasFiles, organizeCanvasDownload, isStudentArchive, unzip } from '../UnzipFiles.mjs';
import { expect } from 'chai';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

describe('UnzipFiles', () => {
    describe('#isStudentArchive()', () => {
        it('accepts .zip, .7z and .rar in any case, and nothing else', () => {
            for (const name of ['Lab1.zip', 'Lab 1.ZIP', 'a.7z', 'b.rar', 'C.Rar'])
            {
                expect(isStudentArchive(name), name).to.equal(true);
            }
            for (const name of ['index.html', 'notes.zip.txt', 'zip', 'a.tar', 'a.gz'])
            {
                expect(isStudentArchive(name), name).to.equal(false);
            }
        });
    });

    describe('#unzip()', function () {
        let dir;
        beforeEach(function () {
            // Unzipping a .7z needs bsdtar (macOS) or 7z (Windows), which can't be counted on everywhere
            if (process.platform !== 'darwin')
            {
                this.skip();
            }
            dir = fs.mkdtempSync(path.join(os.tmpdir(), 'unzip-'));
        });
        afterEach(() => {
            if (dir)
            {
                fs.rmSync(dir, { recursive: true, force: true });
            }
        });

        it('unzips a .7z file, keeping an existing file unless overwriting', () => {
            const source = path.join(dir, 'source');
            fs.mkdirSync(source);
            fs.writeFileSync(path.join(source, 'index.html'), 'original');
            const archive = path.join(dir, 'student.7z');
            execFileSync('tar', ['--format', '7zip', '-cf', archive, '-C', source, 'index.html']);
            const out = path.join(dir, 'out');
            fs.mkdirSync(out);
            fs.writeFileSync(path.join(out, 'index.html'), 'edited');

            expect(unzip(archive, out, false)).to.equal(true);
            expect(fs.readFileSync(path.join(out, 'index.html'), 'utf8')).to.equal('edited');
            expect(unzip(archive, out, true)).to.equal(true);
            expect(fs.readFileSync(path.join(out, 'index.html'), 'utf8')).to.equal('original');
        });

        it('reports an archive that is not valid instead of throwing', () => {
            const archive = path.join(dir, 'bad.rar');
            fs.writeFileSync(archive, 'not an archive');
            const messages = [];
            const realLog = console.log;
            console.log = (message) => messages.push(message);
            try
            {
                expect(unzip(archive, dir, false)).to.equal(false);
            }
            finally
            {
                console.log = realLog;
            }
            expect(messages.join('\n')).to.include('Error unzipping bad.rar');
        });
    });

    describe('#makeWritable()', function () {
        let baseDir;
        beforeEach(function () {
            if (process.platform === 'win32' || process.getuid?.() === 0) {
                this.skip();  // Windows only has a read-only flag, and root can write anywhere
            }
            baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'writable-'));
        });
        afterEach(() => {
            if (baseDir) {
                fs.chmodSync(baseDir, 0o755);
                fs.rmSync(baseDir, { recursive: true, force: true });
            }
        });

        const ownerBits = (p) => fs.statSync(p).mode & 0o700;

        it('makes read-only folders and files writable, all the way down', () => {
            const student = path.join(baseDir, 'Lab 1');
            const site = path.join(student, 'site');
            fs.mkdirSync(site, { recursive: true });
            fs.writeFileSync(path.join(site, 'index.html'), '<p>x</p>');
            fs.chmodSync(path.join(site, 'index.html'), 0o444);
            fs.chmodSync(site, 0o555);
            fs.chmodSync(student, 0o555);

            makeWritable(baseDir);

            expect(ownerBits(student)).to.equal(0o700);
            expect(ownerBits(site)).to.equal(0o700);
            expect(ownerBits(path.join(site, 'index.html'))).to.equal(0o600);
            expect(() => fs.writeFileSync(path.join(student, 'Lab 1_report.txt'), 'report')).to.not.throw();
        });

        it('leaves the other permissions alone', () => {
            const file = path.join(baseDir, 'script.sh');
            fs.writeFileSync(file, 'echo');
            fs.chmodSync(file, 0o755);

            makeWritable(baseDir);

            expect(fs.statSync(file).mode & 0o777).to.equal(0o755);
        });
    });

    describe('#parseCanvasFileName()', () => {
        it('reads the student, the ids and the original file name', () => {
            expect(parseCanvasFileName('brownlayne_8832_474847_cis195_Lab1_LayneBrown.zip')).to.deep.equal({
                student: 'brownlayne', late: false, userId: '8832', submissionId: '474847', originalName: 'cis195_Lab1_LayneBrown.zip' });
        });
        it('reads a late submission and names with accents or spaces in the original name', () => {
            expect(parseCanvasFileName('atchisonluther_LATE_2139_494991_LAB 1.zip')).to.include({
                student: 'atchisonluther', late: true, userId: '2139', originalName: 'LAB 1.zip' });
            expect(parseCanvasFileName('schwarzvolfdòmhnall_6657_454240_ada_lovelace_bio.zip')).to.include({
                student: 'schwarzvolfdòmhnall', originalName: 'ada_lovelace_bio.zip' });
        });
        it('does not read other names', () => {
            expect(parseCanvasFileName('Ty Titan_123_assignsubmission_file_lab.zip')).to.equal(null);  // Moodle
            expect(parseCanvasFileName('index.html')).to.equal(null);
            expect(parseCanvasFileName('titanty_123_lab.zip')).to.equal(null);  // only one id
        });
    });

    describe('#organizeCanvasDownload()', () => {
        let dir;
        beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'canvas-')); });
        afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }); });
        const write = (name, text = name) => fs.writeFileSync(path.join(dir, name), text);
        const list = (p = dir) => fs.readdirSync(p).sort();

        it('moves each file into a folder for its student, without the Canvas part of the name', () => {
            write('titanty_123_9001_lab.zip');
            write('bearbo_LATE_456_9002_Bo Lab.zip');
            write('bearbo_LATE_456_9002_notes.txt');
            write('smithjo_11_9003_site.zip');
            write('smithjo_22_9004_site.zip');
            write('readme.txt');
            const log = console.log;
            const messages = [];
            console.log = (message) => messages.push(message);
            try {
                expect(hasCanvasFiles(dir)).to.equal(true);
                organizeCanvasDownload(dir, false);
            } finally {
                console.log = log;
            }

            // Late students get _LATE; two students with the same name get their ids
            expect(list()).to.deep.equal(['bearbo_LATE', 'readme.txt', 'smithjo_11', 'smithjo_22', 'titanty']);
            expect(list(path.join(dir, 'bearbo_LATE'))).to.deep.equal(['Bo Lab.zip', 'notes.txt']);
            expect(list(path.join(dir, 'titanty'))).to.deep.equal(['lab.zip']);
            expect(fs.readFileSync(path.join(dir, 'smithjo_22', 'site.zip'), 'utf8')).to.equal('smithjo_22_9004_site.zip');
            expect(messages.join('\n')).to.include("Left readme.txt where it is");
            expect(hasCanvasFiles(dir)).to.equal(false);
        });

        it('keeps a file the student folder already has, unless overwriting', () => {
            fs.mkdirSync(path.join(dir, 'titanty'));
            fs.writeFileSync(path.join(dir, 'titanty', 'notes.txt'), 'edited');

            write('titanty_123_9001_notes.txt', 'from the download');
            organizeCanvasDownload(dir, false);
            expect(fs.readFileSync(path.join(dir, 'titanty', 'notes.txt'), 'utf8')).to.equal('edited');
            expect(list()).to.deep.equal(['titanty']);

            write('titanty_123_9001_notes.txt', 'from the download');
            organizeCanvasDownload(dir, true);
            expect(fs.readFileSync(path.join(dir, 'titanty', 'notes.txt'), 'utf8')).to.equal('from the download');
        });
    });
});
