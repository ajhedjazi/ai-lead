require('dotenv').config();

const express = require('express');
const crypto = require('crypto');
const { getSession, updateSession, clearSession } = require('./src/sessionStore');
const { getOpeningMessage, handleAnswer } = require('./src/flow');
const { sendMessengerMessage } = require('./src/sendMessengerMessage');
const { sendLeadEmail } = require('./src/sendLeadEmail');

const app = express();
const port = process.env.PORT || 3000;
const verifyToken = process.env.META_VERIFY_TOKEN;
const appSecret = process.env.META_APP_SECRET;
const graphApiVersion = process.env.META_GRAPH_API_VERSION || 'v20.0';
const pageAccessToken = process.env.META_PAGE_ACCESS_TOKEN;
const getStartedPayload = 'HULL_MATHS_TUTOR_GET_STARTED';
const getStartedPayloads = new Set([
  'GET_STARTED',
  getStartedPayload,
]);
const messengerGreeting = '👋 Thanks for contacting Hull Maths Tutor. Tap Get Started below to begin your quick enquiry.';

app.use(express.json({
  verify: (req, res, buffer) => {
    req.rawBody = buffer;
  },
}));

app.get('/', (req, res) => {
  res.send('Hull Maths Tutor Messenger bot is running.');
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
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

  if (isGetStartedPostback(event)) {
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
    await sendMessengerMessage(senderId, {
      text: 'Please tap Get Started to begin your Hull Maths Tutor enquiry.',
    });
    return;
  }

  const result = handleAnswer(session, text);
  updateSession(senderId, result.session);
  let completedEnquiry = null;

  if (result.completed) {
    console.log('Completed Hull Maths Tutor enquiry:', result.enquiry);
    completedEnquiry = result.enquiry;
    clearSession(senderId);
  }

  await sendMessengerMessage(senderId, result.reply);

  if (completedEnquiry) {
    await sendLeadEmail(completedEnquiry);
  }
}

function isGetStartedPostback(event) {
  return Boolean(
    event.postback?.payload
    && getStartedPayloads.has(event.postback.payload)
  );
}

async function startSession(senderId) {
  const session = {
    started: true,
    currentQuestionIndex: 0,
    enquiry: {},
  };

  updateSession(senderId, session);
  await sendMessengerMessage(senderId, getOpeningMessage(session));
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

async function registerMessengerProfile() {
  if (!pageAccessToken) {
    console.warn('Messenger Profile setup skipped: META_PAGE_ACCESS_TOKEN is not set.');
    return;
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/${graphApiVersion}/me/messenger_profile?access_token=${pageAccessToken}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          get_started: {
            payload: getStartedPayload,
          },
          greeting: [
            {
              locale: 'default',
              text: messengerGreeting,
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`Messenger Profile setup failed: ${response.status} ${errorText}`);
      return;
    }

    console.log('Messenger Profile setup complete.');
  } catch (error) {
    console.warn('Messenger Profile setup failed:', error.message);
  }
}

app.listen(port, () => {
  console.log(`Hull Maths Tutor Messenger bot listening on port ${port}`);
  registerMessengerProfile();
});
