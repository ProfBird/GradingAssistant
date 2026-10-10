import { validateHtml, resolveHtmlValidatorSetting, formatMessages,
    defaultHtmlValidator, htmlValidatorNames } from '../HtmlValidators.mjs';
import { expect } from 'chai';

describe('HtmlValidators', () => {
    describe('#resolveHtmlValidatorSetting()', () => {
        it('turns validation off for false, empty and missing values', () => {
            expect(resolveHtmlValidatorSetting("false")).to.equal(null);
            expect(resolveHtmlValidatorSetting("FALSE")).to.equal(null);
            expect(resolveHtmlValidatorSetting("")).to.equal(null);
            expect(resolveHtmlValidatorSetting(undefined)).to.equal(null);
        });
        it('uses the default validator for true', () => {
            expect(resolveHtmlValidatorSetting("true")).to.equal(defaultHtmlValidator);
            expect(resolveHtmlValidatorSetting(" True ")).to.equal(defaultHtmlValidator);
        });
        it('returns a validator name in lower case', () => {
            expect(resolveHtmlValidatorSetting("W3C")).to.equal("w3c");
            expect(resolveHtmlValidatorSetting("vnu")).to.equal("vnu");
        });
        it('has html-validate as the default and w3c and vnu as options', () => {
            expect(defaultHtmlValidator).to.equal("html-validate");
            expect(htmlValidatorNames).to.have.members(["html-validate", "w3c", "vnu"]);
        });
    });

    describe('#formatMessages()', () => {
        it('reports no errors', () => {
            expect(formatMessages([], "index.html")).to.equal("No errors found in index.html\n");
        });
    });

    describe('#validateHtml() with html-validate', () => {
        const goodHtml = '<!DOCTYPE html>\n<html lang="en">\n<head><meta charset="utf-8"><title>T</title></head>\n' +
            '<body><h1>Hi</h1><p>Text</p></body>\n</html>\n';

        it('finds no errors in valid html', async () => {
            const report = await validateHtml(goodHtml, "good.html");
            expect(report).to.equal("No errors found in good.html\n");
        });

        it('reports errors with line and column', async () => {
            const bad = goodHtml.replace("<p>Text</p>", "<em><li>Item</li></em>");
            const report = await validateHtml(bad, "bad.html");
            expect(report).to.match(/error found on line \d+ column \d+: /);
            expect(report).to.not.include("No errors found");
        });

        it('reports a missing lang attribute', async () => {
            const report = await validateHtml(goodHtml.replace(' lang="en"', ""), "nolang.html");
            expect(report).to.include('"lang"');
        });
    });

    describe('#validateHtml() with an unknown validator', () => {
        it('reports the problem instead of throwing', async () => {
            const report = await validateHtml("<p>x</p>", "x.html", "nope");
            expect(report).to.include('Unknown HTML validator "nope"');
        });
    });
});
