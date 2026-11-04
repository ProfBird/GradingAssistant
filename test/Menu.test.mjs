import { BACK, addRecent, ask, buildArguments, loadConfig, runSteps, saveConfig } from '../Menu.mjs';
import { expect } from 'chai';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { PassThrough } from 'stream';

describe('Menu', () => {
    describe('#buildArguments()', () => {
        it('adds --overwrite only when asked', () => {
            expect(buildArguments('/a b/req.csv', false)).to.deep.equal(['/a b/req.csv']);
            expect(buildArguments('/a b/req.csv', true)).to.deep.equal(['/a b/req.csv', '--overwrite']);
        });
        it('adds --submissions and the folder only when a folder is given', () => {
            expect(buildArguments('/a b/req.csv', false, '/c d/subs')).to.deep.equal(['/a b/req.csv', '--submissions', '/c d/subs']);
            expect(buildArguments('/a b/req.csv', true, '/c d/subs')).to.deep.equal(['/a b/req.csv', '--overwrite', '--submissions', '/c d/subs']);
            expect(buildArguments('/a b/req.csv', false, undefined)).to.deep.equal(['/a b/req.csv']);
        });
    });

    describe('#ask()', () => {
        /** Makes a fake input stream that can send keypress events */
        const makeInput = () => new PassThrough();
        const abortError = () => Object.assign(new Error('aborted'), { name: 'AbortPromptError' });

        it('gives the answer of the prompt', async () => {
            const answer = await ask(async () => 'yes', {}, makeInput());
            expect(answer).to.equal('yes');
        });
        it('gives BACK when Esc is pressed', async () => {
            const input = makeInput();
            const prompt = (config, { signal }) => new Promise((resolve, reject) => {
                signal.addEventListener('abort', () => reject(abortError()));
            });
            const pending = ask(prompt, {}, input);
            input.emit('keypress', undefined, { name: 'down' });
            input.emit('keypress', '\u001b', { name: 'escape' });
            expect(await pending).to.equal(BACK);
        });
        it('removes its key listener when done, and passes other errors on', async () => {
            const input = makeInput();
            await ask(async () => 1, {}, input);
            expect(input.listenerCount('keypress')).to.equal(0);
            let thrown = null;
            try {
                await ask(async () => { throw new Error('other'); }, {}, input);
            } catch (error) {
                thrown = error;
            }
            expect(thrown.message).to.equal('other');
            expect(input.listenerCount('keypress')).to.equal(0);
        });
    });

    describe('#runSteps()', () => {
        /** Makes a step that gives its answers in order, and records which questions were asked */
        const makeStep = (key, answers, asked, when) => ({
            key,
            when,
            ask: async () => {
                asked.push(key);
                return answers.shift();
            },
        });

        it('collects the answers in order', async () => {
            const asked = [];
            const result = await runSteps([makeStep('a', [1], asked), makeStep('b', [2], asked)]);
            expect(result).to.deep.equal({ a: 1, b: 2 });
            expect(asked).to.deep.equal(['a', 'b']);
        });
        it('goes back to the previous question and takes the new answer', async () => {
            const asked = [];
            const result = await runSteps([makeStep('a', [1, 3], asked), makeStep('b', [BACK, 2], asked)]);
            expect(result).to.deep.equal({ a: 3, b: 2 });
            expect(asked).to.deep.equal(['a', 'b', 'a', 'b']);
        });
        it('gives null when going back from the first question', async () => {
            expect(await runSteps([makeStep('a', [BACK], [])])).to.equal(null);
        });
        it('skips questions whose condition is false, also when going back', async () => {
            const asked = [];
            const result = await runSteps([
                makeStep('a', [false, false], asked),
                makeStep('b', [], asked, (answers) => answers.a),
                makeStep('c', [BACK, 'done'], asked),
            ]);
            expect(result).to.deep.equal({ a: false, c: 'done' });
            expect(asked).to.deep.equal(['a', 'c', 'a', 'c']);
        });
        it('asks a conditional question that is needed after going back', async () => {
            const asked = [];
            const result = await runSteps([
                makeStep('a', [true], asked),
                makeStep('b', ['x', 'x2'], asked, (answers) => answers.a),
                makeStep('c', [BACK, 'y'], asked),
            ]);
            expect(result).to.deep.equal({ a: true, b: 'x2', c: 'y' });
            expect(asked).to.deep.equal(['a', 'b', 'c', 'b', 'c']);
        });
    });

    describe('#addRecent()', () => {
        it('puts the item first without duplicates', () => {
            expect(addRecent(['b', 'a', 'c'], 'a')).to.deep.equal(['a', 'b', 'c']);
            expect(addRecent([], 'a')).to.deep.equal(['a']);
        });
        it('keeps at most 8 items', () => {
            const recent = ['1', '2', '3', '4', '5', '6', '7', '8'];
            expect(addRecent(recent, 'new')).to.deep.equal(['new', '1', '2', '3', '4', '5', '6', '7']);
        });
    });

    describe('#loadConfig() and #saveConfig()', () => {
        let dir, filePath, warn, warnings;
        beforeEach(() => {
            dir = fs.mkdtempSync(path.join(os.tmpdir(), 'menu-'));
            filePath = path.join(dir, '.gradingassistant.json');
            warn = console.warn;
            warnings = [];
            console.warn = (message) => warnings.push(message);
        });
        afterEach(() => {
            console.warn = warn;
            fs.rmSync(dir, { recursive: true, force: true });
        });

        const defaults = { recentRequirementsFiles: [], recentSubmissionsFolders: [], recentCheckedFolders: [], overwriteReports: false,
            overwriteUnzipped: false, lastAction: 'check' };

        it('gives the defaults when there is no file, without a warning', () => {
            expect(loadConfig(filePath)).to.deep.equal(defaults);
            expect(warnings).to.deep.equal([]);
        });

        it('reads back what was saved', () => {
            const config = { ...defaults, recentRequirementsFiles: ['/x/Lab1.csv'], overwriteReports: true, lastAction: 'unzip' };
            saveConfig(config, filePath);
            expect(loadConfig(filePath)).to.deep.equal(config);
        });

        it('warns and gives the defaults when the file is not valid JSON', () => {
            fs.writeFileSync(filePath, '{ not json');
            expect(loadConfig(filePath)).to.deep.equal(defaults);
            expect(warnings[0]).to.include('could not read');
        });

        it('ignores values of the wrong type', () => {
            fs.writeFileSync(filePath, JSON.stringify({ recentRequirementsFiles: ['/a.csv', 5, null], recentSubmissionsFolders: 'x',
                overwriteReports: 'yes', lastAction: 'unzip', extra: 1 }));
            expect(loadConfig(filePath)).to.deep.equal({ ...defaults, recentRequirementsFiles: ['/a.csv'], lastAction: 'unzip' });
        });
    });
});
