import { makeWritable } from '../UnzipFiles.mjs';
import { expect } from 'chai';
import fs from 'fs';
import os from 'os';
import path from 'path';

describe('UnzipFiles', () => {
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
});
