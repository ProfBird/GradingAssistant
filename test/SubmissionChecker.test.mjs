import { getEmbeddedCssSelectorsAndProperties,
    getInlineStyles } from '../SubmissionChecker.mjs';
import { expect } from 'chai';
import jsdom from 'jsdom';

describe('SubmissionChecker', () => {
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