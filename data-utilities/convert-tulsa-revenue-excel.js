/***
 * Converts the source spreadsheet for Tulsa's revenue data into JSON.
 * Data was provided by Nathan Pickard (Data Analyst) and Penny Macias (Project Manager) at the City of Tulsa.
 *
 * The budget worksheet has two sheets; the first is a summary of all of the subtotals for each revenue source
 * and category each year.  The second is what we really want; a table with all of the revenue sources that flow
 * to all of the different accounts ('funds') in the Tulsa accounting system.  For example, the penny sales tax
 * ratified in 2016 would be a 'revenue source' down the left side, and which fund that money landed in would be
 * listed along the top.  Most revenue sources only hit one or two funds, so it's normal to see zeros (for example,
 * you wouldn't expect sales taxes to land in the Intergovernmental Revenue fund).
 *
 * You'll hear 'funding source' from the folks at the City, when they say 'funding source,' they mean Fund, and
 * when they say 'revenue item' or 'revenue source,' they mean revenue source.
 *
 * This file licensed under Code4Tulsa charter.
 */

var xlsx = require('xlsx');
var jsonfile = require('jsonfile');

//Descriptions of each of the revenue sources
var FIRST_DESC_ROW = 3;
var FINAL_DESC_ROW = 35;

//Fund codes where the revenue was credited
var FINAL_FUND_COL = 43;
var TOTAL_FUND_COL = 'AR';
var FIRST_FUND_COL = 1;

//Columns for revenue categories and amounts; we have to map amounts back to categories to get the right description
var COL_FOR_REV_CATG = 'A';
var COL_FOR_ADP_BUDG = 'E';

//Rows for revenue categories
var FIRST_ROW_CATG = 10;
var FINAL_ROW_CATG = 66;

//Spreadsheet data
var INPUT_SPREADSHEET_LOCATION = '../_src/data/tulsa/originals/FY17 Revenues.xlsx';
var OUTPUT_JSON_LOCATION = '../_src/data/tulsa/c4tul_fy2017Revenue.json';
var AMOUNT_TBL_SHEET_NM = 'ADOPTED Rev Table';
var CATG_SHEET_NM = 'REVenue(2)';

//Cross-reference workbook for fund descriptions, since almost all are listed in the Operating Budget workbook
var FUND_DESC_LOCATION = '../_src/data/tulsa/originals/FY17 Oper + Capital.xlsx';
var FUND_DESC_SHEET = 'OPBUDFD (2)';
var FUND_CODE_COLUMN = 'A';
var FUND_DESC_COLUMN = 'B';
var FIRST_FUND_CODE = 14;
var FINAL_FUND_CODE = 49;

//Categories from Section 9 of the Budget Book
var CATEGORY_CODES = [
    {categoryCode: 1080, desc:'General Fund'},
    {categoryCode: 2000, desc: 'Special Revenue'},
    {categoryCode: 3000, desc: 'Trust & Agency Enterprise'},
    {categoryCode: 4100, desc: 'Special Assessment'},
    {categoryCode: 4306, desc: 'Debt Service'},
    {categoryCode: 5000, desc: 'Special Revenue (Grants)'},
    {categoryCode: 6000, desc: 'Capital Projects'},
    {categoryCode: 7000, desc: 'Enterprise'},
    {categoryCode: 8000, desc: 'Internal Service'}
];

/**
 * Find the ASCII letter in the alphabet for the given index, including 'double wide' column labels, like AA
 * @param index the number of letters after the letter 'A'; if this number is above 26, an 'A' is prefixed
 * @returns {string} the correct column in Excel for the given ASCII letter
 */
function colIndex(index) {
    var NUM_LETTERS_IN_ALPHABET = 26;
    if(index >= NUM_LETTERS_IN_ALPHABET) {
        return 'A' + colIndex(index - NUM_LETTERS_IN_ALPHABET);
    } else {
        return String.fromCharCode('A'.charCodeAt() + index);
    }
}

/**
 * Get the fund numbers for each column in the revenue table
 * @param TulsaRevenueBudgetWksht The revenue worksheet table with dollar amounts for each fund
 * @returns {Array} a map of columns to fund numbers
 */
function getFundNumbers(TulsaRevenueBudgetWksht) {
    var funds = [];

    for (var i = FIRST_FUND_COL; i < FINAL_FUND_COL; i++) {
        var cell = colIndex(i) + '2';
        console.log('Account number for index ', cell, TulsaRevenueBudgetWksht[cell].v);

        funds[i] = TulsaRevenueBudgetWksht[cell].v;
    }

    return funds;
}

/**
 * Find the revenue descriptions for each row in the revenue table
 * @param TulsaRevenueBudgetWksht The revenue worksheet table with dollar amounts for each revenue source
 * @returns {Array} a map of row number to revenue descriptions
 */
function getRevenueDetailNodes(TulsaRevenueBudgetWksht) {
    var revenueDetailNodes = [];

    for(var i=FIRST_DESC_ROW; i<FINAL_DESC_ROW; i++) {
        var cell = 'A' + i;

        console.log('Revenue description for index ', cell, TulsaRevenueBudgetWksht[cell].v);

        revenueDetailNodes[i] = TulsaRevenueBudgetWksht[cell].v;
    }

    return revenueDetailNodes;
}


/**
 * Get the fund's 'category,' listed in Appendix 9 of the city's Budget Book.  This is not useful (yet).
 * @param fundNumber The fund number
 * @returns {*} That funds category
 */
function getFundCategory(fundNumber) {
    var catg;

    for(var i=0; i<CATEGORY_CODES.length; i++) {
        if(CATEGORY_CODES[i].categoryCode > fundNumber) {
            break;
        } else {
            catg = CATEGORY_CODES[i].desc;
        }
    }

    return catg;
}

