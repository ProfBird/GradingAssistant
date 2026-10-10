import { findSubmissionRoot, getPartDirs } from '../SubmissionFolders.mjs';
import { expect } from 'chai';
import fs from 'fs';
import os from 'os';
import path from 'path';

describe('SubmissionFolders', () => {
    let base;

    // Create files and folders (paths ending in / are folders) under the temp dir
    function make(...entries) {
        for (const entry of entries) {
            const full = path.join(base, entry);
            if (entry.endsWith("/")) {
                fs.mkdirSync(full, { recursive: true });
            } else {
                fs.mkdirSync(path.dirname(full), { recursive: true });
                fs.writeFileSync(full, "x");
            }
        }
    }

    beforeEach(() => { base = fs.mkdtempSync(path.join(os.tmpdir(), "subfolders-")); });
    afterEach(() => { fs.rmSync(base, { recursive: true, force: true }); });

    describe('#findSubmissionRoot()', () => {
        it('returns the student folder when it contains files', () => {
            make("index.html", "Lab/page.html");
            expect(findSubmissionRoot(base)).to.equal(base);
        });

        it('steps into a single wrapper folder', () => {
            make("Lab/index.html");
            expect(findSubmissionRoot(base)).to.equal(path.join(base, "Lab"));
        });

        it('steps through several wrapper folders', () => {
            make("cocosite/coco_site/index.html");
            expect(findSubmissionRoot(base)).to.equal(path.join(base, "cocosite", "coco_site"));
        });

        it('ignores junk folders and files', () => {
            make("Website/index.html", "MACOSX/Website/._index.html", "__MACOSX/x", ".DS_Store",
                "Lab.zip", "TyTitan_report.txt");
            expect(findSubmissionRoot(base)).to.equal(path.join(base, "Website"));
        });

        it('stops at a folder with several sub-folders', () => {
            make("Wrapper/website 1/index.html", "Wrapper/website 2/index.html");
            expect(findSubmissionRoot(base)).to.equal(path.join(base, "Wrapper"));
        });

        it('returns the student folder when it is empty', () => {
            expect(findSubmissionRoot(base)).to.equal(base);
        });
    });

    describe('#getPartDirs()', () => {
        it('uses the root for every part when all parts are in one folder', () => {
            make("Lab/index.html");
            const root = path.join(base, "Lab");
            expect(getPartDirs(base, 2, true)).to.deep.equal({ root, partDirs: [root, root] });
        });

        it('uses the root for a one-part lab', () => {
            make("Lab/index.html");
            const root = path.join(base, "Lab");
            expect(getPartDirs(base, 1, false)).to.deep.equal({ root, partDirs: [root] });
        });

        it('uses sub-folders as parts, in natural order', () => {
            make("Wrapper/website 10/a.html", "Wrapper/website 2/b.html", "MACOSX/Wrapper/x");
            const root = path.join(base, "Wrapper");
            expect(getPartDirs(base, 2, false)).to.deep.equal({
                root,
                partDirs: [path.join(root, "website 2"), path.join(root, "website 10")]
            });
        });

        it('gives null for a part that has no folder', () => {
            make("Lab/Part1/index.html");
            const result = getPartDirs(base, 2, false);
            expect(result.partDirs).to.deep.equal([path.join(base, "Lab", "Part1"), null]);
        });
    });
});
