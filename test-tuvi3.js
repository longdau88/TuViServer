const tuvi = require('tuvi-neo');
const chart = tuvi.generateLaSo({
  name: "John",
  gender: "male",
  birth: {
    year: 1990,
    month: 5,
    day: 20,
    hour: 14,
    isLunar: false
  }
});
// Print all cungs
const cungs = chart.Cac_cung;
cungs.forEach((cung, i) => {
  console.log(`[${i}] Name=${cung.Name} ChinhTinh=${JSON.stringify(cung.ChinhTinh)} SoTot=${cung.nSaoTot} SoXau=${cung.nSaoXau} TrangSinh=${cung.TrangSinh}`);
});
console.log('---RAW---');
console.log(JSON.stringify(chart.rawLaso, null, 2).slice(0, 1000));
