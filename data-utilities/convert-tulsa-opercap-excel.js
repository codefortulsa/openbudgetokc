let {getFundNumbers, getFundCategory, getFundDescription} = require('./convert-tulsa-common');
let xlsx = require('xlsx');
let jsonfile = require('jsonfile');
let _ = require('lodash');

let colIndex = require('./convert-tulsa-common').colIndex;
let characterClasses = require('./convert-tulsa-common').characterClasses;
let {opCapConfig} = require('../_src/config/extractConfig');



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

/**
 * Gets the revenue's 'Program' as listed on the second worksheet.
 * @param TulsaSummOpCapWksht The worksheet with summaries
 * @returns {Array} a map of descriptions to programs; associations are in column AK
 */
function getPrograms(TulsaSummOpCapWksht) {
    let program = '***PLACEHOLDER***';
    let descriptionsToPgm = [];

    for(let row=opCapConfig.program.firstRow; row<=opCapConfig.program.lastRow; row++) {
        let maybePgm = TulsaSummOpCapWksht[opCapConfig.program.column + row];
        let codedDescription = TulsaSummOpCapWksht[opCapConfig.program.programDescriptionColumn + row];
        let prettyDesc = TulsaSummOpCapWksht[opCapConfig.program.prettyDescriptionColumn + row];

        if(codedDescription) {
            let descriptionCode = codedDescription.v.substr(0,2);
            descriptionsToPgm[codedDescription.v] = {program: program, accountDescription: prettyDesc.v, accountCode: descriptionCode};
            console.log('Cell ' + opCapConfig.program.programDescriptionColumn + row + ': Program ' + program + ' has desc ' + codedDescription.v);
        } else if(!codedDescription && maybePgm) {
            program = maybePgm.v;
            console.log('Cell ', opCapConfig.program.column + row, ': ', JSON.stringify(program));
        } else {
            console.log('Row ', row, ' is blank.');
        }
    }

    return descriptionsToPgm;
}

function getOperatingUnitType(accountCode) {
    return accountCode > opCapConfig.operatingUnit.operating[0] && opCapConfig.operatingUnit.operating[1] < 7000 ? 'Capital' : 'Operating';
}


function correctTypos(name) {
//Correct typos
    let alias = _.find(opCapConfig.aliases, {name});

    if(alias) {
        return alias.root;
    } else {
        return name;
    }
}

function getExpenseAmounts(ExpenseWksht, programs, fundNumbers) {
    let departmentName = '****PLACEHOLDER****';
    let programName = '****PLACEHOLDER****';
    let expenses = [];
    let i = 0;

    for(let row=opCapConfig.expenses.firstRow; row<opCapConfig.expenses.finalRow; row++) {
        let groupNumber = ExpenseWksht[opCapConfig.accounts.groupCodeColumn + row];
        console.log('Row', row);

        if(groupNumber) {
            let departmentNameMaybe = ExpenseWksht[opCapConfig.accounts.descriptionColumn + row];

            if (departmentNameMaybe) {
                departmentName = programs[departmentNameMaybe.v].accountDescription.trim();
                programName = programs[departmentNameMaybe.v].program;
                console.log('\tSwitched to department %s with program %s', departmentName, programName)
            }
            departmentName = correctTypos(departmentName);

            console.log('Searching agencies for', departmentName, 'group', groupNumber.v);

            let agencyObj = _.find(opCapConfig.agencies, {name: departmentName});
            let characterClassObj = _.find(opCapConfig.characterClasses, {code: _.toInteger(groupNumber.v)});

            let agency;
            let characterClass;
            let skip = [];

            if(_.isNil(agencyObj)) {
                agency = '?';
                characterClass = '?';
            } else {
                agency = agencyObj.division;
                characterClass = characterClassObj.description;
            }

            console.log('\tLine of business is %s', agency);

            for (let col = opCapConfig.funds.firstColumn; col < opCapConfig.funds.lastColumn; col++) {
                try {
                    let fundNumber = fundNumbers[col];
                    let fundDescription = getFundDescription(fundNumber);
                    let opUnitDescription = getFundCategory(fundNumber);

                    let opUnitType = getOperatingUnitType(fundNumber);
                    let amount = ExpenseWksht[colIndex(col) + row];

                    console.log('For fund number %d, %s, class %d (%s)...', fundNumber, fundDescription, groupNumber.v, characterClass);

                    if (amount && amount.v !== 0) {
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
                } catch (e) {
                    if(e.indexOf('No Category Found for Fund') > -1 || e.indexOf('No Fund Description Found for Code') > -1) {
                        console.error(e);
                    } else {
                        throw e;
                    }
                }
            }
        } else {
            console.log('Row %d is either a subtotal row or blank', row);
        }
    }

    return expenses;
}

console.log('Opening Tulsa Budget data...');

let workbook = xlsx.readFile(opCapConfig.inputSpreadsheetLocation);

console.log('Opened file. Finding operating and capital tab...');
let dollarWksht = workbook.Sheets[opCapConfig.accountTableSheetName];
let categoryDescWorksheet = workbook.Sheets[opCapConfig.categorySheetName];


console.log('Getting fund numbers...');
let fundNumbers = getFundNumbers(dollarWksht, opCapConfig.funds.firstColumn, opCapConfig.funds.lastColumn);

console.log('Finding fund programs...');
let programs = getPrograms(categoryDescWorksheet);


console.log('Getting amounts for each fund and category source...');
let expenseAmounts = getExpenseAmounts(dollarWksht, programs, fundNumbers);

console.log('Writing output file...');
jsonfile.writeFile(opCapConfig.outputJsonLocation, expenseAmounts, function (err) {
    console.error(err);
});