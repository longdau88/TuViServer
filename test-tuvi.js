const tuvi = require('tuvi-neo');
console.log(Object.keys(tuvi));
const chart = tuvi.generateLaSo({ day: 20, month: 5, year: 1990, hour: 14, gender: 1, calendarType: 1 });
console.log(JSON.stringify(chart, null, 2));
