# Using Wit.ai programmatically

[Wit.ai](https://wit.ai) comes with a powerful API to understand Natural Language. Traditionally, the main approach of building and training you Wit app was through our Web app (aka Wit Console). However, users have had more complex use cases recently that are hardly supported by our Web App.

- If you already have trained data, how can you import this into wit?
- What if Wit isn't sure? How do you handle ambiguity with your app?
- If you have users, is there a way to let them *correct your app* for you?
- If you want to customize your app for each user, how do you do that?

To help solve these, we introduced new APIs to help you do this programmatically.

### The Tutorial

In this tutorial, we'll work together in building an Appointment Scheduling Bot. Through building this bot, we will learn how to:

- Create an app through the API
- Train your app with existing data
- Add built-in entities
- Handle ambiguous queries
- Implement a feedback loop to let your users train your existing entities
- Let your user expand the scope of your app

Are we ready? **Let's go down the rabbit hole!**

## Get Your Seed Token

![overview](/example-images/seed_token.png)

In order to start using the Wit.ai API, we need to start with some identification. Make sure you have signed up for [Wit.ai](https://wit.ai) if you haven't already.

Once you have:

1. Go to the `Settings` page of the [Wit console](https://wit.ai/home)
2. Copy the `Server Access Token`

This will be the base token we will use to create other apps. In the code this will be under the variable `BASE_TOKEN`.

## Create Your App

Now that you have your `BASE_TOKEN`, we can start off by creating the app for our appointment scheduler.

We can use the `POST /apps` API

```bash
curl -XPOST 'https://api.wit.ai/apps?v=20170307' \
 -H "Authorization: Bearer $BASE_TOKEN" \
 -H "Content-Type: application/json" \
 -d '{"name":"appointment_bot",
      "lang":"en",
      "private":"false"}'
```

You should get back:

```json
{
  "access_token" : "...",
  "app_id" : "..."
}
```

Great! Now, if you go to `https://wit.ai/{your_username}/appointment_bot`, you should see your new Wit app.

From now on we'll refer to the access_token we got here as `NEW_ACCESS_TOKEN`, and the app id as `NEW_APP_ID`. If you cloned this repo to try the examples, update the variable in [shared.js](/shared.js).

## Update Your App

You can use the the `PUT /apps` API to change anything about your app (description, language...). Let's update our app's timezone for example:


```bash
curl -XPUT 'https://api.wit.ai/apps/$NEW_APP_ID?v=20170307' \
  -H "Authorization: Bearer $NEW_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"timezone":"America/Los_Angeles"}'
```

You should get back:

```
{
  "success" : true
}
```

You can now also delete you apps programmatically via [DELETE /apps/:app-id](https://wit.ai/docs/http/20170307#delete--apps-:app-id-link)


## Train With Existing Data

Before you start, you may already have an idea of what you want your app to do.

Maybe you get this data from your logs, or generate them, either way we can use the `POST /sample` API to train Wit with this data.

Let's say we have data in the form of a [spreadsheet](/initial-data/data.tsv)

We could create a [script](/initial-data/index.js) to import this data into your Wit app.

```javascript
function validateSamples(samples) {
  return fetch('https://api.wit.ai/samples?v=20170307', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${NEW_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(samples),
  })
    .then(res => res.json())
}

validateSamples(samples)
  .then(res => console.log(res));
```

**Follow the full script [here](/initial-data/index.js)**

You should get back:

```json
{ "sent": true, "n": 2 }
```

You can now test your app out:

```bash
curl \
 -H 'Authorization: Bearer $NEW_ACCESS_TOKEN' \
 'https://api.wit.ai/message?v=20170416&q=Show%20me%20my%20appointment'
```

You should get back:

```json
{
  "msg_id" : "...",
  "_text" : "Show me my appointment",
  "stats" : {
    "total_time" : 177,
  },
  "entities" : {
    "intent" : [ {
      "confidence" : 0.9824609283668854,
      "value" : "appt_show"
    } ]
  }
}
```

## Add date detection

Now, our app can handle "show my appointments" and "when are my appointments", but what if our users ask "I want an appointment for tomorrow please"


Let's add first the built-in entity `wit/datetime` to our app:

```bash
curl -XPOST 'https://api.wit.ai/samples?v=20170307' \
  -H "Authorization: Bearer $NEW_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '[{
        "text": "I want an appointment for tomorrow please",
        "entities": [
          {
            "entity": "intent",
            "value": "appt_make"
          },
          {
            "entity": "wit$datetime",
            "value": "tomorrow",
            "start": 26,
            "end": 34
          }
        ]
      }]'
```

Let's test this out:

```bash
curl \
 -H 'Authorization: Bearer $NEW_ACCESS_TOKEN' \
 'https://api.wit.ai/message?v=20170416&q=Show%20me%20my%20thursday%20appointment'
```

You should see:

```json
{
  "msg_id" : "...",
  "_text" : "Show me my thursday appointment",
  "stats" : {
    "total_time" : 85
  },
  "entities" : {
    "datetime" : [ {
      "confidence" : 0.9911201473876323,
      "values" : [ "..." ],
      "value" : "2017-04-20T00:00:00.000-07:00",
      "grain" : "day",
      "type" : "value"
    } ],
    "intent" : [ {
      "confidence" : 0.9619954423379411,
      "value" : "appt_show"
    } ]
  }
}
```

# Send Responses

How do we map responses to these intents? Let's start by writing a [script](/responses/1-simple.js), which queries wit for an intent, and dispatches responses based on the result.

We can use a simple switch statement to do this:

```javascript
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
```

**Follow the full script [here](/responses/1-simple.js)**

# Dynamic Answers

In the example above, we are simply hard coding our responses. However, if we want to alter these responses on the fly, we would need to store this into a database.

Let's create a quick [script](/responses/2-from-db.js), which queries [firebase](https://firebase.google.com) for answers. If you cloned this repo to try the examples, update the `FIREBASE_CONFIG` variable in [shared.js](/shared.js).

```javascript
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
```

**Follow the full script [here](/responses/2-from-db.js)**

# Manage Uncertainty

Okay, now we have an app that queries a database to respond with answers. **What happens when Wit is not really sure?**.

This can happen for two reasons:

1. *Your app needs more training*. Wit may have received a question it had never seen before. For example, if a user said `am in trouble need to see you`, it would be hard for Wit to know what to do.
2. *The question is **genuinely** ambiguous*. Even trickier, the user may ask a question, that can have multiple right answers. For example, if a user said `appointment`, they may want to see their appointments, or make new ones.

To solve this, you can use the `N-Best` feature. This allows you to get back more then one likely answer, so you can help the user narrow down their choice.

Let's create a [script](/responses/3-n-best.js) to do this.

```javascript
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
    // ...
  });
}
```

**Follow the full script [here](/responses/3-n-best.js)**

# Let Users *Train* Your App

Congratulations, you made it this far! Can we do more?

Well, if your user is answering what they would like to do, couldn't we use this information to teach Wit?

Let's create an updated [script](responses/4-train.js), so when Wit isn't sure, we use the response from users to train the App.

```javascript
    // ...
    if (!bestIntent || bestIntent.confidence < THRESHOLD) {
      console.log('🤖  what would you like to do?');
      intents.forEach(intent => console.log(`\n -- ${intent.value}`));
      readline.question('choice > ', choice => {
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
        ]).then(({n}) => console.log(`validated ${n}!`));
        console.log(`🤖  okay, running > ${choice}`);
      });
      return;
    }
    // ...
```

**Follow the full script [here](/responses/4-train.js)**

# And There's More...

Okay, now you have an app that can learn from your users. Can we do more? Well, **what if we let the user add answers for us**?

For example, we could let the business owner train new questions and create new responses.

Let's write a [script](/responses/5-generate-answers.js) that lets them define new intents and answers when wit isn't sure.

```javascript
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
```

# Conclusion

This tutorial goes into building an example app, but you easily imagine how to integrate this in your developer platform. Do you have an idea for a great bot experience for service businesses, or other verticals? you can use Wit and Messenger platform to create custom solutions for them.

I hope you liked this tutorial. Thank you for being a part of our community. Let us know what you think, and how we can serve you better. Feel free to join the [Facebook group](https://facebook.com/groups/wit-hackers) to meet other like-minded hackers, or ask on our [github support channel](https://github.com/wit-ai/wit/issues) for issues with Wit. If you have ideas for this tutorial, let us know in the [issues](https://github.com/stopachka/platform-api/issues) here.

Team Wit
