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

    describe('#isCssValidationOn()', () => {
        it('is on only for "true", ignoring case and spaces', () => {
            expect(HtmlAndCssChecker.isCssValidationOn('true')).to.equal(true);
            expect(HtmlAndCssChecker.isCssValidationOn(' TRUE ')).to.equal(true);
        });
        it('is off for "false", an empty value and a missing value', () => {
            expect(HtmlAndCssChecker.isCssValidationOn('false')).to.equal(false);
            expect(HtmlAndCssChecker.isCssValidationOn('')).to.equal(false);
            expect(HtmlAndCssChecker.isCssValidationOn(undefined)).to.equal(false);
        });
    });
});
