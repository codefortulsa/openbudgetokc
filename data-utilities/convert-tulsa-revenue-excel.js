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
var colIndex = require('./convert-tulsa-common').colIndex;
var getFundDescriptions = require('./convert-tulsa-common').getFundDescriptions;
var getFundNumbers = require('./convert-tulsa-common').getFundNumbers;

//Descriptions of each of the revenue sources
var FIRST_DESC_ROW = 3;
var FINAL_DESC_ROW = 35;

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

//Fund codes where the revenue was credited

var FINAL_FUND_COL = 43;
var TOTAL_FUND_COL = 'AR';
var FIRST_FUND_COL = 1;

/**
 * Find the revenue descriptions for each row in the revenue table
 * @param TulsaRevenueBudgetWksht The revenue worksheet table with dollar amounts for each revenue source
 * @returns {Array} a map of row number to revenue descriptions
 */
function getRevenueDetailNodes(TulsaRevenueBudgetWksht) {
    var revenueDetailNodes = [];

    for (var i = FIRST_DESC_ROW; i < FINAL_DESC_ROW; i++) {
        var cell = 'A' + i;

        console.log('Revenue description for index ', cell, TulsaRevenueBudgetWksht[cell].v);

        revenueDetailNodes[i] = TulsaRevenueBudgetWksht[cell].v;
    }

    return revenueDetailNodes;
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

    for (var row = FIRST_ROW_CATG; row <= FINAL_ROW_CATG; row++) {
        var amount = TulsaRevenueBudgetWksht[COL_FOR_ADP_BUDG + row];
        var maybeCatg = TulsaRevenueBudgetWksht[COL_FOR_REV_CATG + row];

        if (amount && !maybeCatg) {
            amountsToCatg[amount.v] = catg;
            console.log('Cell ' + COL_FOR_ADP_BUDG + row + ': Category ' + catg + ' has amount ' + amount.v);
        } else if (maybeCatg) {

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
    var i = 0;

    for (var row = FIRST_DESC_ROW; row < FINAL_DESC_ROW; row++) {
        var logRow = '';
        var delim = '';

        for (var col = FIRST_FUND_COL; col < FINAL_FUND_COL; col++) {
            var colLetter = colIndex(col);
            var amt = TulsaRevenueBudgetWksht[colLetter + row].v;
            var fundCode = fundNumbers[col];
            var category = categoryMap[amt];

            if (!category) {
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

            if (amt > 0) {
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
var fundNumbers = getFundNumbers(revenueWorksheet, FIRST_FUND_COL, FINAL_FUND_COL);

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