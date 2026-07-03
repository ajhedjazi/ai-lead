const graphApiVersion = process.env.META_GRAPH_API_VERSION || 'v20.0';
const pageAccessToken = process.env.META_PAGE_ACCESS_TOKEN;

async function sendMessengerMessage(recipientId, message) {
  if (!pageAccessToken) {
    console.log('Messenger reply skipped because META_PAGE_ACCESS_TOKEN is not set:', {
      recipientId,
      message,
    });
    return;
  }

  const response = await fetch(
    `https://graph.facebook.com/${graphApiVersion}/me/messages?access_token=${pageAccessToken}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Messenger Send API failed: ${response.status} ${errorText}`);
  }
}

module.exports = {
  sendMessengerMessage,
};
