import { parseStylesheet, parseInlineStyle, findRequiredSelectors, findRequiredProperties } from '../CssParser.mjs';
import { expect } from 'chai';

describe('CssParser', () => {
    describe('#parseStylesheet()', () => {
        it('gets each rule, including rules inside @media, and each declaration, ignoring comments', () => {
            const css = 'body { Color: red; margin: 0 auto !important }\n' +
                '@media (min-width: 600px) { .nav > a, h1 { color: blue } }\n/* p { padding: 1px } */';

            const { rules, declarations } = parseStylesheet(css, 'external');

            expect(rules.map((rule) => rule.selectors)).to.deep.equal([['body'], ['.nav>a', 'h1']]);
            expect(rules.every((rule) => rule.source === 'external')).to.equal(true);
            expect(declarations).to.deep.equal([
                { property: 'color', value: 'red', source: 'external' },
                { property: 'margin', value: '0 auto', source: 'external' },
                { property: 'color', value: 'blue', source: 'external' },
            ]);
        });

        it('returns nothing for text that has no rules, without throwing', () => {
            expect(parseStylesheet('/* 123 */ 456', 'embedded')).to.deep.equal({ rules: [], declarations: [] });
            expect(() => parseStylesheet('p { color: ; } { broken', 'embedded')).to.not.throw();
        });
    });

    describe('#parseInlineStyle()', () => {
        it('gets the declarations in a style attribute', () => {
            expect(parseInlineStyle('display:  flex; COLOR: Red')).to.deep.equal({
                rules: [],
                declarations: [
                    { property: 'display', value: 'flex', source: 'inline' },
                    { property: 'color', value: 'Red', source: 'inline' },
                ],
            });
        });
    });

    describe('#findRequiredSelectors()', () => {
        const rulesFrom = (css) => parseStylesheet(css, 'external').rules;

        it('finds a selector that is a whole part of a selector in a rule', () => {
            const rules = rulesFrom('nav a { } body > header { } footer.site { } h1, aside { }');
            expect(findRequiredSelectors(['nav', 'header', 'footer', 'aside', 'body > header'], rules))
                .to.deep.equal(['nav', 'header', 'footer', 'aside', 'body > header']);
        });

        it('does not find a selector that is only part of a name, in a comment, or in a value', () => {
            const rules = rulesFrom('.navbar { } /* .nav { } */ main { grid-template-areas: "nav main" }');
            expect(findRequiredSelectors(['.nav', 'nav'], rules)).to.deep.equal([]);
        });

        it('needs the same combinators, and all the simple selectors on the same element', () => {
            const rules = rulesFrom('nav a { } nav.main { } .main p { }');
            expect(findRequiredSelectors(['nav > a', 'nav a', 'nav.main', 'p.main', '.main p'], rules))
                .to.deep.equal(['nav a', 'nav.main', '.main p']);
        });

        it('ignores spaces and the case of element names, but not of class names', () => {
            const rules = rulesFrom('NAV>A { } .Menu { }');
            expect(findRequiredSelectors(['nav > a', '.Menu', '.menu'], rules)).to.deep.equal(['nav > a', '.Menu']);
        });

        it('finds a required list when each of its selectors is found', () => {
            const rules = rulesFrom('header, footer { } nav { }');
            expect(findRequiredSelectors(['header, footer', 'header, nav', 'header, aside'], rules))
                .to.deep.equal(['header, footer', 'header, nav']);
        });

        it('does not throw on a required selector it cannot read', () => {
            expect(findRequiredSelectors(['&gt; x'], rulesFrom('p { }'))).to.deep.equal([]);
        });
    });

    describe('#findRequiredProperties()', () => {
        const declarationsFrom = (css) => parseStylesheet(css, 'external').declarations;

        it('finds a property and value, ignoring case, white space and !important', () => {
            const declarations = declarationsFrom('p { Display: GRID !important; margin: 0  auto; color: #FFF }');
            expect(findRequiredProperties(['display:grid', 'margin:0auto', 'color:#fff', 'display:flex'], declarations))
                .to.deep.equal(['display:grid', 'margin:0auto', 'color:#fff']);
        });

        it('finds a property name, or a longhand property that starts with it', () => {
            const declarations = declarationsFrom('table { border-collapse: collapse; text-align: center; margin-left: 0 }');
            expect(findRequiredProperties(['border', 'text', 'margin', 'margin-left', 'padding'], declarations))
                .to.deep.equal(['border', 'text', 'margin', 'margin-left']);
        });

        it('does not find a property name in the middle of another name, in a value, or in a comment', () => {
            const declarations = declarationsFrom('p { background-color: red; transition: color 1s } /* q { color: red } */');
            expect(findRequiredProperties(['color', 'color:red'], declarations)).to.deep.equal([]);
        });
    });
});
