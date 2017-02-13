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
var ADMINISTRATION = 'Administration';
var COMMUNITY_DEVELOPMENT_AND_TRANSPORTATION = 'Community Development and Transportation';
var OFFICE_OF_THE_MAYOR = 'Office of the Mayor';
var CITY_COUNCIL = 'City Council';
var CITY_AUDITOR = 'City Auditor';

AGENCIES['City Council'] = CITY_COUNCIL;
AGENCIES['City Auditor'] = CITY_AUDITOR;

AGENCIES['Finance'] = ADMINISTRATION;
AGENCIES['Human Resources'] = ADMINISTRATION;
AGENCIES['Communications'] = ADMINISTRATION;
AGENCIES['Municipal Court'] = ADMINISTRATION;
AGENCIES['Information Technology'] = ADMINISTRATION;
AGENCIES['Asset Management'] = ADMINISTRATION;
AGENCIES['Debt Service'] = ADMINISTRATION; //TODO Ask about this one
AGENCIES['Asset Management'] = ADMINISTRATION;
AGENCIES['Transfers - Internal & Outside'] = ADMINISTRATION; //TODO Ask about this one
AGENCIES['Customer Care'] = ADMINISTRATION;
AGENCIES['Water & Sewer'] = ADMINISTRATION;
AGENCIES['General Government'] = ADMINISTRATION; //TODO Ask about this one
AGENCIES['Employees Insurance Administration'] = ADMINISTRATION; //TODO Ask about this one
AGENCIES['Workers\' Compensation'] = ADMINISTRATION; //TODO Ask about this one


AGENCIES['Parks and Recreation'] = COMMUNITY_DEVELOPMENT_AND_TRANSPORTATION;
AGENCIES['Performing Arts Center'] = COMMUNITY_DEVELOPMENT_AND_TRANSPORTATION;
AGENCIES['BOK and Convention Centers'] = COMMUNITY_DEVELOPMENT_AND_TRANSPORTATION;
AGENCIES['Planning and Development'] = COMMUNITY_DEVELOPMENT_AND_TRANSPORTATION;
AGENCIES['Streets and Stormwater'] = COMMUNITY_DEVELOPMENT_AND_TRANSPORTATION;
AGENCIES['Working in Neighborhoods'] = COMMUNITY_DEVELOPMENT_AND_TRANSPORTATION;
AGENCIES['Gilcrease'] = COMMUNITY_DEVELOPMENT_AND_TRANSPORTATION;
AGENCIES['River Parks'] = COMMUNITY_DEVELOPMENT_AND_TRANSPORTATION;
AGENCIES['Engineering Services'] = COMMUNITY_DEVELOPMENT_AND_TRANSPORTATION;
AGENCIES['River Parks Authority'] = COMMUNITY_DEVELOPMENT_AND_TRANSPORTATION;
AGENCIES['Gilcrease Museum'] = COMMUNITY_DEVELOPMENT_AND_TRANSPORTATION;
AGENCIES['Tulsa Transit'] = COMMUNITY_DEVELOPMENT_AND_TRANSPORTATION;
AGENCIES['Water and Sewer'] = COMMUNITY_DEVELOPMENT_AND_TRANSPORTATION;
AGENCIES['Social and Economic Development'] = COMMUNITY_DEVELOPMENT_AND_TRANSPORTATION;
AGENCIES['INCOG'] = COMMUNITY_DEVELOPMENT_AND_TRANSPORTATION;
AGENCIES['Planning & Development'] = COMMUNITY_DEVELOPMENT_AND_TRANSPORTATION;


AGENCIES['Mayor\'s Office of Human Rights'] = OFFICE_OF_THE_MAYOR;
AGENCIES['Legal'] = OFFICE_OF_THE_MAYOR;
AGENCIES['Mayor'] = OFFICE_OF_THE_MAYOR;
AGENCIES['Tulsa Area Emergency Mgmt.'] = OFFICE_OF_THE_MAYOR; //TODO Ask about this one
AGENCIES['Emergency Medical Services Authority'] = OFFICE_OF_THE_MAYOR; //TODO Ask about this one
AGENCIES['Fire'] = OFFICE_OF_THE_MAYOR;
AGENCIES['Police'] = OFFICE_OF_THE_MAYOR;
AGENCIES['Mayor\'s Office of Economic Development'] = OFFICE_OF_THE_MAYOR;

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

            //Correct typos
            if(departmentName === 'Park and Recreation') {
                departmentName = 'Parks and Recreation';
            } else if(departmentName === 'Mayor\'s Office of Economic') {
                departmentName = 'Mayor\'s Office of Economic Development';
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
                        fund: fundNumber,
                        lob: programName,
                        program: departmentName,
                        key: characterClass + " (" + fundDescription + ")",
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