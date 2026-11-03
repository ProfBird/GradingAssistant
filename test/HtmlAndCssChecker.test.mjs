import { HtmlAndCssChecker } from '../HtmlAndCssChecker.mjs';
import { makeRequirements } from '../Requirements.mjs';
import { expect } from 'chai';
import http from 'http';

describe('HtmlAndCssChecker', () => {
    describe('constructor', () => {
        it('keeps the requirements it is given', () => {
            const requirements = makeRequirements({ requiredCssSelectors: ['.nav'] });
            expect(new HtmlAndCssChecker(requirements).requirements).to.equal(requirements);
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
});
