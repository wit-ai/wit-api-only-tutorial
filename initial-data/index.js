const fs = require('fs');
const fetch = require('node-fetch');
const {validateSamples} = require('../shared');

const TAB = '	';
const data = fs
  .readFileSync('initial-data/data.tsv', 'utf-8')
  .split('\r')
  .map(row => row.split(TAB));

const samples = data.map(([text, value]) => {
  return {
    text,
    entities: [
      {
        entity: 'intent',
        value,
      },
    ],
  };
});

validateSamples(samples)
  .then(res => console.log(res));
