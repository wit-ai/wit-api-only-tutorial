const {
  FIREBASE_CONFIG,
  queryWit,
  interactive,
  firstEntity,
  validateSamples,
} = require('../shared');
const firebase = require('firebase');

const N = 3;
const THRESHOLD = 0.7;

function generateIntentValue(text) {
  return text.toLowerCase().replace(/\W/g, '');
}

function recordAnswer(question, readline) {
  console.log('🤖  How would you answer this question?');
  readline.question('answer > ', answer => {
    const newValue = generateIntentValue(answer);
    validateSamples([
      {
        text: question,
        entities: [
          {
            entity: 'intent',
            value: newValue,
          },
        ],
      },
    ])
      .then(({n}) => console.log(`validated ${n}!`))
      .then(() => {
        return firebase.database().ref(`answers/${newValue}`).set(answer);
        console.log('🤖  ok! saved');
        readline.prompt();
      });
  });
}
function handleMessage(question, readline) {
  return queryWit(question, N).then(({entities}) => {
    const intents = entities['intent'] || [];
    const bestIntent = intents[0];
    const dateTime = firstEntity(entities, 'datetime') || {};
    if (!bestIntent || bestIntent.confidence < THRESHOLD) {
      console.log('🤖  what would you like to do?');
      intents.forEach(intent => console.log(`\n -- ${intent.value}`));
      console.log('\n -- new');
      readline.question('choice > ', choice => {
        if (choice === 'new') {
          recordAnswer(question, readline);
          return;
        }
        console.log(`🤖  okay, running > ${choice}`);
        validateSamples([
          {
            text: question,
            entities: [
              {
                entity: 'intent',
                value: choice,
              },
            ],
          },
        ])
          .then(({n}) => console.log(`validated ${n}!`))
          .then(() => readline.prompt());
      });
      return;
    }
    return firebase
      .database()
      .ref(`answers/${bestIntent.value}`)
      .once('value')
      .then(snapshot => {
        const val = snapshot.val();
        console.log(`🤖  ${val || bestIntent.value}`, dateTime);
      });
  });
}
firebase.initializeApp(FIREBASE_CONFIG);
interactive(handleMessage);
