var xlsx = require('xlsx');
var jsonfile = require('jsonfile');

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

