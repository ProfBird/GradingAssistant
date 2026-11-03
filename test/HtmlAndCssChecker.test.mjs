import { HtmlAndCssChecker } from '../HtmlAndCssChecker.mjs';
import { expect } from 'chai';

describe('HtmlAndCssChecker', () => {
    describe('#loadRequirements()', () => {
        const csvText = 'requiredElements1,moreRequirements\nh1,index\np,2';

        it('reads the last row when the file has no trailing newline', () => {
            const checker = new HtmlAndCssChecker(Buffer.from(csvText));
            expect(checker.requirements.requiredElements1).to.deep.equal(['h1', 'p']);
            expect(checker.requirements.additionalRequirements).to.deep.equal(['index', '2']);
        });

        it('reads the same rows when the file has a trailing newline', () => {
            const checker = new HtmlAndCssChecker(Buffer.from(csvText + '\n'));
            expect(checker.requirements.requiredElements1).to.deep.equal(['h1', 'p']);
            expect(checker.requirements.additionalRequirements).to.deep.equal(['index', '2']);
        });
    });
});
