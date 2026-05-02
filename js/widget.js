(function () {
  'use strict';

  // DOM Elements
  const widgetTrigger = document.getElementById('widget-trigger');
  const widgetContainer = document.getElementById('widget-container');
  const widgetClose = document.getElementById('widget-close');
  const chatMessages = document.getElementById('chat-messages');
  const chatInputArea = document.querySelector('.chat-input-area');
  const chatInput = document.getElementById('chat-input');
  const sendButton = document.getElementById('send-button');

  // State Variables
  let currentQuestionIndex = 0;
  let enquiry = {};
  let googlePlacesAutocomplete = null;
  const propertyImageFallback = `data:image/svg+xml,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 120">
      <rect width="140" height="120" fill="#edf6ff"/>
      <path d="M26 62 70 28l44 34v42H36V62z" fill="#ffffff" stroke="#007bff" stroke-width="5" stroke-linejoin="round"/>
      <path d="M58 104V75h24v29" fill="#dbeafe" stroke="#007bff" stroke-width="5"/>
      <path d="M49 56h14v14H49zm28 0h14v14H77z" fill="#bfdbfe"/>
    </svg>
  `)}`;

  // === Main Conversation Flow ===
  const questions = [
    {
      key: 'type',
      text: "Hi there! I'm your property assistant. What are you looking to do today?",
      type: 'options',
      options: [
        { label: 'Buy a property', value: 'buyer' },
        { label: 'Invest in property', value: 'investor' },
        { label: 'Sell a property', value: 'seller' },
      ],
      placeholder: "Select an option above..."
    },
    {
      key: 'budget',
      text: () => {
        if (enquiry.type === 'seller') {
          return "Great! What are you looking to get for your property?";
        } else if (enquiry.type === 'investor') {
          return "Great! What amount are you looking to invest?";
        }

        return "Great! And what's your maximum budget?";
      },
      placeholder: "250,000",
      type: 'input',
      validate: (v) => {
        const num = parseFloat(String(v).replace(/[£,]/g, ''));
        return !isNaN(num) && num > 0;
      },
      transform: (v) => parseFloat(String(v).replace(/[£,]/g, '')),
      error: "Please enter a valid amount (e.g., £250000).",
    },
    {
      key: 'timeframe',
      text: () => {
        if (enquiry.type === 'investor') {
          return "Understood. When are you looking to invest?";
        }

        return "Understood. When are you looking to move?";
      },
      type: 'options',
      options: [
        { label: 'ASAP', value: 'asap' },
        { label: 'Within 1-3 months', value: '1-3 months' },
        { label: '3+ months', value: '3+ months' },
      ],
      placeholder: "Select an option above..."
    },
    {
      key: 'location',
      text: "Okay, do you have a preferred location or area in mind?",
      type: 'input',
      placeholder: "Start typing (e.g., Hull, HU1)",
    },
    {
      key: 'name',
      text: "Alright, we're almost ready to find your matches! What's your full name?",
      type: 'input',
      placeholder: "e.g., John Smith",
      validate: (v) => v.trim().length > 2,
      error: "Please enter your full name.",
    },
    {
      key: 'email',
      text: "And your email address, please?",
      type: 'input',
      placeholder: "e.g., john.smith@example.com",
      validate: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      error: "Please enter a valid email address.",
    },
    {
      key: 'phone',
      text: "Do you have a phone number? (Optional)",
      type: 'input',
      placeholder: "e.g., 07123 456789",
      validate: () => true,
    }
  ];

  // === Sample Property Data ===
  const properties = [
    {
      id: 1,
      title: 'Modern 3 Bed Semi-Detached House',
      price: 185000,
      type: 'buyer',
      location: 'Hull',
      image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=280&q=80',
    },
    {
      id: 2,
      title: 'City Centre 2 Bed Apartment',
      price: 135000,
      type: 'investor',
      location: 'Hull City Centre',
      image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=280&q=80',
    },
    {
      id: 3,
      title: 'Investment Opportunity 4 Bed HMO',
      price: 220000,
      type: 'investor',
      location: 'East Hull',
      image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=280&q=80',
    },
    {
      id: 4,
      title: 'Starter 2 Bed Terrace',
      price: 110000,
      type: 'buyer',
      location: 'Bilton',
      image: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=280&q=80',
    },
    {
      id: 5,
      title: 'Spacious 4 Bed Family Home',
      price: 300000,
      type: 'buyer',
      location: 'Beverley',
      image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=280&q=80',
    },
    {
      id: 6,
      title: 'Studio Apartment, City Centre',
      price: 90000,
      type: 'investor',
      location: 'Hull City Centre',
      image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=280&q=80',
    }
  ];

  // === Widget Control Functions ===
  function toggleWidget() {
    const isOpening = widgetContainer.classList.contains('hidden');

    widgetContainer.classList.toggle('hidden', !isOpening);
    widgetTrigger.classList.toggle('hidden', isOpening);
    widgetTrigger.hidden = isOpening;
    widgetTrigger.setAttribute('aria-expanded', String(isOpening));

    if (isOpening) {
      resetChat();
      askQuestion();
    }
  }

  function closeWidget() {
    widgetContainer.classList.add('hidden');
    widgetTrigger.classList.remove('hidden');
    widgetTrigger.hidden = false;
    widgetTrigger.setAttribute('aria-expanded', 'false');
    resetChat();
  }

  // === Chat Rendering Logic ===
  function addMessage(text, sender, options = [], isHtml = false) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', sender);

    if (isHtml) {
      messageDiv.innerHTML = text;
    } else {
      messageDiv.textContent = text;
    }

    if (options.length > 0) {
      const optionsGroup = document.createElement('div');
      optionsGroup.classList.add('chat-options-group');

      options.forEach((opt) => {
        const btn = document.createElement('button');
        btn.classList.add('chat-option-button');
        btn.textContent = opt.label;
        btn.onclick = (e) => handleAnswer(opt.value, opt.label, e);
        optionsGroup.appendChild(btn);
      });

      messageDiv.appendChild(optionsGroup);
      chatInput.disabled = true;
      sendButton.disabled = true;
      chatInput.placeholder = "Select an option above...";
      chatInputArea.classList.remove('money-input');
    } else {
      chatInput.disabled = false;
      sendButton.disabled = chatInput.value.trim() === '';

      const currentQuestion = questions[currentQuestionIndex];
      chatInput.placeholder = currentQuestion?.placeholder || "Type your answer...";
      chatInputArea.classList.toggle('money-input', currentQuestion?.key === 'budget');
    }

    chatMessages.appendChild(messageDiv);
    scrollBottom();
  }

  function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.classList.add('message', 'assistant', 'typing-indicator');
    typingDiv.innerHTML = '<span></span><span></span><span></span>';
    typingDiv.id = 'typing-indicator';
    chatMessages.appendChild(typingDiv);
    scrollBottom();
  }

  function removeTypingIndicator() {
    const typingDiv = document.getElementById('typing-indicator');

    if (typingDiv) {
      typingDiv.remove();
    }
  }

  function scrollBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // === Conversation Flow Control ===
  function askQuestion() {
    if (currentQuestionIndex >= questions.length) {
      removeTypingIndicator();
      return showResults();
    }

    const q = questions[currentQuestionIndex];
    showTypingIndicator();

    setTimeout(() => {
      removeTypingIndicator();
      const questionText = typeof q.text === 'function' ? q.text() : q.text;
      addMessage(questionText, 'assistant', q.options);
      chatInput.value = '';

      if (q.key === 'location' && window.google?.maps?.places) {
        enableAutocomplete();
      } else {
        chatInput.focus();
      }

      sendButton.disabled = q.key !== 'phone' && chatInput.value.trim() === '' && !chatInput.disabled;
    }, 700);
  }

  function handleAnswer(value, label = null, clickEvent = null) {
    const q = questions[currentQuestionIndex];

    enquiry[q.key] = q.transform ? q.transform(value) : value;
    addMessage(label || value, 'user');

    const optionsGroup = clickEvent?.target?.closest('.chat-options-group');

    if (optionsGroup) {
      optionsGroup.querySelectorAll('button').forEach((btn) => {
        btn.disabled = true;
      });
    }

    if (googlePlacesAutocomplete) {
      google.maps.event.clearInstanceListeners(chatInput);
      googlePlacesAutocomplete = null;
    }

    currentQuestionIndex++;
    askQuestion();
  }

  // === Google Places Autocomplete ===
  window.initMapAutocomplete = function () {
    console.log("Google Maps API and Places library loaded.");
  };

  function enableAutocomplete() {
    if (!googlePlacesAutocomplete && window.google?.maps?.places) {
      const hullBounds = new google.maps.LatLngBounds(
        { lat: 53.70, lng: -0.50 },
        { lat: 53.85, lng: 0.00 }
      );

      googlePlacesAutocomplete = new google.maps.places.Autocomplete(chatInput, {
        types: ['geocode'],
        componentRestrictions: { country: 'uk' },
        bounds: hullBounds,
        strictBounds: false
      });

      googlePlacesAutocomplete.addListener('place_changed', () => {
        const place = googlePlacesAutocomplete.getPlace();

        if (place?.formatted_address) {
          chatInput.value = place.formatted_address;
          sendButton.disabled = false;
        }

        chatInput.blur();
      });

      chatInput.focus();
      console.log("Google Places Autocomplete initialized for location input, restricted to Hull.");
    } else if (googlePlacesAutocomplete) {
      chatInput.disabled = false;
      chatInput.focus();
    } else {
      console.warn("Google Maps Places library not fully loaded, Autocomplete could not be enabled.");
      chatInput.disabled = false;
      chatInput.placeholder = "Enter your city or area (no autocomplete available)...";
      chatInput.focus();
    }
  }

  // === Event Listeners ===
  function attachEventListeners() {
    widgetTrigger.addEventListener('click', toggleWidget);
    widgetClose.addEventListener('click', closeWidget);

    chatInput.addEventListener('input', () => {
      const q = questions[currentQuestionIndex];
      sendButton.disabled = q?.key !== 'phone' && chatInput.value.trim() === '';
    });

    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !sendButton.disabled) {
        sendButton.click();
      }
    });

    sendButton.addEventListener('click', () => {
      const userInputValue = chatInput.value.trim();
      const q = questions[currentQuestionIndex];

      if (chatInput.disabled) return;

      if (!userInputValue && q.key !== 'phone') {
        addMessage("Please type an answer or select an option.", 'assistant');
        return;
      }

      if (q.validate && !q.validate(userInputValue)) {
        addMessage(userInputValue, 'user');
        addMessage(q.error, 'assistant');
        chatInput.value = '';
        sendButton.disabled = true;
        chatInput.focus();
        return;
      }

      handleAnswer(userInputValue);
    });
  }

  // === Property Scoring & Results ===
  function scoreProperty(property) {
    let score = 0;
    const budget = enquiry.budget;
    const userLocation = enquiry.location ? enquiry.location.toLowerCase() : '';

    if (enquiry.type === 'seller') return 0;

    if (enquiry.type && property.type === enquiry.type) {
      score += 50;
    } else if (enquiry.type === 'investor' && property.type === 'buyer') {
      score += 10;
    }

    if (budget) {
      if (property.price <= budget) {
        score += 30;
      } else if (property.price <= budget * 1.15) {
        score += 15;
      } else if (property.price <= budget * 1.30) {
        score += 5;
      }
    }

    if (userLocation && property.location.toLowerCase().includes(userLocation)) {
      score += 20;
    } else if (userLocation && property.location.toLowerCase().includes(userLocation.split(',')[0].trim())) {
      score += 10;
    }

    return Math.min(100, Math.max(0, score));
  }

  function showResults() {
    const firstName = enquiry.name.split(' ')[0];

    if (enquiry.type === 'seller') {
      addMessage(`Thank you for providing your details, ${firstName}! We'll get in touch shortly to discuss selling your property.`, 'assistant');
      chatInput.disabled = true;
      sendButton.disabled = true;
      chatInput.placeholder = "Conversation ended.";
      console.log("Final Seller Enquiry:", enquiry);
      return;
    }

    const relevantProperties = properties.filter((p) => {
      if (p.type !== enquiry.type) return false;
      if (enquiry.budget && p.price > enquiry.budget) return false;

      return true;
    });
    const ranked = relevantProperties
      .map((p) => ({
        ...p,
        matchScore: scoreProperty(p),
      }))
      .sort((a, b) => b.matchScore - a.matchScore);

    const topMatches = ranked.slice(0, 3);

    let resultsHtml = `
      <div class="results-message">
        <h4>Here are your best matches, ${firstName}!</h4>
        <p>Based on your preferences for a ${enquiry.type === 'buyer' ? 'home to buy' : 'property to invest in'} within your budget of £${enquiry.budget?.toLocaleString()} in ${enquiry.location || 'your preferred area'}, here are some options:</p>
      </div>
      <div class="property-list">
    `;

    if (topMatches.length > 0) {
      topMatches.forEach((p) => {
        let label = 'Possible Match';
        let labelClass = 'possible-match';

        if (p.matchScore >= 80) {
          label = 'BEST MATCH';
          labelClass = 'best-match';
        } else if (p.matchScore >= 60) {
          label = 'Good Match';
          labelClass = 'good-match';
        }

        resultsHtml += `
          <div class="property-card">
            <img src="${p.image}" alt="${p.title}" class="property-image" onerror="this.onerror=null;this.src='${propertyImageFallback}';">
            <div class="property-details">
              <h5>${p.title}</h5>
              <p>${p.location}</p>
              <p>£${p.price.toLocaleString()}</p>
              <span class="match-label ${labelClass}">${label} - ${p.matchScore}%</span>
            </div>
          </div>
        `;
      });

      resultsHtml += `</div>
        <button class="chat-option-button" style="align-self: center; margin-top: 15px;" onclick="location.reload()">View All Matches</button>
      `;
    } else {
      resultsHtml += `<div class="message assistant" style="align-self: flex-start;">Apologies, but we couldn't find any properties matching your exact criteria right now. Please try adjusting your preferences or contact us directly.</div>`;
    }

    addMessage(resultsHtml, 'assistant', [], true);
    chatInput.disabled = true;
    sendButton.disabled = true;
    chatInput.placeholder = "Conversation ended.";

    console.log("Final Enquiry:", enquiry);
  }

  // === Reset Function ===
  function resetChat() {
    currentQuestionIndex = 0;
    enquiry = {};
    chatMessages.innerHTML = '';
    chatInput.value = '';
    chatInput.disabled = false;
    sendButton.disabled = true;
    chatInput.placeholder = questions[0]?.placeholder || "Type your answer...";
    chatInputArea.classList.remove('money-input');

    if (googlePlacesAutocomplete) {
      google.maps.event.clearInstanceListeners(chatInput);
      googlePlacesAutocomplete = null;
    }
  }

  // Initial setup when DOM is ready
  document.addEventListener('DOMContentLoaded', attachEventListeners);
})();
