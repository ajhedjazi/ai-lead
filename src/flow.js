const questions = [
  {
    key: 'yearGroup',
    text: "👋 Hi! Thanks for contacting Hull Maths Tutor.\n\nI'm Amir, a qualified Maths tutor based in Hull.\n\nI'll ask you a few quick questions so I can understand how I can best support your child. It only takes around 2 minutes.\n\nLet's get started...\n\nWhat year group will your child be starting in September?",
    quickReplies: [
      'Year 7',
      'Year 8',
      'Year 9',
      'Year 10',
      'Year 11',
    ],
  },
  {
    key: 'school',
    text: 'Great, thank you! 😊\n\nWhich school does your child attend?',
  },
  {
    key: 'childFirstName',
    text: "Perfect.\n\nWhat's your child's first name?",
  },
  {
    key: 'parentName',
    text: "Thanks!\n\nAnd what's your name?",
  },
  {
    key: 'email',
    text: "Brilliant.\n\nWhat's the best email address for me to send your personalised Maths MOT recommendation to?",
    validate: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    error: 'Please send a valid email address.',
  },
  {
    key: 'phone',
    text: "Thanks.\n\nWhat's the best phone number to contact you on if needed?",
    validate: (value) => {
      const digits = value.replace(/\D/g, '');
      return digits.length >= 10 && digits.length <= 15;
    },
    error: 'Please send a valid phone number.',
  },
  {
    key: 'anythingElse',
    text: "Finally, is there anything else you'd like me to know about your child or their Maths?",
    quickReplies: [
      { title: '😊 Confidence', payload: 'Confidence' },
      { title: '✖️ Times tables', payload: 'Times tables' },
      { title: '➗ Algebra', payload: 'Algebra' },
      { title: '📝 Exam technique', payload: 'Exam technique' },
      { title: '📚 A bit of everything', payload: 'A bit of everything' },
      { title: '💬 Other', payload: 'Other' },
    ],
  },
];

function getOpeningMessage(session) {
  return getQuestionMessage(getCurrentQuestion(session));
}

function handleAnswer(session, rawAnswer) {
  const answer = String(rawAnswer || '').trim();
  const question = getCurrentQuestion(session);

  if (!answer) {
    return {
      session,
      completed: false,
      reply: { text: 'Please send a reply so I can continue.' },
    };
  }

  if (question.key === 'anythingElse' && answer.toLowerCase() === 'other') {
    return {
      session,
      completed: false,
      reply: { text: "Of course. Please type anything else you'd like me to know." },
    };
  }

  if (question.validate && !question.validate(answer)) {
    return {
      session,
      completed: false,
      reply: { text: question.error },
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
      reply: {
        text: "🎉 Thanks, that's everything I need.\n\nI'll personally review your answers and be in touch as soon as possible to discuss the next steps and answer any questions you may have.\n\nThanks again for getting in touch with Hull Maths Tutor — I look forward to speaking with you soon.\n\n— Amir",
      },
    };
  }

  return {
    session: nextSession,
    completed: false,
    reply: getQuestionMessage(getCurrentQuestion(nextSession)),
  };
}

function getCurrentQuestion(session) {
  return questions[session.currentQuestionIndex] || questions[0];
}

function getQuestionMessage(question) {
  const message = {
    text: question.text,
  };

  if (question.quickReplies) {
    message.quick_replies = question.quickReplies.map((quickReply) => {
      const title = typeof quickReply === 'string' ? quickReply : quickReply.title;
      const payload = typeof quickReply === 'string' ? quickReply : quickReply.payload;

      return {
        content_type: 'text',
        title,
        payload,
      };
    });
  }

  return message;
}

module.exports = {
  questions,
  getOpeningMessage,
  handleAnswer,
};
