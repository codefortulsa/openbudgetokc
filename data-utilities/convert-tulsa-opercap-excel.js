var xlsx = require('xlsx');
var jsonfile = require('jsonfile');
var colIndex = require('./convert-tulsa-common').colIndex;
var getFundNumbers = require('./convert-tulsa-common').getFundNumbers;
var getFundDescriptions = require('./convert-tulsa-common').getFundDescriptions;
var getOperUnitDesc = require('./convert-tulsa-common').getFundCategory;
var characterClasses = require('./convert-tulsa-common').characterClasses;

//Spreadsheet data
var INPUT_SPREADSHEET_LOCATION = '../_src/data/tulsa/originals/FY17 Oper + Capital.xlsx';
var OUTPUT_JSON_LOCATION = '../_src/data/tulsa/c4tul_fy2017.json';
var AMOUNT_TBL_SHEET_NM = 'Adopted Oper + Capital Table';
var CATG_SHEET_NM = 'OPBUDProgDP (2)';

//Fund code->Fund
//Fund Description->Sheet 1
//Operating unit->(useless code)
//Operating Unit Description->Based on fund code, get as you go
//Agency->(pre) Dept
//Agency Name->(post) Dept
//Program ID-> (useless code)
//Program Name-> Sheet 2 headings
//LOB ID-> (useless code)
//LOB Name->Based on appendix 9, get as you go
//Account-> (code? - maybe [pre] Col A)
//Character Class->Group code
//Character Class Description->Cross-ref OKC
//Account Description->Col A of Table (cross-ref sheet 2)
//Operating or Non->Based on fund code (6000 vs everything else), get as you go
//FY2107 budget->Table


//Columns for revenue categories and amounts; we have to map amounts back to categories to get the right description
var COL_FOR_PGM = 'A';
var COL_FOR_PRETTY_DESC = 'B';
var COL_FOR_PGM_DESC = 'AK';

//Rows for programs
var FIRST_ROW_PGM = 12;
var FINAL_ROW_PGM = 57;

var FINAL_FUND_COL = 40;
var FIRST_FUND_COL = 2;

var ACCOUNT_DESCRIPTION_COL = 'A';
var ACCOUNT_GROUP_CODE_COL = 'B';
var FIRST_ROW_FOR_EXP = 3;
var FINAL_ROW_FOR_EXP = 148;

//From Appendix 9
var AGENCIES = [];
AGENCIES['Finance'] = 'Administration';
AGENCIES['Human Resources'] = 'Administration';
AGENCIES['Communications'] = 'Administration';
AGENCIES['Municipal Court'] = 'Administration';
AGENCIES['Information Technology'] = 'Administration';
AGENCIES['Asset Management'] = 'Administration';
AGENCIES['Customer Care'] = 'Administration';
AGENCIES['Water & Sewer'] = 'Administration';

AGENCIES['Parks and Recreation'] = 'Community Development and Transportation';
AGENCIES['Performing Arts Center'] = 'Community Development and Transportation';
AGENCIES['BOK and Convention Centers'] = 'Community Development and Transportation';
AGENCIES['Planning and Development'] = 'Community Development and Transportation';
AGENCIES['Streets and Stormwater'] = 'Community Development and Transportation';
AGENCIES['Working in Neighborhoods'] = 'Community Development and Transportation';
AGENCIES['Gilcrease'] = 'Community Development and Transportation';
AGENCIES['River Parks'] = 'Community Development and Transportation';
AGENCIES['Engineering Services'] = 'Community Development and Transportation';

