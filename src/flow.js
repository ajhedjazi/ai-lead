const questions = [
  {
    key: 'yearGroup',
    text: 'Hi, thanks for contacting Hull Maths Tutor. What year group is your child in?',
  },
  {
    key: 'school',
    text: 'Which school does your child attend?',
  },
  {
    key: 'childFirstName',
    text: "What is your child's first name?",
  },
  {
    key: 'parentName',
    text: 'What is your name?',
  },
  {
    key: 'email',
    text: 'What email address should we use to contact you?',
    validate: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    error: 'Please send a valid email address.',
  },
  {
    key: 'phone',
    text: 'What phone number should we use?',
    validate: (value) => {
      const digits = value.replace(/\D/g, '');
      return digits.length >= 10 && digits.length <= 15;
    },
    error: 'Please send a valid phone number.',
  },
  {
    key: 'anythingElse',
    text: 'Is there anything else you would like us to know?',
  },
];

function getOpeningMessage(session) {
  return getCurrentQuestion(session).text;
}

function handleAnswer(session, rawAnswer) {
  const answer = String(rawAnswer || '').trim();
  const question = getCurrentQuestion(session);

  if (!answer) {
    return {
      session,
      completed: false,
      reply: 'Please send a reply so I can continue.',
    };
  }

  if (question.validate && !question.validate(answer)) {
    return {
      session,
      completed: false,
      reply: question.error,
    };
  }

  const nextSession = {
    ...session,
    currentQuestionIndex: session.currentQuestionIndex + 1,
    enquiry: {
      ...session.enquiry,
      [question.key]: answer,
    },
  };

  if (nextSession.currentQuestionIndex >= questions.length) {
    return {
      session: nextSession,
      completed: true,
      enquiry: nextSession.enquiry,
      reply: 'Thanks. We have your details and will get back to you soon.',
    };
  }

  return {
    session: nextSession,
    completed: false,
    reply: getCurrentQuestion(nextSession).text,
  };
}

function getCurrentQuestion(session) {
  return questions[session.currentQuestionIndex] || questions[0];
}

module.exports = {
  questions,
  getOpeningMessage,
  handleAnswer,
};
