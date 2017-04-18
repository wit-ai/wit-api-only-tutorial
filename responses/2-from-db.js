const {
  FIREBASE_CONFIG,
  queryWit,
  interactive,
  firstEntity,
} = require('../shared');
const firebase = require('firebase');

function handleMessage(question) {
  return queryWit(question).then(({entities}) => {
    const intent = firstEntity(entities, 'intent');
    const dateTime = firstEntity(entities, 'datetime') || {};
    const intentValue = (intent && intent.value) || 'unknown';
    return firebase
      .database()
      .ref(`answers/${intentValue}`)
      .once('value')
      .then(snapshot => {
        const val = snapshot.val();
        console.log(`🤖  ${val || intentValue}`, dateTime);
      });
  });
}
firebase.initializeApp(FIREBASE_CONFIG);
interactive(handleMessage);
