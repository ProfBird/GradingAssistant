import { addRecent, buildArguments, loadConfig, saveConfig } from '../Menu.mjs';
import { expect } from 'chai';
import fs from 'fs';
import os from 'os';
import path from 'path';

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
