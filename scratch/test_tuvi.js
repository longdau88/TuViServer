const { generateLaSo } = require('tuvi-neo');
const fs = require('fs');

const chart = generateLaSo({
    name: "Test",
    gender: 1, // nam
    birth: {
        solarYear: 2000,
        solarMonth: 1,
        solarDay: 1,
        hour: 'Ngọ',
        time: '12:00'
    },
    viewYear: 2024
});

fs.writeFileSync('scratch/test_tuvi_output.json', JSON.stringify(chart, null, 2));
