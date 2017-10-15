/** 
 * This file has all of the hard-coded information that the revenue and opcap extraction programs need
 * to find human-readable descriptions of the budget numbers.  This should be considered a configuration 
 * file and have NO functions, just data.  The only reason it's a JS file is so that comments were 
 * possible.
 * 
 * If you plan to adapt this for another city besides Tulsa, you will likely need to change this file.  
 */
const commonConfig = {
    fundDescriptions: {
        //Where to find the Operating Capital spreadsheet (used for finding fund numbers in revenue extractor)
        localFileLocation: '../_src/data/tulsa/originals/FY17 Oper + Capital.xlsx',
        //What sheet has the fund descriptions in the operating capital spreadsheet  
        sheet: 'OPBUDFD (2)',
        //What column to start looking for descriptions
        column: 'B',
        codeLocations: {
            //Which column has the code numbers
            column: 'A',
            //Which row the fund numbers start at
            first: '14',
            //Which number the fund numbers end at
            final: '49'
        },

        //Hard-coded list of codes from Section 9 of the Tulsa Budget Book.
        //Broke down and did this rather than mess with cross-referencing spreadsheets.
        codes: [
            {code: 1080, description: 'General Fund'},
            {code: 2240, description: 'Air Force Plant 3'},
            {code: 2320, description: 'PA Law Enforcement Training'},
            {code: 2330, description: 'Juvenile Curfew Fines'},
            {code: 2420, description: 'E911 Fee Operating'},
            {code: 2710, description: 'Econ. Dev. Commission'},
            {code: 2720, description: 'Convention and Visitors'},
            {code: 2740, description: 'Public Safety'},
            {code: 2750, description: 'Streets and Transportation'},
            {code: 2810, description: 'Convention and Tourism Facilities'},
            {code: 2910, description: 'Short-Term Capital'},
            {code: 3000, description: 'Municipal Emp. Retirement Fund'},
            {code: 3450, description: 'One Tech Center'},
            {code: 3551, description: 'RMUA General Operating'},
            {code: 3623, description: 'Tulsa Authority for Recovery of Energy'},
            {code: 3703, description: 'Tulsa Airports Improvement Trust Fund'}, //https://www.cityoftulsa.org/media/233551/1A-PreIntroPages.pdf
            {code: 4102, description: 'Tulsa Stadium Improvement District'},
            {code: 4122, description: 'Whittier Square Improvement District'},
            {code: 4306, description: 'Sinking Fund'},
            {code: 5561, description: 'Home'},
            {code: 5563, description: 'Emergency Solutions Grant'},
            {code: 5565, description: 'CDBG'},
            {code: 5567, description: 'Housing Opportunities for Persons with AIDS'},
            {code: 5761, description: 'Police Dept Forfeiture Awards'},
            {code: 6001, description: 'Misc. Capital Projects'},
            {code: 6007, description: '1996 Five-Year Sales Tax Fund'}, //https://www.cityoftulsa.org/media/19330/section00cover&sectioncontents.pdf
            {code: 6008, description: '2001 Five-year Sales Tax Fund'},
            {code: 6009, description: '2006 Special Extended Sales Tax Fund'},
            {code: 6011, description: '2008 Sales Tax Special Temporary Streets Fund'},
            {code: 6012, description: '1985 Sales Tax Economic Development Fund'},
            {code: 6014, description: '2014 Sales Tax Fund'},
            {code: 6015, description: '2016 Tulsa Economic Vision Fund'},
            {code: 6021, description: 'TMUA-Water Capital Projects Fund'},
            {code: 6031, description: 'TMUA-Sewer Captial Projects Fund'},
            {code: 6041, description: 'Stormwater Capital Projects Fund'},
            {code: 6420, description: 'E911 Fee Capital Fund'}, //http://cityoftulsa.org/COTlegacy/documents/0708budget/Sec00-CoverAndSectionContents.pdf
            {code: 6951, description: 'RMUA - Capital Projects'},
            {code: 7010, description: 'Tulsa Authority for Recovery of Energy'},
            {code: 7020, description: 'TMUA Water Operating'},
            {code: 7030, description: 'TMUA Sewer Operating'},
            {code: 7050, description: 'Golf Course Operating'},
            {code: 7060, description: 'EMSA'},
            {code: 8011, description: 'Office Services Service Fund'},
            {code: 8020, description: "Worker's Compensation Service Fund"},
            {code: 8025, description: 'Employee Insurance Service Fund'},
            {code: 8030, description: 'Equip. Mgmt. Service Fund'}
        ]
    },

    //Fund group codes.  These were not provided in the spreadsheet.
    //According to Nathan Pickard, the codes are all the same under State Law, though, so they were copied from OKC's data.
    characterClasses: [
        {code: 51, description: 'Personnel Services'},
        {code: 52, description: 'Professional Services'},
        {code: 53, description: 'Materials and Supplies'},
        {code: 54, description: 'Capital Purchase'},
        {code: 55, description: 'Debt Service'},
        {code: 58, description: 'Transfers'},
        {code: 59, description: 'Transfers'}
    ],

    categories: [
        {code: 1080, description: 'General Fund'},
        {code: 2000, description: 'Special Revenue'},
        {code: 3000, description: 'Trust & Agency Enterprise'},
        {code: 4100, description: 'Special Assessment'},
        {code: 4306, description: 'Debt Service'},
        {code: 5000, description: 'Special Revenue (Grants)'},
        {code: 6000, description: 'Capital Projects'},
        {code: 7000, description: 'Enterprise'},
        {code: 8000, description: 'Internal Service'}
    ]
};

const revenueConfig = {
    //Descriptions of each of the revenue sources
    descriptionRows: {
        first: 3,
        last: 35
    },

    //Columns and rows for revenue categories and amounts; we have to map amounts back to categories to get the right description
    categories: {
        categoryColumn: 'A',
        catgCrossRefColumn: 'AN',
        detailsColumn: 'B',
        firstRow: 10,
        lastRow: 68,
        sheetName: 'REVenue(2)',

        //Internal service categories are not enumerated on the 'REVenue(2)' spreadsheet, so we have to make one up.
        internalServiceCategory: {
            categoryDescription: 'Internal Service',
            detail: 'Internal Service Charges'
        },

        transfersInCategoryDesc: 'Transfers In'
    },

    colForAdpBudg: 'E',
    localFileLocation: '../_src/data/tulsa/originals/FY17 Revenues.xlsx',
    outputJsonLocation: '../_src/data/tulsa/c4tul_fy2017Revenue.json',
    amountTableSheetName: 'ADOPTED Rev Table',

    //Fund codes where the revenue was credited
    funds: {
        catgCrossRefColumn: 'A',
        fundCodeRow: 2,
        firstColumn: 1,
        totalColumn: 'AR',
        lastColumn: 43
    }
};

module.exports = {revenueConfig, commonConfig};