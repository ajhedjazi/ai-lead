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
  const propertyResults = document.getElementById('property-results');

  // State Variables
  let currentQuestionIndex = 0;
  let enquiry = {};
  let googlePlacesAutocomplete = null;
  let selectedPlaceLocation = null;
  let currentAssistantIndex = 0;
  let currentAssistant = null;
  const maxMatchDistanceMiles = 25;
  const minBudgetAmount = 25000;
  const maxBudgetAmount = 5000000;
  const assistantProfiles = [
    {
      name: 'Mark',
      image: 'assets/images/mark.jpg',
      fallbackImage: 'images/mark.jpg',
      fallbackInitial: 'M',
    },
    {
      name: 'Leroy',
      image: 'assets/images/leroy.jpg',
      fallbackImage: 'images/leroy.jpg',
      fallbackInitial: 'L',
    },
  ];
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
      text: () => `Hi there! I'm ${currentAssistant.name}. What are you looking to do today?`,
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
      key: 'firstName',
      text: "Alright, we're almost ready to find your matches! What's your first name?",
      type: 'input',
      placeholder: "e.g., John",
      validate: (v) => v.trim().length > 1,
      error: "Please enter your first name.",
    },
    {
      key: 'lastName',
      text: "Thanks. And what's your last name?",
      type: 'input',
      placeholder: "e.g., Smith",
      validate: (v) => v.trim().length > 1,
      error: "Please enter your last name.",
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
      text: "And your phone number, please?",
      type: 'input',
      placeholder: "e.g., 07123 456789",
      validate: (v) => {
        const digits = String(v).replace(/\D/g, '');
        return digits.length >= 10 && digits.length <= 15;
      },
      error: "Please enter a valid phone number.",
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
      lat: 53.7676,
      lng: -0.3274,
      image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=280&q=80',
    },
    {
      id: 2,
      title: 'City Centre 2 Bed Apartment',
      price: 135000,
      type: 'investor',
      location: 'Hull City Centre',
      lat: 53.7443,
      lng: -0.3325,
      image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=280&q=80',
    },
    {
      id: 3,
      title: 'Investment Opportunity 4 Bed HMO',
      price: 220000,
      type: 'investor',
      location: 'East Hull',
      lat: 53.7598,
      lng: -0.2867,
      image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=280&q=80',
    },
    {
      id: 4,
      title: 'Starter 2 Bed Terrace',
      price: 110000,
      type: 'buyer',
      location: 'Bilton',
      lat: 53.7803,
      lng: -0.2424,
      image: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=280&q=80',
    },
    {
      id: 5,
      title: 'Spacious 4 Bed Family Home',
      price: 300000,
      type: 'buyer',
      location: 'Beverley',
      lat: 53.8425,
      lng: -0.4350,
      image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=280&q=80',
    },
    {
      id: 6,
      title: 'Studio Apartment, City Centre',
      price: 90000,
      type: 'investor',
      location: 'Hull City Centre',
      lat: 53.7443,
      lng: -0.3325,
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
      chooseAssistant();
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

  function chooseAssistant() {
    let previousIndex = currentAssistantIndex - 1;

    try {
      previousIndex = Number(localStorage.getItem('lastAssistantIndex') || '-1');
    } catch (error) {
      previousIndex = currentAssistantIndex - 1;
    }

    currentAssistantIndex = Number.isInteger(previousIndex)
      ? (previousIndex + 1) % assistantProfiles.length
      : 0;
    currentAssistant = assistantProfiles[currentAssistantIndex];

    try {
      localStorage.setItem('lastAssistantIndex', String(currentAssistantIndex));
    } catch (error) {
      // The current in-memory assistant still keeps the chat working.
    }
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

    chatMessages.appendChild(createMessageRow(messageDiv, sender));
    scrollBottom();
  }

  function createMessageRow(messageDiv, sender) {
    const messageRow = document.createElement('div');
    messageRow.classList.add('message-row', sender);

    if (sender === 'assistant') {
      messageRow.appendChild(createAssistantAvatar());
    }

    messageRow.appendChild(messageDiv);

    return messageRow;
  }

  function createAssistantAvatar() {
    const avatar = document.createElement('img');
    avatar.classList.add('assistant-avatar');
    avatar.src = currentAssistant.image;
    avatar.alt = currentAssistant.name;
    avatar.loading = 'lazy';
    avatar.dataset.fallbackTried = 'false';

    avatar.addEventListener('error', () => {
      if (avatar.dataset.fallbackTried === 'false' && currentAssistant.fallbackImage) {
        avatar.dataset.fallbackTried = 'true';
        avatar.src = currentAssistant.fallbackImage;
        return;
      }

      const fallback = document.createElement('span');
      fallback.classList.add('assistant-avatar', 'assistant-avatar-fallback');
      fallback.textContent = currentAssistant.fallbackInitial;
      fallback.setAttribute('aria-label', currentAssistant.name);
      avatar.replaceWith(fallback);
    });

    return avatar;
  }

  function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.classList.add('message', 'assistant', 'typing-indicator');
    typingDiv.innerHTML = '<span></span><span></span><span></span>';
    typingDiv.id = 'typing-indicator';
    chatMessages.appendChild(createMessageRow(typingDiv, 'assistant'));
    scrollBottom();
  }

  function removeTypingIndicator() {
    const typingDiv = document.getElementById('typing-indicator');

    if (typingDiv) {
      typingDiv.closest('.message-row')?.remove();
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

      sendButton.disabled = chatInput.value.trim() === '' && !chatInput.disabled;
    }, 700);
  }

  function handleAnswer(value, label = null, clickEvent = null) {
    const q = questions[currentQuestionIndex];

    enquiry[q.key] = q.key === 'budget'
      ? parseMoney(value)
      : q.transform ? q.transform(value) : value;

    if (q.key === 'location' && selectedPlaceLocation) {
      enquiry.locationLat = selectedPlaceLocation.lat;
      enquiry.locationLng = selectedPlaceLocation.lng;
    }

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

    selectedPlaceLocation = null;
    document.body.classList.remove('location-autocomplete-active');

    currentQuestionIndex++;
    askQuestion();
  }

  // === Google Places Autocomplete ===
  window.initMapAutocomplete = function () {
    console.log("Google Maps API and Places library loaded.");
  };

  function enableAutocomplete() {
    document.body.classList.add('location-autocomplete-active');

    if (!googlePlacesAutocomplete && window.google?.maps?.places) {
      const hullBounds = new google.maps.LatLngBounds(
        { lat: 53.70, lng: -0.50 },
        { lat: 53.85, lng: 0.00 }
      );

      googlePlacesAutocomplete = new google.maps.places.Autocomplete(chatInput, {
        types: ['geocode'],
        componentRestrictions: { country: 'uk' },
        bounds: hullBounds,
        strictBounds: false,
        fields: ['formatted_address', 'geometry'],
      });

      googlePlacesAutocomplete.addListener('place_changed', () => {
        const place = googlePlacesAutocomplete.getPlace();

        if (place?.formatted_address) {
          chatInput.value = place.formatted_address;
          sendButton.disabled = false;
        }

        if (place?.geometry?.location) {
          selectedPlaceLocation = {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          };
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

      if (q?.key === 'location') {
        selectedPlaceLocation = null;
      }

      sendButton.disabled = chatInput.value.trim() === '';
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

      if (!userInputValue) {
        addMessage("Please type an answer or select an option.", 'assistant');
        return;
      }

      if (q.key === 'budget' && !isRealisticMoneyAmount(userInputValue)) {
        addMessage(userInputValue, 'user');
        addMessage("Please enter a realistic amount between £25,000 and £5,000,000.", 'assistant');
        chatInput.value = '';
        sendButton.disabled = true;
        chatInput.focus();
        return;
      }

      if (q.key === 'budget') {
        handleAnswer(userInputValue);
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

  function parseMoney(value) {
    return parseFloat(String(value).replace(/[^0-9.]/g, ''));
  }

  function isRealisticMoneyAmount(value) {
    const amount = parseMoney(value);
    return !isNaN(amount) && amount >= minBudgetAmount && amount <= maxBudgetAmount;
  }

  // === Property Scoring & Results ===
  function scoreProperty(property) {
    let score = 0;
    const budget = enquiry.budget;

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

    if (hasSelectedLocation() && property.lat && property.lng && enquiry.locationLat && enquiry.locationLng) {
      const milesAway = getDistanceMiles(
        enquiry.locationLat,
        enquiry.locationLng,
        property.lat,
        property.lng
      );

      if (milesAway <= 5) {
        score += 20;
      } else if (milesAway <= 15) {
        score += 15;
      } else if (milesAway <= maxMatchDistanceMiles) {
        score += 10;
      }
    } else if (locationTextMatches(property)) {
      score += 15;
    }

    return Math.min(100, Math.max(0, score));
  }

  function hasSelectedLocation() {
    return Boolean(enquiry.location && String(enquiry.location).trim());
  }

  function propertyMatchesPreferredLocation(property) {
    if (!hasSelectedLocation()) return true;

    if (enquiry.locationLat && enquiry.locationLng && property.lat && property.lng) {
      return getDistanceMiles(
        enquiry.locationLat,
        enquiry.locationLng,
        property.lat,
        property.lng
      ) <= maxMatchDistanceMiles;
    }

    return locationTextMatches(property);
  }

  function locationTextMatches(property) {
    const preferredLocation = normalizeLocation(enquiry.location);
    const preferredArea = normalizeLocation(String(enquiry.location || '').split(',')[0]);
    const propertyLocation = normalizeLocation(property.location);

    if (!preferredLocation || !propertyLocation) return false;

    return propertyLocation.includes(preferredLocation)
      || propertyLocation.includes(preferredArea)
      || preferredArea.includes(propertyLocation);
  }

  function normalizeLocation(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function getDistanceMiles(startLat, startLng, endLat, endLng) {
    const earthRadiusMiles = 3958.8;
    const latDistance = toRadians(endLat - startLat);
    const lngDistance = toRadians(endLng - startLng);
    const startLatRadians = toRadians(startLat);
    const endLatRadians = toRadians(endLat);

    const haversine = Math.sin(latDistance / 2) ** 2
      + Math.cos(startLatRadians)
      * Math.cos(endLatRadians)
      * Math.sin(lngDistance / 2) ** 2;

    return 2 * earthRadiusMiles * Math.asin(Math.sqrt(haversine));
  }

  function toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  function showResults() {
    const firstName = enquiry.firstName;

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
      if (!propertyMatchesPreferredLocation(p)) return false;

      return true;
    });
    const ranked = relevantProperties
      .map((p) => ({
        ...p,
        matchScore: scoreProperty(p),
      }))
      .sort((a, b) => b.matchScore - a.matchScore);

    if (renderPageResults(ranked, firstName)) {
      closeWidget();
      scrollToPageResults();
    }

    console.log("Final Enquiry:", enquiry);
  }

  function renderPageResults(rankedProperties, firstName) {
    if (!propertyResults) return false;

    propertyResults.innerHTML = '';
    propertyResults.classList.remove('hidden');

    const heading = document.createElement('h2');
    heading.textContent = `Here are your best matches, ${firstName}!`;

    const summary = document.createElement('p');
    summary.textContent = `Based on your preferences for a ${enquiry.type === 'buyer' ? 'home to buy' : 'property to invest in'} within your budget of £${enquiry.budget?.toLocaleString()} in ${enquiry.location || 'your preferred area'}, here are the properties that fit best.`;

    propertyResults.append(heading, summary);

    if (rankedProperties.length === 0) {
      const emptyState = document.createElement('p');
      emptyState.classList.add('page-results-empty');
      emptyState.textContent = "Apologies, but we couldn't find any properties matching your exact criteria right now. Please try adjusting your preferences or contact us directly.";
      propertyResults.appendChild(emptyState);
      return true;
    }

    const propertyList = document.createElement('div');
    propertyList.classList.add('property-list');

    rankedProperties.forEach((property) => {
      propertyList.appendChild(createPropertyCard(property));
    });

    propertyResults.appendChild(propertyList);
    return true;
  }

  function scrollToPageResults() {
    history.replaceState(null, '', '#property-results');
    propertyResults.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function createPropertyCard(property) {
    const propertyCard = document.createElement('article');
    propertyCard.classList.add('property-card');

    const image = document.createElement('img');
    image.classList.add('property-image');
    image.src = property.image;
    image.alt = property.title;
    image.addEventListener('error', () => {
      image.src = propertyImageFallback;
    }, { once: true });

    const details = document.createElement('div');
    details.classList.add('property-details');

    const title = document.createElement('h5');
    title.textContent = property.title;

    const location = document.createElement('p');
    location.textContent = property.location;

    const price = document.createElement('p');
    price.textContent = `£${property.price.toLocaleString()}`;

    const matchLabel = document.createElement('span');
    const label = getMatchLabel(property.matchScore);
    matchLabel.classList.add('match-label', label.className);
    matchLabel.textContent = `${label.text} - ${property.matchScore}%`;

    details.append(title, location, price, matchLabel);
    propertyCard.append(image, details);

    return propertyCard;
  }

  function getMatchLabel(matchScore) {
    if (matchScore >= 80) {
      return { text: 'BEST MATCH', className: 'best-match' };
    }

    if (matchScore >= 60) {
      return { text: 'Good Match', className: 'good-match' };
    }

    return { text: 'Possible Match', className: 'possible-match' };
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
    document.body.classList.remove('location-autocomplete-active');

    if (googlePlacesAutocomplete) {
      google.maps.event.clearInstanceListeners(chatInput);
      googlePlacesAutocomplete = null;
    }

    selectedPlaceLocation = null;
  }

  // Initial setup when DOM is ready
  document.addEventListener('DOMContentLoaded', attachEventListeners);
})();