//TODO: Ask Nathan about these!
AGENCIES['Debt Service'] = 'Administration';
AGENCIES['Asset Management'] = 'Administration';
AGENCIES['Transfers - Internal & Outside'] = 'Administration';
AGENCIES['Legal'] = 'Administration';
AGENCIES['Mayor\'s Office of Human Rights'] = 'Office of the Mayor';
AGENCIES['City Council'] = 'City Council';
AGENCIES['City Auditor'] = 'Office of the Mayor';
AGENCIES['Mayor'] = 'Office of the Mayor';
AGENCIES['Tulsa Transit'] = 'Community Development and Transportation';
AGENCIES['Water and Sewer'] = 'Community Development and Transportation';
AGENCIES['Social and Economic Development'] = 'Community Development and Transportation';
AGENCIES['Mayor\'s Office of Economic'] = 'Office of the Mayor';
AGENCIES['River Parks Authority'] = 'Community Development and Transportation';
AGENCIES['Gilcrease Museum'] = 'Community Development and Transportation';
AGENCIES['Park and Recreation'] = 'Community Development and Transportation';
AGENCIES['Tulsa Area Emergency Mgmt.'] = 'Office of the Mayor';
AGENCIES['Emergency Medical Services Authority'] = 'Office of the Mayor';
AGENCIES['Fire'] = 'Office of the Mayor';
AGENCIES['Police'] = 'Office of the Mayor';
AGENCIES['General Government'] = 'Administration';
AGENCIES['Employees Insurance Administration'] = 'Administration';
AGENCIES['Worker\'s Compensation'] = 'Administration';
AGENCIES['Planning & Development'] = 'Community Development and Transportation';
AGENCIES['Mayor\'s Office of Economic Development'] = 'Community Development and Transportation';

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
            descriptionsToPgm[codedDescription.v] = {program: program, accountDescription: prettyDesc.v, accountCode: descriptionCode};
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

function getOperatingUnitType(accountCode) {
    return accountCode > 6000 && accountCode < 7000 ? 'Capital' : 'Operating';
}


function getExpenseAmounts(ExpenseWksht, programs, fundNumbers, fundDescriptions) {
    var departmentName = '****PLACEHOLDER****';
    var programName = '****PLACEHOLDER****';
    var expenses = [];
    var i = 0;

    for(var row=FIRST_ROW_FOR_EXP; row<FINAL_ROW_FOR_EXP; row++) {
        var groupNumber = ExpenseWksht[ACCOUNT_GROUP_CODE_COL + row];
        console.log('Row %d', row);

        if(groupNumber) {
            var departmentNameMaybe = ExpenseWksht[ACCOUNT_DESCRIPTION_COL + row];

            if (departmentNameMaybe) {
                departmentName = programs[departmentNameMaybe.v].accountDescription.trim();
                programName = programs[departmentNameMaybe.v].program;
                console.log('\tSwitched to department %s with program %s', departmentName, programName)
            }

            var agency = AGENCIES[departmentName];
            var characterClass = characterClasses[groupNumber.v];

            console.log('\tLine of business is %s', agency);

            for (var col = FIRST_FUND_COL; col < FINAL_FUND_COL; col++) {
                var fundNumber = fundNumbers[col];
                var fundDescription = fundDescriptions[fundNumber];
                var opUnitDescription = getOperUnitDesc(fundNumber);

                var opUnitType = getOperatingUnitType(fundNumber);
                var amount = ExpenseWksht[colIndex(col) + row];

                console.log('For fund number %d, %s, class %d (%s)...', fundNumber, fundDescription, groupNumber.v, characterClass);

                if(amount && amount.v != 0) {
                    expenses[i++] = {
                        agency: agency,
                        fund: fundDescription,
                        lob: programName,
                        program: departmentName,
                        key: opUnitDescription,
                        value: amount.v
                    };

                    console.log('Department %s with fund number %d, operating unit %s, spends %s', departmentName, fundNumber, opUnitDescription, amount.v);
                } else {
                    console.log('Col %s is blank.', colIndex(col));
                }
            }
        } else {
            console.log('Row %d is either a subtotal row or blank', row);
        }
    }

    return expenses;
}

console.log('Opening Tulsa Budget data...');

var workbook = xlsx.readFile(INPUT_SPREADSHEET_LOCATION);

console.log('Opened file. Finding operating and capital tab...');
var dollarWksht = workbook.Sheets[AMOUNT_TBL_SHEET_NM];
var categoryDescWorksheet = workbook.Sheets[CATG_SHEET_NM];


console.log('Getting fund numbers...');
var fundNumbers = getFundNumbers(dollarWksht, FIRST_FUND_COL, FINAL_FUND_COL);

console.log('Getting fund descriptions...');
var fundDescriptions = getFundDescriptions(workbook);

console.log('Getting operating units...');

console.log('Finding fund programs...');
var programs = getPrograms(categoryDescWorksheet);


console.log('Getting amounts for each fund and category source...');
var expenseAmounts = getExpenseAmounts(dollarWksht, programs, fundNumbers, fundDescriptions);

console.log('Writing output file...');
jsonfile.writeFile(OUTPUT_JSON_LOCATION, expenseAmounts, function (err) {
    console.error(err);
});