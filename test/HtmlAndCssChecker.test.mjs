import { HtmlAndCssChecker } from '../HtmlAndCssChecker.mjs';
import { expect } from 'chai';
import http from 'http';

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

    describe('#loadRequirements() columns', () => {
        const csvText = [
            'requiredElements1,requiredElements2,requiredCssSelectors,requiredCssProperties,moreRequirements,regExpForHTML1,regExpForHTML1Description,regExpForCSS1,regExpForCSS1Description',
            'h1,h2,.nav,color : red,index,"<a href=""x"">",a link to x,margin,a margin',
            'p,,#main,font-size: 2em,1,,,,',
            ',,,,,,,,',
        ].join('\n');

        it('reads each column into its list, ignoring empty cells', () => {
            const { requirements } = new HtmlAndCssChecker(Buffer.from(csvText));
            expect(requirements.requiredElements1).to.deep.equal(['h1', 'p']);
            expect(requirements.requiredElements2).to.deep.equal(['h2']);
            expect(requirements.requiredCssSelectors).to.deep.equal(['.nav', '#main']);
            expect(requirements.additionalRequirements).to.deep.equal(['index', '1']);
            expect(requirements.regExpForHTML1Description).to.deep.equal(['a link to x']);
            expect(requirements.regExpForCSS1).to.deep.equal(['margin']);
            expect(requirements.regExpForCSS1Description).to.deep.equal(['a margin']);
        });

        it('removes the whitespace from required CSS properties', () => {
            const { requirements } = new HtmlAndCssChecker(Buffer.from(csvText));
            expect(requirements.requiredCssProperties).to.deep.equal(['color:red', 'font-size:2em']);
        });

        it('un-escapes doubled quotes in a quoted cell', () => {
            const { requirements } = new HtmlAndCssChecker(Buffer.from(csvText));
            expect(requirements.regExpForHTML1).to.deep.equal(['<a href="x">']);
        });
    });

    describe('minimum numbers of required elements (number1 and number2 columns)', () => {
        it('reads each minimum from the same row as its element', () => {
            const csvText = [
                'requiredElements1,number1,requiredElements2,number2',
                'title,1,h1,3',
                'a[href],2,,',      // blank cell in requiredElements2: no element, so no number
                'img,,p,',          // blank number1: the minimum is 1
                ',5,,',             // a number with no element is ignored
                'br,2,,',
            ].join('\n');

            const { requirements } = new HtmlAndCssChecker(Buffer.from(csvText));

            expect(requirements.requiredElements1).to.deep.equal(['title', 'a[href]', 'img', 'br']);
            expect(requirements.minElements1).to.deep.equal([1, 2, 1, 2]);
            expect(requirements.requiredElements2).to.deep.equal(['h1', 'p']);
            expect(requirements.minElements2).to.deep.equal([3, 1]);
        });

        it('uses 1 when there is no number column', () => {
            const { requirements } = new HtmlAndCssChecker(Buffer.from('requiredElements1\nh1\np'));
            expect(requirements.minElements1).to.deep.equal([1, 1]);
        });

        it('parseMinimum() reads whole numbers and uses 1 for anything else', () => {
            expect(HtmlAndCssChecker.parseMinimum('3')).to.equal(3);
            expect(HtmlAndCssChecker.parseMinimum(' 2 ')).to.equal(2);
            expect(HtmlAndCssChecker.parseMinimum('')).to.equal(1);
            expect(HtmlAndCssChecker.parseMinimum(undefined)).to.equal(1);
            expect(HtmlAndCssChecker.parseMinimum('two')).to.equal(1);
        });
    });

    describe('#validateCSS()', function () {
        this.timeout(10000);  // requests are spaced one second apart
        const soap = (errors) => '<?xml version="1.0"?><env:Envelope xmlns:env="http://www.w3.org/2003/05/soap-envelope" ' +
            'xmlns:m="http://www.w3.org/2005/07/css-validator"><env:Body><m:cssvalidationresponse><m:result><m:errors>' +
            errors.map((e) => `<m:error><m:message>${e}</m:message></m:error>`).join('') +
            '</m:errors></m:result></m:cssvalidationresponse></env:Body></env:Envelope>';
        let server, url, received, respond;

        // A local server stands in for the W3C CSS validator
        before(async () => {
            server = http.createServer((request, response) => {
                let body = '';
                request.on('data', (chunk) => (body += chunk));
                request.on('end', () => {
                    received = { method: request.method, body };
                    respond(response);
                });
            });
            await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
            url = `http://127.0.0.1:${server.address().port}/validator`;
        });
        after(() => { server.close(); });

        it('sends the CSS in the body of a POST request, even with characters that break a URL', async () => {
            respond = (response) => response.end(soap([]));
            const css = '#a > p::after { content: "&+%"; } .b { color: red }';

            const report = await HtmlAndCssChecker.validateCSS(css, 'a.css', url);

            expect(received.method).to.equal('POST');
            expect(received.body).to.include(css);
            expect(report).to.equal('No errors found in a.css\n');
        });

        it('reports the errors found', async () => {
            respond = (response) => response.end(soap(['Property colr does not exist']));

            const report = await HtmlAndCssChecker.validateCSS('p { colr: red }', 'b.css', url);

            expect(report).to.include('b.css: Property colr does not exist');
            expect(report).to.not.include('No errors found');
        });

        it('reports a problem with the service instead of throwing', async () => {
            respond = (response) => { response.statusCode = 503; response.end('busy'); };

            const report = await HtmlAndCssChecker.validateCSS('p { }', 'c.css', url);

            expect(report).to.include('Could not validate c.css');
            expect(report).to.include('503');
        });

        it('reports an unreachable service instead of throwing', async () => {
            const report = await HtmlAndCssChecker.validateCSS('p { }', 'd.css', 'http://127.0.0.1:1/validator');

            expect(report).to.include('Could not validate d.css');
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
