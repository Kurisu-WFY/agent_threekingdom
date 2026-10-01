const fs=require('node:fs'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
assert.equal((html.match(/id="trip-form"/g)||[]).length,1,'activity requirements have one form');
assert.doesNotMatch(html,/id="itinerary-form"|src="itinerary(?:-agent-core)?\.js/,'retired activity form and scripts are absent');
assert.ok(html.includes('id="outing-route-form"'),'road lookup remains available');
assert.equal((html.match(/id="travel-weather-form"/g)||[]).length,1,'one weather form in activity domain');
assert.doesNotMatch(html,/id="outing-weather-form"/,'retired weather form is absent');
console.log('PASS: one activity request form, retired duplicate scripts, road lookup retained');
