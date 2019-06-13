/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 */

const readline = require('readline');
const fetch = require('node-fetch');

// ------------------------------------------------------------
// Config

const NEW_ACCESS_TOKEN = ''; // TODO: fill this in
const FIREBASE_CONFIG = {}; // TODO: fill this in

// ------------------------------------------------------------
// Wit API Calls

function queryWit(text, n = 1) {
  return fetch(
    `https://api.wit.ai/message?v=20170307&n=${n}&q=${encodeURIComponent(text)}`,
    {
      headers: {
        Authorization: `Bearer ${NEW_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    }
  ).then(res => res.json());
}

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

// ------------------------------------------------------------
// Helper Functions

function interactive(handler) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.setPrompt('> ');
  const prompt = () => {
    rl.prompt();
    rl.write(null, {ctrl: true, name: 'e'});
  };
  rl
    .on('line', line => {
      line = line.trim();
      if (!line) {
        prompt();
        return;
      }
      if (line === 'q') {
        rl.close();
        return;
      }
      handler(line, rl).then(prompt);
    })
    .on('close', () => {
      console.log('good bye! :)');
    });
  prompt();
}

function firstEntity(entities, name) {
  return entities &&
    entities[name] &&
    Array.isArray(entities[name]) &&
    entities[name] &&
    entities[name][0];
}

module.exports = {
  queryWit,
  validateSamples,
  interactive,
  firstEntity,
  NEW_ACCESS_TOKEN,
  FIREBASE_CONFIG,
};
