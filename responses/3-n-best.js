const {
  FIREBASE_CONFIG,
  queryWit,
  interactive,
  firstEntity,
} = require('../shared');
const firebase = require('firebase');

const N = 3;
const THRESHOLD = 0.7;
function handleMessage(question, readline) {
  return queryWit(question, N).then(({entities}) => {
    const intents = entities['intent'] || [];
    const bestIntent = intents[0];
    const dateTime = firstEntity(entities, 'datetime') || {};

    if (!bestIntent || bestIntent.confidence < THRESHOLD) {
      console.log('🤖  what would you like to do?');
      intents.forEach(intent => console.log(`\n -- ${intent.value}`));
      readline.question('choice > ', choice => {
        console.log(`🤖  okay, running > ${choice}`);
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