/**
 * Cross-reference against the operating budget worksheet to get the fund descriptions for every available funding
 * source.
 *
 * @returns {Array} A map of funds to descriptions
 */
function getFundDescriptions() {
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

    var fundDescWkbk = xlsx.readFile(FUND_DESC_LOCATION);
    var fundDescWksht = fundDescWkbk.Sheets[FUND_DESC_SHEET];

    for(var row=FIRST_FUND_CODE; row<=FINAL_FUND_CODE; row++) {
        var fundCode = fundDescWksht[FUND_CODE_COLUMN + row];
        var fundDesc = fundDescWksht[FUND_DESC_COLUMN + row];

        if(fundCode && fundDesc) {
            console.log('Row ' + row + ', fund code ' + fundCode.v + ', is ' + fundDesc.v);
            fundDescriptions[fundCode.v] = fundDesc.v;
        } else {
            console.log('Row ' + row + ' is blank.');
        }
    }

    return fundDescriptions;
}

/**
 * Gets the revenue's 'Category' as listed on the first worksheet.  This is a bit more detailed than Appendix 9.
 * @param TulsaRevenueBudgetWksht The worksheet with summaries
 * @returns {Array} a map of amounts to categories.  We have to use this because we have no other way of figuring out
 * what category a revenue source belongs to (since in the table, the descriptions and codes are different than they
 * are in the summary).  These numbers are long enough that they are unique.
 */
function getRevCategories(TulsaRevenueBudgetWksht) {
    var catg = '***PLACEHOLDER***';
    var amountsToCatg = [];

    for(var row=FIRST_ROW_CATG; row<=FINAL_ROW_CATG; row++) {
        var amount = TulsaRevenueBudgetWksht[COL_FOR_ADP_BUDG + row];
        var maybeCatg = TulsaRevenueBudgetWksht[COL_FOR_REV_CATG + row];

        if(amount && !maybeCatg) {
            amountsToCatg[amount.v] = catg;
            console.log('Cell ' + COL_FOR_ADP_BUDG + row + ': Category ' + catg + ' has amount ' + amount.v);
        } else if(maybeCatg) {

            catg = maybeCatg.v;
            console.log('Cell ' + COL_FOR_REV_CATG + row + ': ' + JSON.stringify(catg));
        } else {
            console.log('Row ' + row + ' is blank.');
        }
    }

    return amountsToCatg;
}

/**
 * Once we have all of the reference data we need, now we can walk through the revenue worksheet and get how
 * much money went from each revenue source to each funding source.  0's are excluded.
 *
 * @param TulsaRevenueBudgetWksht The revenue worksheet table with dollar amounts for each fund
 * @param fundNumbers Column to fund number associations
 * @param fundDescriptions Cross-referenced fund descriptions
 * @param revenueDescs Row to revenue source associations
 * @param categoryMap Row to revenue category associations
 * @returns {Array} The JSON objects for all funding and revenue sources for the City of Tulsa
 */
function getRevenueAmounts(TulsaRevenueBudgetWksht, fundNumbers, fundDescriptions, revenueDescs, categoryMap) {
    var revAmt = [];
    var i=0;

    for(var row=FIRST_DESC_ROW; row<FINAL_DESC_ROW; row++) {
        var logRow = '';
        var delim = '';

        for(var col=FIRST_FUND_COL; col<FINAL_FUND_COL; col++) {
            var colLetter = colIndex(col);
            var amt = TulsaRevenueBudgetWksht[colLetter + row].v;
            var fundCode = fundNumbers[col];
            var category = categoryMap[amt];

            if(!category) {
                var newCategoryAmt = TulsaRevenueBudgetWksht[TOTAL_FUND_COL + row].v;
                category = categoryMap[newCategoryAmt];
                console.log('Amount ' + amt + ' on row ' + row + ' has no exact match, subtotal was ' + newCategoryAmt + ' which is associated with ' + category);
            }

            var revenueObject = {
                BusUnit: 'TUL',
                FundCode: fundCode,
                FundDescription: fundDescriptions[fundCode],
                RevCategory: category,
                RevDetailNode: revenueDescs[row],
                amount: amt
            };

            if(amt > 0) {
                revAmt[i++] = revenueObject;
            }

            logRow += delim + TulsaRevenueBudgetWksht[colLetter + row].v;
            delim = ',';
        }

        console.log(revenueDescs[row] + ':' + logRow);
    }

    return revAmt;
}

console.log('Opening Tulsa Budget data...');

var workbook = xlsx.readFile(INPUT_SPREADSHEET_LOCATION);

console.log('Opened file. Finding revenue tab...');
var revenueWorksheet = workbook.Sheets[AMOUNT_TBL_SHEET_NM];
var categoryDescWorksheet = workbook.Sheets[CATG_SHEET_NM];

console.log('Finding fund categories...');
var categoryMap = getRevCategories(categoryDescWorksheet);

console.log('Getting fund numbers...');
var fundNumbers = getFundNumbers(revenueWorksheet);

console.log('Getting fund descriptions...');
var fundDescriptions = getFundDescriptions();

console.log('Getting revenue source descriptions...');
var revenueDescriptions = getRevenueDetailNodes(revenueWorksheet);

console.log('Getting amounts for each fund revenue source...');
var revenueFigures = getRevenueAmounts(revenueWorksheet, fundNumbers, fundDescriptions, revenueDescriptions, categoryMap);

console.log('Writing output file...');
jsonfile.writeFile(OUTPUT_JSON_LOCATION, revenueFigures, function (err) {
    console.error(err);
});