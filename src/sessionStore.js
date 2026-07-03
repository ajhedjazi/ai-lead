const sessions = new Map();

function getSession(senderId) {
  return sessions.get(senderId) || {
    started: false,
    currentQuestionIndex: 0,
    enquiry: {},
  };
}

function updateSession(senderId, session) {
  sessions.set(senderId, session);
}

function clearSession(senderId) {
  sessions.delete(senderId);
}

module.exports = {
  getSession,
  updateSession,
  clearSession,
};
