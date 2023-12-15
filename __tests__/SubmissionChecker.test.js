import { getEmbeddedCssSelectorsAndProperties } from '../SubmissionChecker.mjs';describe('getEmbeddedCssSelectorsAndProperties', () => {
    it('should return correct selectors and properties', () => {
        const styleElement = {
            textContent: '.test { color: red; } #id { background-color: blue; }'
        };
        const requiredSelectors = ['.test', '#id'];
        // Note the required property value, red is included.
        const requiredProperties = ['color: red', 'background-color'];

        const result = getEmbeddedCssSelectorsAndProperties(styleElement, requiredSelectors, requiredProperties);

        expect(result).toEqual({
            allSelectors: ['.test', '#id'],
            foundSelectors: ['.test', '#id'],
            allProperties: ['color', 'background-color'],
            foundProperties: ['color', 'background-color']
        });
    });
});