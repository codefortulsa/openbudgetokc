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

let xlsx = require('xlsx');
let jsonfile = require('jsonfile');
let {colIndex, getFundDescription, getFundCategory, getFundNumbers} = require('./convert-tulsa-common');
let {revenueConfig} = require('../_src/config/extractConfig');
let _ = require('lodash');
let fs = require('fs');

/**
 * Gets the revenue's 'Category' as listed on the first worksheet.  This is a bit more detailed than Appendix 9.
 * @param TulsaRevenueBudgetWksht The worksheet with summaries
 * @returns {function} a function that can be used to look up detail and category information by cross-reference code (column A in the 'ADOPTED Rev Table' worksheet)
 */
function loadRevenueCategories(TulsaRevenueBudgetWksht) {
    let categoryDescription = '***PLACEHOLDER***';
    let categories = [];

    for (let row = revenueConfig.categories.firstRow; row <= revenueConfig.categories.lastRow; row++) {
        let categoryDescriptionCell = TulsaRevenueBudgetWksht[revenueConfig.categories.categoryColumn + row];
        let detailCell = TulsaRevenueBudgetWksht[revenueConfig.categories.detailsColumn + row];
        let crossRefCell = TulsaRevenueBudgetWksht[revenueConfig.categories.catgCrossRefColumn + row];

        console.log('Loading row', row);

        if( !(_.isNil(categoryDescriptionCell) || _.isEmpty(categoryDescriptionCell.v)) ) {
            categoryDescription = categoryDescriptionCell.v;
            console.log('Now in the', categoryDescription, 'category');
        } else if( !(_.isNil(crossRefCell) || _.isEmpty(crossRefCell)) ){
            let detail = detailCell.v;
            let crossRef = crossRefCell.v;
            categories.push({categoryDescription, detail, crossRef});
            console.log('Cross-ref code', crossRef, 'is category', categoryDescription);
        } else {
            console.log('Row', row, 'was skipped because it is missing a cross-reference code');
        }
    }

    return (crossRef) => _.find(categories, {crossRef});
}

function getReadableCategory(crossRefCode, getRevenueCategory) {
    let category;

    if(crossRefCode === 'M Internal Service Charges') {
        category = revenueConfig.categories.internalServiceCategory
    } else if(crossRefCode === 'n TRANSFERS IN') {
        category = {...getRevenueCategory(crossRefCode)};
        category.detail = revenueConfig.categories.transfersInCategoryDesc;
    } else {
        category = getRevenueCategory(crossRefCode);
    }

    return category;
}

/**
 * Once we have all of the reference data we need, now we can walk through the revenue worksheet and get how
 * much money went from each revenue source to each funding source.  0's are excluded.
 *
 * @param TulsaRevenueBudgetWksht The revenue worksheet table with dollar amounts for each fund
 * @param getRevenueCategory A function that can be used to locate the category object containing the category description, detail, cross reference, and subcategory
 * @returns {Array} The JSON objects for all funding and revenue sources for the City of Tulsa
 */
function getRevenueAmounts(TulsaRevenueBudgetWksht, getRevenueCategory) {
    let revAmt = [];

    for (let col = revenueConfig.funds.firstColumn; col < revenueConfig.funds.lastColumn; col++) {
        for (let row = revenueConfig.descriptionRows.first; row <= revenueConfig.descriptionRows.last; row++) {
            let colLetter = colIndex(col);

            let crossRefCode = TulsaRevenueBudgetWksht[revenueConfig.funds.catgCrossRefColumn + row].v;
            let amt = TulsaRevenueBudgetWksht[colLetter + row].v;
            let fundCode = _.toInteger(TulsaRevenueBudgetWksht[colLetter + revenueConfig.funds.fundCodeRow].v);

            //If Internal Service charge, use "made up" category from config
            let category = getReadableCategory(crossRefCode, getRevenueCategory);

            if (amt > 0) {
                console.log('Revenue amount for cell', colLetter + row, 'was', amt, 'with cross-ref', crossRefCode, 'with category', JSON.stringify(category));
                revAmt.push({
                    BusUnit: 'TUL',
                    FundCode: fundCode,
                    FundDescription: getFundDescription(fundCode),
                    RevCategory: category.categoryDescription,
                    RevDetailNode: category.detail,
                    amount: amt
                });
            } else {
                console.log('Revenue amount for cell', colLetter + row, 'was 0 or less and not recorded.');
            }
        }
    }

    return revAmt;
}


console.log('Opening Tulsa Budget data...');

let workbook = xlsx.readFile(revenueConfig.localFileLocation);

console.log('Opened file. Finding revenue tab...');
let revenueWorksheet = workbook.Sheets[revenueConfig.amountTableSheetName];
let categoryDescWorksheet = workbook.Sheets[revenueConfig.categories.sheetName];

console.log('Loading fund categories...');
let getRevenueCategory = loadRevenueCategories(categoryDescWorksheet);

console.log('Getting fund numbers...');
let fundNumbers = getFundNumbers(revenueWorksheet, revenueConfig.funds.firstColumn, revenueConfig.funds.lastColumn);

console.log('Getting amounts for each fund revenue source...');
let revenueFigures = getRevenueAmounts(revenueWorksheet, getRevenueCategory);

console.log('Writing output file...');
jsonfile.writeFile(revenueConfig.outputJsonLocation, revenueFigures, function (err) {
    console.error(err);
});

let auditText = fs.readFileSync('../_src/data/tulsa/audit/revenue.txt');

let lines = _.split(auditText, '\n');

_.map(lines, (line) => {
    let recs = _.split(line, '\t');
    let auditValue = _.toInteger(recs[1]);

    let data = _.find(revenueFigures, {amount: auditValue});

    if(data) {
        console.log(recs[0], ', which was previously', recs[2], ', has checked out');
    } else {
        console.error(recs[0], ', which was previously', recs[2], ', cannot be found with amount', recs[1]);
    }
});