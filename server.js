require('dotenv').config();

const express = require('express');
const crypto = require('crypto');
const { getSession, updateSession, clearSession } = require('./src/sessionStore');
const { getOpeningMessage, handleAnswer } = require('./src/flow');
const { sendMessengerMessage } = require('./src/sendMessengerMessage');

const app = express();
const port = process.env.PORT || 3000;
const verifyToken = process.env.META_VERIFY_TOKEN;
const appSecret = process.env.META_APP_SECRET;

app.use(express.json({
  verify: (req, res, buffer) => {
    req.rawBody = buffer;
  },
}));

app.get('/', (req, res) => {
  res.send('Hull Maths Tutor Messenger bot is running.');
});

app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === verifyToken) {
    res.status(200).send(challenge);
    return;
  }

  res.sendStatus(403);
});

app.post('/webhook', async (req, res) => {
  if (!isValidSignature(req)) {
    res.sendStatus(403);
    return;
  }

  if (req.body.object !== 'page') {
    res.sendStatus(404);
    return;
  }

  res.status(200).send('EVENT_RECEIVED');

  for (const entry of req.body.entry || []) {
    for (const event of entry.messaging || []) {
      await handleMessengerEvent(event);
    }
  }
});

async function handleMessengerEvent(event) {
  const senderId = event.sender?.id;

  if (!senderId || event.message?.is_echo) {
    return;
  }

  if (event.postback) {
    await startSession(senderId);
    return;
  }

  const text = event.message?.quick_reply?.payload || event.message?.text;

  if (!text) {
    await sendMessengerMessage(senderId, {
      text: 'Please send a text reply so I can help with your Hull Maths Tutor enquiry.',
    });
    return;
  }

  const session = getSession(senderId);

  if (!session.started) {
    await startSession(senderId);
    return;
  }

  const result = handleAnswer(session, text);
  updateSession(senderId, result.session);

  if (result.completed) {
    console.log('Completed Hull Maths Tutor enquiry:', result.enquiry);
    clearSession(senderId);
  }

  await sendMessengerMessage(senderId, { text: result.reply });
}

async function startSession(senderId) {
  const session = {
    started: true,
    currentQuestionIndex: 0,
    enquiry: {},
  };

  updateSession(senderId, session);
  await sendMessengerMessage(senderId, { text: getOpeningMessage(session) });
}

function isValidSignature(req) {
  if (!appSecret) {
    return true;
  }

  const signature = req.get('x-hub-signature-256');

  if (!signature || !req.rawBody) {
    return false;
  }

  const expected = `sha256=${crypto
    .createHmac('sha256', appSecret)
    .update(req.rawBody)
    .digest('hex')}`;

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  return signatureBuffer.length === expectedBuffer.length
    && crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
}

app.listen(port, () => {
  console.log(`Hull Maths Tutor Messenger bot listening on port ${port}`);
});
