var xlsx = require('xlsx');

//Cross-reference workbook for fund descriptions, since almost all are listed in the Operating Budget workbook
var FUND_DESC_LOCATION = '../_src/data/tulsa/originals/FY17 Oper + Capital.xlsx';
var FUND_DESC_SHEET = 'OPBUDFD (2)';
var FUND_CODE_COLUMN = 'A';
var FUND_DESC_COLUMN = 'B';
var FIRST_FUND_CODE = 14;
var FINAL_FUND_CODE = 49;

//Categories from Section 9 of the Budget Book
var CATEGORY_CODES = [
    {categoryCode: 1080, desc: 'General Fund'},
    {categoryCode: 2000, desc: 'Special Revenue'},
    {categoryCode: 3000, desc: 'Trust & Agency Enterprise'},
    {categoryCode: 4100, desc: 'Special Assessment'},
    {categoryCode: 4306, desc: 'Debt Service'},
    {categoryCode: 5000, desc: 'Special Revenue (Grants)'},
    {categoryCode: 6000, desc: 'Capital Projects'},
    {categoryCode: 7000, desc: 'Enterprise'},
    {categoryCode: 8000, desc: 'Internal Service'}
];

//Fund group codes.  These were not provided in the spreadsheet.
//According to Nathan, the codes are all the same under State Law, though, so they were copied from OKC's data.
var characterClasses = [];
characterClasses[51] = 'Personnel Services';
characterClasses[52] = 'Professional Services';
characterClasses[53] = 'Materials and Supplies';
characterClasses[54] = 'Capital Purchase';
characterClasses[55] = 'Debt Service';
characterClasses[59] = 'Transfers';

/**
 * Get the fund's 'category,' listed in Appendix 9 of the city's Budget Book.  This is not useful (yet).
 * @param fundNumber The fund number
 * @returns {*} That funds category
 */
function getFundCategory(fundNumber) {
    var catg;

    for (var i = 0; i < CATEGORY_CODES.length; i++) {
        if (CATEGORY_CODES[i].categoryCode > fundNumber) {
            break;
        } else {
            catg = CATEGORY_CODES[i].desc;
        }
    }

    return catg;
}

/**
 * Find the ASCII letter in the alphabet for the given index, including 'double wide' column labels, like AA
 * @param index the number of letters after the letter 'A'; if this number is above 26, an 'A' is prefixed
 * @returns {string} the correct column in Excel for the given ASCII letter
 */
function colIndex(index) {
    var NUM_LETTERS_IN_ALPHABET = 26;
    if (index >= NUM_LETTERS_IN_ALPHABET) {
        return 'A' + colIndex(index - NUM_LETTERS_IN_ALPHABET);
    } else {
        return String.fromCharCode('A'.charCodeAt() + index);
    }
}

/**
 * Cross-reference against the operating budget worksheet to get the fund descriptions for every available funding
 * source.
 *
 * @returns {Array} A map of funds to descriptions
 */
function getFundDescriptions(fundDescWkbk) {
    var fundDescriptions = [];

    //These could not be cross-referenced directly with the spreadsheets
    // (probably because they're capital projects, which are not part of the operating budget... i.e, it's 'capital',
    // not 'expense')
    //See https://www.cityoftulsa.org/media/570090/Section%203%20Funds.pdf and find the codes.
    fundDescriptions[6011] = '2008 Sales Tax Special Temporary Streets Fund';
    fundDescriptions[6012] = '1985 Sales Tax Economic Development Fund';
    fundDescriptions[6014] = '2014 Sales Tax Fund';
    fundDescriptions[6021] = 'TMUA-Water Capital Projects Fund';
    fundDescriptions[6031] = 'TMUA-Sewer Captial Projects Fund';
    fundDescriptions[6041] = 'Stormwater Capital Projects Fund';

    if (!fundDescWkbk) {
        fundDescWkbk = xlsx.readFile(FUND_DESC_LOCATION);
    }
    var fundDescWksht = fundDescWkbk.Sheets[FUND_DESC_SHEET];

    for (var row = FIRST_FUND_CODE; row <= FINAL_FUND_CODE; row++) {
        var fundCode = fundDescWksht[FUND_CODE_COLUMN + row];
        var fundDesc = fundDescWksht[FUND_DESC_COLUMN + row];

        if (fundCode && fundDesc) {
            console.log('Row ' + row + ', fund code ' + fundCode.v + ', is ' + fundDesc.v);
            fundDescriptions[fundCode.v] = fundDesc.v;
        } else {
            console.log('Row ' + row + ' is blank.');
        }
    }

    return fundDescriptions;
}

//Fund codes where the revenue was credited
var FUND_INFO = {
    FINAL_FUND_COL: 43,
    TOTAL_FUND_COL: 'AR',
    FIRST_FUND_COL: 1
};

/**
 * Get the fund numbers for each column in the revenue table
 * @param TulsaRevenueBudgetWksht The revenue worksheet table with dollar amounts for each fund
 * @returns {Array} a map of columns to fund numbers
 */
function getFundNumbers(TulsaRevenueBudgetWksht) {
    var funds = [];

    for (var i = FUND_INFO.FIRST_FUND_COL; i < FUND_INFO.FINAL_FUND_COL; i++) {
        var cell = colIndex(i) + '2';
        console.log('Account number for index ', cell, TulsaRevenueBudgetWksht[cell].v);

        funds[i] = TulsaRevenueBudgetWksht[cell].v;
    }

    return funds;
}

module.exports = {
    colIndex: colIndex,
    getFundDescriptions: getFundDescriptions,
    getFundCategory: getFundCategory,
    characterClasses: characterClasses,
    getFundNumbers: getFundNumbers,
    FUND_INFO: FUND_INFO
};