import * as cssTree from "css-tree";

/* Reads the CSS in a student's files with the css-tree parser, and finds the required
   selectors and properties in it. External css files, embedded <style> elements and
   inline style attributes all go through here, so they are matched the same way.
   Comments are ignored, because the parser drops them. */

/** @typedef {"external"|"embedded"|"inline"} CssSource - Where some CSS came from */

/** @typedef {Object} CssRule - One rule, like nav a, footer { ... }
 * @property {Array<string>} selectors - Each selector in the rule's selector list, like ["nav a", "footer"]
 * @property {Array<Array<Compound|string>>} parsedSelectors - The selectors split into compounds
 *   and combinators, for findRequiredSelectors
 * @property {CssSource} source
 */

/** @typedef {Array<string>} Compound - The simple selectors that apply to one element, like ["nav", ".main"] */

/** @typedef {Object} CssDeclaration - One property declaration, like color: red
 * @property {string} property - The property name, in lower case
 * @property {string} value - The value, as css-tree writes it (without !important)
 * @property {CssSource} source
 */

/** @typedef {{rules: Array<CssRule>, declarations: Array<CssDeclaration>}} ParsedCss */

/** parseStylesheet function
 * Get the rules and declarations in a css file or a style element.
 * Rules inside @media and other at-rules are included.
 * @param {string} cssText
 * @param {CssSource} source - "external" or "embedded"
 * @returns {ParsedCss}
 */
export function parseStylesheet(cssText, source) {
    const rules = [];
    const declarations = [];
    // css-tree does not throw on bad CSS; it keeps the parts it can't read as raw text
    cssTree.walk(cssTree.parse(cssText), (node) => {
        if (node.type === "Rule") {
            const selectorNodes = [];
            cssTree.walk(node.prelude, { visit: "Selector", enter: (selector) => { selectorNodes.push(selector); } });
            rules.push({
                selectors: selectorNodes.map((selector) => cssTree.generate(selector)),
                parsedSelectors: selectorNodes.map(splitSelector),
                source,
            });
        } else if (node.type === "Declaration") {
            declarations.push(makeDeclaration(node, source));
        }
    });
    return { rules, declarations };
}

/** parseInlineStyle function
 * Get the declarations in an element's style attribute.
 * @param {string} styleText - The value of the style attribute, like "color: red; margin: 0"
 * @returns {ParsedCss} There are no rules in an inline style.
 */
export function parseInlineStyle(styleText) {
    const declarations = [];
    cssTree.walk(cssTree.parse(styleText, { context: "declarationList" }), (node) => {
        if (node.type === "Declaration") {
            declarations.push(makeDeclaration(node, "inline"));
        }
    });
    return { rules: [], declarations };
}

/** findRequiredSelectors function
 * The required selectors that appear in the rules.
 * A required selector is found when it is a whole part of a selector in a rule:
 * every simple selector in it applies to the same element, and the combinators between
 * elements are the same. So nav is found in "nav a", "header nav", "nav.main" and
 * "header, nav", but not in ".navbar". A requirement that is a list (header, footer)
 * is found when each of its selectors is found.
 * @param {Array<string>} requiredSelectors - From the requirements file
 * @param {Array<CssRule>} rules - All the rules in a student's files
 * @returns {Array<string>} The required selectors that were found, as written in requiredSelectors
 */
export function findRequiredSelectors(requiredSelectors, rules) {
    const candidates = rules.flatMap((rule) => rule.parsedSelectors);
    return requiredSelectors.filter((required) => {
        const requiredParts = parseSelectorList(required);
        if (requiredParts === null) {
            // Not a selector css-tree can read: look for a rule with exactly this selector
            const compact = required.replace(/\s/g, "");
            return rules.some((rule) => rule.selectors.some((selector) => selector.replace(/\s/g, "") === compact));
        }
        return requiredParts.every((parts) => candidates.some((candidate) => containsSelector(candidate, parts)));
    });
}

/** findRequiredProperties function
 * The required properties that are declared.
 * A requirement with a value (display: grid) needs a declaration with that property and value.
 * A requirement with only a name (border) is found when that property, or a longhand
 * property that starts with it (border-top, border-collapse), is declared.
 * Upper/lower case and white space are ignored, and so is !important.
 * @param {Array<string>} requiredProperties - From the requirements file (with the white space removed)
 * @param {Array<CssDeclaration>} declarations - All the declarations in a student's files
 * @returns {Array<string>} The required properties that were found, as written in requiredProperties
 */
export function findRequiredProperties(requiredProperties, declarations) {
    return requiredProperties.filter((required) => {
        const normalized = compactLowerCase(required);
        const colon = normalized.indexOf(":");
        if (colon !== -1) {
            const name = normalized.slice(0, colon);
            const value = normalized.slice(colon + 1);
            return declarations.some((d) => d.property === name && compactLowerCase(d.value) === value);
        }
        return declarations.some((d) => d.property === normalized || d.property.startsWith(normalized + "-"));
    });
}

/** makeDeclaration function
 * @param {Object} node - A css-tree Declaration node
 * @param {CssSource} source
 * @returns {CssDeclaration}
 */
function makeDeclaration(node, source) {
    return { property: node.property.toLowerCase(), value: cssTree.generate(node.value).trim(), source };
}

/** compactLowerCase function
 * @param {string} text
 * @returns {string} The text in lower case without any white space
 */
function compactLowerCase(text) {
    return text.replace(/\s/g, "").toLowerCase();
}

/** splitSelector function
 * Split a selector into compounds and the combinators between them.
 * "header nav.main > a" becomes [["header"], " ", ["nav", ".main"], ">", ["a"]].
 * Element names are in lower case because HTML element names are not case sensitive.
 * @param {Object} selectorNode - A css-tree Selector node
 * @returns {Array<Compound|string>} Compounds at even indexes, combinators at odd indexes
 */
function splitSelector(selectorNode) {
    const parts = [[]];
    for (const child of selectorNode.children) {
        if (child.type === "Combinator") {
            parts.push(child.name, []);
        } else {
            const simple = cssTree.generate(child);
            parts[parts.length - 1].push(child.type === "TypeSelector" ? simple.toLowerCase() : simple);
        }
    }
    return parts;
}

/** parseSelectorList function
 * @param {string} selectorList - A required selector, or a list of them separated by commas
 * @returns {Array<Array<Compound|string>>|null} Each selector split by splitSelector, or null if it can't be read
 */
function parseSelectorList(selectorList) {
    try {
        const selectorNodes = [];
        cssTree.walk(cssTree.parse(selectorList, { context: "selectorList" }),
            { visit: "Selector", enter: (selector) => { selectorNodes.push(selector); } });
        return selectorNodes.length > 0 ? selectorNodes.map(splitSelector) : null;
    } catch {
        return null;
    }
}

/** containsSelector function
 * Is the required selector a whole part of the candidate selector?
 * Each required compound must be part of a compound of the candidate, in a row,
 * with the same combinators between them.
 * @param {Array<Compound|string>} candidate - A selector in a rule, from splitSelector
 * @param {Array<Compound|string>} required - A required selector, from splitSelector
 * @returns {boolean}
 */
function containsSelector(candidate, required) {
    for (let start = 0; start + required.length <= candidate.length; start += 2) {
        let matches = true;
        for (let i = 0; i < required.length && matches; i++) {
            matches = i % 2 === 1
                ? candidate[start + i] === required[i]  // a combinator
                : required[i].every((simple) => candidate[start + i].includes(simple));  // a compound
        }
        if (matches) {
            return true;
        }
    }
    return false;
}
