import { JsChecker } from '../JsChecker.mjs';
import { expect } from 'chai';
import fs from 'fs';
import os from 'os';
import path from 'path';

describe('JsChecker', () => {
    let baseDir;

    // Make a student folder holding x.js
    function makeStudentDir(name) {
        const dir = path.join(baseDir, name);
        fs.mkdirSync(dir);
        fs.writeFileSync(path.join(dir, 'x.js'), '// student code');
        return dir;
    }

    beforeEach(() => { baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jschecker-')); });
    afterEach(() => { fs.rmSync(baseDir, { recursive: true, force: true }); });

    describe('#checkSubmission()', () => {
        for (const [unitTestName, suiteTitle, source] of [
            // A CommonJS and an ES module unit test file. Each reads the file to test from TESTED_FILE.
            ['unit.cjs', 'cjs', 'const assert = require("assert");\n' +
                'describe("cjs", () => { it(process.env.TESTED_FILE, () => assert.ok(true)); });\n'],
            ['unit.mjs', 'esm', 'import assert from "assert";\n' +
                'describe("esm", () => { it(process.env.TESTED_FILE, () => assert.ok(true)); });\n'],
        ]) {
            it(`runs the ${unitTestName} tests for every student`, async () => {
                fs.writeFileSync(path.join(baseDir, unitTestName), source);
                const checker = new JsChecker(Buffer.from(`unitTests,filesToTest\n${unitTestName},x.js`), baseDir);

                for (const student of ['a', 'b']) {
                    const report = await checker.checkSubmission(makeStudentDir(student), 1);
                    // The 2nd student's run must register its own tests, not reuse the first student's
                    expect(report).to.include('Testing: ' + suiteTitle);
                    expect(report).to.include('Passed');
                }
            });
        }

        it('does not report Passed when no tests ran', async () => {
            fs.writeFileSync(path.join(baseDir, 'empty.cjs'), '// no tests here\n');
            const checker = new JsChecker(Buffer.from('unitTests,filesToTest\nempty.cjs,x.js'), baseDir);

            const report = await checker.checkSubmission(makeStudentDir('a'), 1);

            expect(report).to.include('no tests ran');
            expect(report).to.not.include('Passed');
        });
    });
});
