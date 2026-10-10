import { getEmbeddedCssSelectorsAndProperties,
    getInlineStyles,
    checkSpecialFileName } from '../SubmissionChecker.mjs';
import { expect } from 'chai';
import jsdom from 'jsdom';

describe('SubmissionChecker', () => {

    // Test the checkSpecialFileName() function
    describe('#checkSpecialFileName()', () => {
        it('accepts a name with the right case', () => {
            expect(checkSpecialFileName('index.html', 'index')).to.equal('ok');
            expect(checkSpecialFileName('Lab1/index.htm', 'index')).to.equal('ok');
        });
        it('reports a name with the wrong case', () => {
            expect(checkSpecialFileName('Index.html', 'index')).to.equal('wrong-case');
            expect(checkSpecialFileName('site/INDEX.HTML', 'index')).to.equal('wrong-case');
        });
        it('reports other names as not matching', () => {
            expect(checkSpecialFileName('about.html', 'index')).to.equal('no');
        });
        it('only looks at the file name, not the folders', () => {
            expect(checkSpecialFileName('index/about.html', 'index')).to.equal('no');
        });
    });

    // Test the getEmbeddedCssSelectorsAndProperties() function
    describe('#getEmbeddedCssSelectorsAndProperties()', () => {
        it('should return correct selectors and properties', () => {
            // Arrange
            const styleElement = {
                textContent: '.test { color: red; } #id { background-color: blue; }'
            };
            const requiredSelectors = ['.test', '#id'];
            // Note the required property value, red is included, 
            // and a property that won't be found, float: left
            const requiredProperties = ['color: red', 'background-color', 'float: left'];

            // Act
            const result = getEmbeddedCssSelectorsAndProperties(styleElement, requiredSelectors, requiredProperties);

            // Assert
            expect(result).to.deep.equal({
                allSelectors: ['.test', '#id'],
                foundSelectors: ['.test', '#id'],
                allProperties: ['color: red', 'background-color: blue'],
                foundProperties: ['color: red', 'background-color']
            });
        });
    });

    // Test the getInlineStyles() function
    const { JSDOM } = jsdom;
    describe('SubmissionChecker', () => {
        describe('#getInlineStyles()', () => {
            it('should return correct properties and values', () => {
                // Arrange
                const dom = new JSDOM(`
                <div style="color: red; background-color: white;"></div>
                <div style="color: blue;"></div>
            `);
            const requiredProperties = ['color: blue', 'background-color', 'float: left'];
                const elements = [...dom.window.document.querySelectorAll('div')];

                // Act
                const result = getInlineStyles(elements, requiredProperties);

                // Assert
                expect(result).to.deep.equal({
 
                        allProperties: ['color: red', 'background-color: white', 'color: blue'],
                        foundProperties: ['background-color', 'color: blue']
                });
            });
        });
    });



});