var xlsx = require('xlsx');
var jsonfile = require('jsonfile');
var colIndex = require('./convert-tulsa-common').colIndex;
var getFundNumbers = require('./convert-tulsa-common').getFundNumbers;
var getFundDescriptions = require('./convert-tulsa-common').getFundDescriptions;

//Spreadsheet data
var INPUT_SPREADSHEET_LOCATION = '../_src/data/tulsa/originals/FY17 Oper + Capital.xlsx';
var OUTPUT_JSON_LOCATION = '../_src/data/tulsa/c4tul_fy2017.json';
var AMOUNT_TBL_SHEET_NM = 'Adopted Oper + Capital Table';
var CATG_SHEET_NM = 'OPBUDProgDP (2)';

//Fund code->Fund
//Fund Description->Sheet 1
//Operating unit->(code)
//Operating Unit Description->Based on account code
//Agency->(pre) Dept
//Agency Name->(post) Dept
//Program ID-> (code)
//Program Name-> Sheet 2 headings
//LOB ID-> (code)
//LOB Name->Based on appendix 9
//Account-> (code? - maybe [pre] Col A)
//Character Class->Group code
//Character Class Description->Cross-ref OKC
//Account Description->Col A of Table (cross-ref sheet 2)
//Operating or Non->Based on category code
//FY2107 budget->Table


//Columns for revenue categories and amounts; we have to map amounts back to categories to get the right description
var COL_FOR_PGM = 'A';
var COL_FOR_PRETTY_DESC = 'B';
var COL_FOR_PGM_DESC = 'AK';

//Rows for programs
var FIRST_ROW_PGM = 12;
var FINAL_ROW_PGM = 57;

var FINAL_FUND_COL = 41;
var TOTAL_FUND_COL = 'AO';
var FIRST_FUND_COL = 2;

/**
 * Gets the revenue's 'Program' as listed on the second worksheet.
 * @param TulsaSummOpCapWksht The worksheet with summaries
 * @returns {Array} a map of descriptions to programs; associations are in column AK
 */
function getPrograms(TulsaSummOpCapWksht) {
    var program = '***PLACEHOLDER***';
    var descriptionsToPgm = [];

    for(var row=FIRST_ROW_PGM; row<=FINAL_ROW_PGM; row++) {
        var maybePgm = TulsaSummOpCapWksht[COL_FOR_PGM + row];
        var codedDescription = TulsaSummOpCapWksht[COL_FOR_PGM_DESC + row];
        var prettyDesc = TulsaSummOpCapWksht[COL_FOR_PRETTY_DESC + row];

        if(codedDescription) {
            var descriptionCode = codedDescription.v.substr(0,2);
            descriptionsToPgm[codedDescription.v] = {program: program, description: prettyDesc, code: descriptionCode};
            console.log('Cell ' + COL_FOR_PGM_DESC + row + ': Program ' + program + ' has desc ' + codedDescription.v);
        } else if(!codedDescription && maybePgm) {
            program = maybePgm.v;
            console.log('Cell ' + COL_FOR_PGM + row + ': ' + JSON.stringify(program));
        } else {
            console.log('Row ' + row + ' is blank.');
        }
    }

    return descriptionsToPgm;
}

console.log('Opening Tulsa Budget data...');

var workbook = xlsx.readFile(INPUT_SPREADSHEET_LOCATION);

console.log('Opened file. Finding operating and capital tab...');
var dollarWksht = workbook.Sheets[AMOUNT_TBL_SHEET_NM];
var categoryDescWorksheet = workbook.Sheets[CATG_SHEET_NM];

console.log('Finding fund programs...');
var programs = getPrograms(categoryDescWorksheet);

console.log('Getting fund numbers...');
var fundNumbers = getFundNumbers(dollarWksht, FIRST_FUND_COL, FINAL_FUND_COL);

console.log('Getting fund descriptions...');
var fundDescriptions = getFundDescriptions(workbook);
//
// console.log('Getting revenue source descriptions...');
// var revenueDescriptions = getRevenueDetailNodes(revenueWorksheet);
//
// console.log('Getting amounts for each fund revenue source...');
// var revenueFigures = getRevenueAmounts(revenueWorksheet, fundNumbers, fundDescriptions, revenueDescriptions, programs);
//
// console.log('Writing output file...');
// jsonfile.writeFile(OUTPUT_JSON_LOCATION, revenueFigures, function (err) {
//     console.error(err);
// });