const {
  queryWit,
  interactive,
  firstEntity,
} = require('../shared');

function handleMessage(question) {
  return queryWit(question).then(({entities}) => {
    const intent = firstEntity(entities, 'intent');
    const dateTime = firstEntity(entities, 'datetime') || {};
    if (!intent) {
      console.log('🤖  Try something else. I got no intent :)');
      return;
    }
    switch (intent.value) {
      case 'appt_make':
        console.log('🤖  Okay, making an appointment', dateTime);
        break;
      case 'appt_show':
        console.log('🤖  Sure, showing your appointments', dateTime);
        break;
      default:
        console.log(`🤖  ${intent.value}`);
        break;
    }
  });
}
interactive(handleMessage);
