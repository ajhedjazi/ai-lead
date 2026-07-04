const graphApiVersion = process.env.META_GRAPH_API_VERSION || 'v20.0';
const pageAccessToken = process.env.META_PAGE_ACCESS_TOKEN;
const typingDelayMs = 1200;

async function sendMessengerMessage(recipientId, message) {
  if (Array.isArray(message)) {
    for (const singleMessage of message) {
      await sendMessengerMessage(recipientId, singleMessage);
    }
    return;
  }

  if (!pageAccessToken) {
    console.log('Messenger reply skipped because META_PAGE_ACCESS_TOKEN is not set:', {
      recipientId,
      message,
    });
    return;
  }

  try {
    await sendMessengerRequest({
      recipient: { id: recipientId },
      sender_action: 'typing_on',
    });
    await wait(typingDelayMs);
  } catch (error) {
    console.warn('Messenger typing indicator failed:', error.message);
  }

  await sendMessengerRequest({
    recipient: { id: recipientId },
    message,
  });
}

async function sendMessengerRequest(body) {
  const response = await fetch(
    `https://graph.facebook.com/${graphApiVersion}/me/messages?access_token=${pageAccessToken}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Messenger Send API failed: ${response.status} ${errorText}`);
  }
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

module.exports = {
  sendMessengerMessage,
};
