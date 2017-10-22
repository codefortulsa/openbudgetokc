let xlsx = require('xlsx');
let _ = require('lodash');
let {commonConfig} = require('../_src/config/extractConfig');

/**
 * Get the fund's 'category,' listed in Appendix 9 of the city's Budget Book.
 * @param fundCode The fund number
 * @returns {*} That funds category
 */
function getFundCategory(fundCode) {
    let code = _.toInteger(fundCode);
    let category = _.find(commonConfig.categories, (catg) => catg.code + 1000 > code);

    console.log('category for fund', code, 'was', JSON.stringify(category));

    if(category) {
        return category.description;
    } else {
        throw "No Category Found for Fund " + code;
    }
}

/**
 * Find the ASCII letter in the alphabet for the given index, including 'double wide' column labels, like AA
 * @param index the number of letters after the letter 'A'; if this number is above 26, an 'A' is prefixed
 * @returns {string} the correct column in Excel for the given ASCII letter
 */
function colIndex(index) {
    let NUM_LETTERS_IN_ALPHABET = 26;
    if (index >= NUM_LETTERS_IN_ALPHABET) {
        return 'A' + colIndex(index - NUM_LETTERS_IN_ALPHABET);
    } else {
        return String.fromCharCode('A'.charCodeAt() + index);
    }
}


function getFundDescription(fundCode) {
    let code = _.toInteger(fundCode);
    let fund = _.find(commonConfig.fundDescriptions.codes, {code});

    if(fund) {
        return fund.description;
    } else {
        throw "No Fund Description Found for Code " + code;
    }
}

/**
 * Get the fund numbers for each column in the revenue table
 * @param TulsaBudgetWksht The revenue worksheet table with dollar amounts for each fund
 * @param firstCol The first column of the table where account numbers are found
 * @param finalCol The last column of the table where account numbers are found
 * @returns {Array} a map of columns to fund numbers
 */
function getFundNumbers(TulsaBudgetWksht, firstCol, finalCol) {
    let funds = [];

    for (let i = firstCol; i < finalCol; i++) {
        let cell = colIndex(i) + '2';
        console.log('Account number for index ', cell, TulsaBudgetWksht[cell].v);

        funds[i] = TulsaBudgetWksht[cell].v;
    }

    return funds;
}

module.exports = {
    colIndex: colIndex,
    getFundDescription: getFundDescription,
    getFundCategory: getFundCategory,
    characterClasses: {...commonConfig.characterClasses},
    getFundNumbers: getFundNumbers
};