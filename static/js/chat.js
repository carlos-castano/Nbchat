let isChatExpanded = false;
let activeChatTab = 'general';
let chatTabs = {
    'general': { title: 'Chat', messages: [], context: '', inputText: '' }
};
let isWaitingForResponse = false;
let isResizing = false;
let chatButton, chatContainer, chatResizer, chatInput, notebookContainer, 
    expandCollapseButton, expandCollapseContainer, chatTabsContainer;
let minChatWidth, maxChatWidth;
let lastChatWidth = 0;
let currentModel = "gpt-4o-mini"; // Change this value to set the initial default model (if new models are added please add them at html, see:"model-options")
let temperature = 0.3; // Change this value to set the initial default temperature
let switchModelButton;
let modelOptions;
let previousWindowWidth = window.innerWidth;
let previousWindowHeight = window.innerHeight;
let baseButtonSeparation = 10;
let currentZoomLevel = 1;
let messageWidthSlider;
let lastSliderValue = 15;
let stopButton;
let controller;
let intervalId;

// initialize chat used in DOM
function initChat() {
    chatButton = document.getElementById('chat-button');
    chatContainer = document.getElementById('chat-container');
    chatResizer = document.getElementById('chat-resizer');
    chatInput = document.getElementById('chat-input');
    notebookContainer = document.getElementById('notebook-container');
    expandCollapseButton = document.getElementById('expand-collapse-button');
    expandCollapseContainer = document.getElementById('expand-collapse-container');
    chatTabsContainer = document.getElementById('chat-tabs');
    switchModelButton = document.getElementById('switch-model-button');
    modelOptions = document.getElementById('model-options');
    generalButtons = document.getElementById('general-buttons');
    modelContainer = document.getElementById('model-container');
    tempContainer = document.getElementById('temperature-control');
    tempInput = document.getElementById('temperature-value');
    tempIncrease = document.getElementById('temp-increase');
    tempDecrease = document.getElementById('temp-decrease');

    // Creates the button to stop API response
    stopButton = document.createElement('button');
    stopButton.innerHTML = '◼';
    stopButton.id = 'stop-button';
    stopButton.title = 'Stop API response';
    stopButton.style.display = 'none';
    stopButton.onclick = stopApiResponse;
    document.body.appendChild(stopButton);

    // All this block is used to create the slider for the message width
    messageWidthSlider = document.createElement('input');
    messageWidthSlider.type = 'range';
    messageWidthSlider.min = 0;
    messageWidthSlider.max = 30;
    messageWidthSlider.value = lastSliderValue;
    messageWidthSlider.id = 'message-width-slider';
    messageWidthSlider.style.display = 'none';
    document.body.appendChild(messageWidthSlider);
    const sliderContainer = document.createElement('div');
    sliderContainer.id = 'slider-container';
    sliderContainer.appendChild(messageWidthSlider);
    const widthNotification = document.createElement('div');
    widthNotification.className = 'width-notification';
    widthNotification.style.display = 'none';
    sliderContainer.appendChild(widthNotification);
    const sliderLabels = document.createElement('div');
    sliderLabels.className = 'slider-labels';
    sliderLabels.innerHTML = '<span class="label-minus">-</span><span class="label-width">Width</span><span class="label-plus">+</span>';
    sliderLabels.style.display = 'none'; 
    sliderContainer.appendChild(sliderLabels);
    document.body.appendChild(sliderContainer);

    // if an option (specific model) is clicked, the model is selected
    const modelOptionElements = document.querySelectorAll('.model-option');
    modelOptionElements.forEach(option => {
        option.addEventListener('click', (e) => {
            selectModel(e.target.dataset.model);
        });
    });

    modelContainer.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // updates temperature (buttons: +, -)
    tempInput.addEventListener('input', (e) => {
        updateTemperature(e.target);
    });

    minChatWidth = window.innerWidth * 0.27;
    maxChatWidth = window.innerWidth * 0.55;

    // Adds all the event listeners (hard to undersantd here, all the logic is in the functions)
    chatButton.addEventListener('mouseover', updateChatButtonTitle);
    chatButton.addEventListener('click', toggleChat);
    document.addEventListener('keydown', handleKeyToggleChat);
    expandCollapseButton.addEventListener('mouseover', updateExpandCollapseButtonTitle);
    chatResizer.addEventListener('mousedown', startResizing);
    switchModelButton.addEventListener('click', toggleModelOptions);
    document.addEventListener('click', closeModelOptions);
    switchModelButton.addEventListener('mouseover', updateModelButtonTitle);
    expandCollapseButton.addEventListener('click', toggleExpand);
    document.addEventListener('keydown', handleKeyExpandChat);
    chatInput.addEventListener('keydown', handleChatInputKeydown);
    messageWidthSlider.addEventListener('input', updateMessageWidth);
    messageWidthSlider.addEventListener('mouseenter', showWidthNotification);
    messageWidthSlider.addEventListener('mouseleave', hideWidthNotification);
    document.addEventListener('click', handleAiButtonClick);
    window.addEventListener('resize', handleResize);

    tempIncrease.addEventListener('mousedown', () => handleTempButtonPress(0.1));
    tempIncrease.addEventListener('mouseup', handleTempButtonRelease);
    tempIncrease.addEventListener('mouseleave', handleTempButtonRelease);

    tempDecrease.addEventListener('mousedown', () => handleTempButtonPress(-0.1));
    tempDecrease.addEventListener('mouseup', handleTempButtonRelease);
    tempDecrease.addEventListener('mouseleave', handleTempButtonRelease);

    handleResize();
    updateChatTabs();
    updateChatInput();
    updateExpandCollapseButton();
    updateButtonSpacing();
    selectModel(currentModel, firstTime=true);
    updateTemperature(temperature);
}

// Let's start with temperature functions, this one is used to update visual values and send the new temperature (server function)
function updateTemperature(newTemperature) {
    // if we don't get a possible value, return
    if (newTemperature < 0 || newTemperature > 2) {
        return;
    }
    // It's necessary to round the number to avoid errors
    // displaying and pass this value to the server as float
    newTemperature = parseFloat(newTemperature).toFixed(1);
    tempInput.value = newTemperature;
    temperature = parseFloat(newTemperature);

    let color = calculateColor(temperature);
    tempInput.style.backgroundColor = color;

    // Del this lines if you want to avoid warnings
    if (!isChatExpanded && newTemperature > 0.8) {
        showNotificationModel(`Be careful! Values higer than 1 can lead to erratic model outputs.
            Temperature is a randomness parameter.
            In this scenario, values between 0 and 0.8 are recommended.`, tempContainer ,'left', 5000);
    } else if (isChatExpanded && newTemperature > 0.8) {
        showNotificationModel(`Be careful! Values higer than 1 can lead to erratic model outputs.
            Temperature is a randomness parameter.
            In this scenario, values between 0 and 0.8 are recommended.`, tempContainer, 'right', 5000);
    }
    // keep this one to update the temperature
    sendTemperatureToServer(temperature);
}

// Change this values to update the temperature value background color
function calculateColor(temperature) {
    const blue = { r: 54, g: 89, b: 200 }; // #3659c8
    const gray = { r: 58, g: 58, b: 58 };  // #3a3a3a
    const red = { r: 200, g: 54, b: 54 };  // #c83636
    let r, g, b;

    if (temperature <= 1) {
        r = interpolate(blue.r, gray.r, temperature);
        g = interpolate(blue.g, gray.g, temperature);
        b = interpolate(blue.b, gray.b, temperature);
    } else {
        r = interpolate(gray.r, red.r, temperature - 1);
        g = interpolate(gray.g, red.g, temperature - 1);
        b = interpolate(gray.b, red.b, temperature - 1);
    }   

    return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

function interpolate(start, end, factor) {
    return start + (end - start) * factor;
}

// Manages the velocity of the temperature change
function handleTempButtonPress(increment) {
    updateTemperature((parseFloat(tempInput.value) + increment));
    intervalId = setInterval(() => {
        updateTemperature((parseFloat(tempInput.value) + increment));
    }, 150);
}

// If user releases the button, stop the interval
function handleTempButtonRelease() {
    clearInterval(intervalId);
}

// Send the temperature to the server
function sendTemperatureToServer(temperature) {
    fetch('/update_temperature', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ temperature: temperature }),
    })
    .then(response => response.json())
}

// Now lets see the model selection functions, next 2 are used to show and hide this options
function toggleModelOptions(e) {
    e.stopPropagation();
    modelContainer.style.display = modelContainer.style.display === 'block' ? 'none' : 'block';
}

function closeModelOptions(e) {
    if (!switchModelButton.contains(e.target) && !modelContainer.contains(e.target)) {
        modelContainer.style.display = 'none';
    }
}

// In order to avoid notifications at first call, firstTime=false is added
function selectModel(model, firstTime = false) {
    currentModel = model;
    updateModelSelection();
    updateModelOnServer(firstTime);
}

// Updates the visual selection
function updateModelSelection() {
    const options = document.querySelectorAll('.model-option');
    options.forEach(option => {
        if (option.dataset.model === currentModel) {
            option.classList.add('active');
        } else {
            option.classList.remove('active');
        }
    });
}

// Send model selected to server and show a notification
function updateModelOnServer(firstTime=false) {
    fetch('/update_model', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model: currentModel }),
    })
    .then(response => response.json())
    .then(data => {
        if (firstTime) {
            return;
        } else {
            if (!isChatExpanded) {
                showNotificationModel(`Active model: ${currentModel}`, switchModelButton, 'left', 2000);
            } else {
                showNotificationModel(`Active model: ${currentModel}`, switchModelButton, 'right', 2000);
            }
        }
    })
    .catch((error) => {
        if (!isChatExpanded) {
            showNotificationModel('Error updating model', switchModelButton, 'left', 2000);
        } else {
            showNotificationModel('Error updating model', switchModelButton, 'right', 2000);
        }
    });
}

function updateModelButtonTitle() {
    if (switchModelButton) {
        switchModelButton.title = `Switch model (current: ${currentModel})`;
        // tempConainer none to avoid switchModelButton title
        tempContainer.title = '';
    }
}

// Functions to resize the width of the messages
function updateMessageWidth() {
    const sliderValue = parseInt(messageWidthSlider.value);
    lastSliderValue = sliderValue;
    // Real width is between 20% and 80%, as arbitrary scale i mapped from 0 to 30
    const actualWidth = 20 + (sliderValue * 2);
    document.documentElement.style.setProperty('--message-width', `${actualWidth}%`);
    updateWidthNotification(sliderValue);
}

// User should see the currente value while scrolling the bar
function showWidthNotification() {
    const widthNotification = document.querySelector('.width-notification');
    widthNotification.style.display = 'block';
    updateWidthNotification(parseInt(messageWidthSlider.value));
}

function hideWidthNotification() {
    const widthNotification = document.querySelector('.width-notification');
    widthNotification.style.display = 'none';
}

function updateWidthNotification(value) {
    const widthNotification = document.querySelector('.width-notification');
    widthNotification.textContent = `Width: ${value}/30`;
}

function updateSliderLabelsVisibility() {
    const sliderLabels = document.querySelector('.slider-labels');
    if (sliderLabels) {
        // only show this option when chat is expanded, when it's not, chat is to small to reduce width below 80%
        sliderLabels.style.display = isChatExpanded ? 'flex' : 'none';
    }
}

// This one probably could be written in html and css, but it's here :)
function positionMessageWidthSlider() {
    const chatTabs = document.getElementById('chat-tabs');
    const chatTabsRect = chatTabs.getBoundingClientRect();
    const sliderContainer = document.getElementById('slider-container');
    
    sliderContainer.style.position = 'fixed';
    sliderContainer.style.top = `${chatTabsRect.bottom + 10}px`;
    sliderContainer.style.right = '20px';
    sliderContainer.style.width = '100px';
    sliderContainer.style.zIndex = '1000';
}

// In order to avoid some problems when resizing the window, this function keeps some buttons at the right position
function handleResize() {
    const currentWindowWidth = window.innerWidth;
    const currentWindowHeight = window.innerHeight;

    // If there is a significant change in the window size...
    if (Math.abs(currentWindowWidth - previousWindowWidth) > 5 ||
        Math.abs(currentWindowHeight - previousWindowHeight) > 5) {
        
        previousWindowWidth = currentWindowWidth;
        previousWindowHeight = currentWindowHeight;

        // Update values and avoid visual bugs
        minChatWidth = window.innerWidth * 0.27;
        maxChatWidth = window.innerWidth * 0.55;

        if (chatContainer.classList.contains('visible')) {
            if (isChatExpanded) {
                positionMessageWidthSlider();
                expandChat();
            } else {
                collapseChat();
            }
        }

        adjustExpandCollapseButtonPosition();
        updateButtonSpacing();
        if (stopButton.style.display !== 'none') {
            updateStopButton(true);
        }
    }
}

// This function is implemented to keep vertical distance between buttons as user zooms in or out
function updateButtonSpacing() {
    
    currentZoomLevel = window.devicePixelRatio;
    const newSeparation = baseButtonSeparation * currentZoomLevel;
    
    if (chatButton && switchModelButton) {
        const chatButtonRect = chatButton.getBoundingClientRect();
        switchModelButton.style.top = `${chatButtonRect.bottom + newSeparation}px`;
        const switchModelButtonRect = switchModelButton.getBoundingClientRect();
        modelContainer.style.top = `${switchModelButtonRect.bottom + newSeparation}px`;
    }

    if (isChatExpanded) {
        const menuButton = document.getElementById('menu-button');
        const menuButtonRect = menuButton.getBoundingClientRect();
        chatButton.style.top = `${menuButtonRect.top}px`;
        chatTabsContainer.style.top = `${menuButtonRect.top}px`;
    }
}

// updateLayout is used to center notebook in so many situations (chat could be resized, expanded, collapsed, etc)
function updateLayout() {
    const windowWidth = window.innerWidth;
    const scrollbarWidth = windowWidth - document.documentElement.clientWidth;
    const chatWidth = chatContainer.offsetWidth;
    const constantMargin = 50;
    const availableSpace = (windowWidth - scrollbarWidth) - chatWidth - (constantMargin * 2);
    const notebookWidth = availableSpace * 0.95;
    const leftMargin = (availableSpace - notebookWidth) / 2 + constantMargin;
    
    notebookContainer.style.width = `${notebookWidth}px`;
    notebookContainer.style.marginLeft = `${leftMargin - 40}px`;
    notebookContainer.style.marginRight = `${chatWidth + constantMargin}px`;
}

function showNotificationModel(message, element, position, time) {
    const notification = document.createElement('div');
    notification.style.position = 'fixed';
    notification.style.padding = '5px 10px';
    notification.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    notification.style.color = 'white';
    notification.style.borderRadius = '5px';
    notification.style.zIndex = '100000';
    notification.style.visibility = 'hidden';
    notification.innerText = message;
    document.body.appendChild(notification);
    const rect = element.getBoundingClientRect();
    const notificationHeight = notification.offsetHeight;
    notification.style.top = `${rect.top + rect.height / 2 - notificationHeight / 2}px`;

    if (position === 'left') {
        notification.style.left = `${rect.left - notification.offsetWidth - 5}px`;
    } else if (position === 'right') {
        notification.style.left = `${rect.right + 5}px`;
    }

    notification.style.visibility = 'visible';
    setTimeout(() => {
        document.body.removeChild(notification);
    }, time);
}

// Functionality of chat button to toggle chat
function showChat() {
    if (chatContainer && chatButton && expandCollapseContainer && switchModelButton) {
        chatContainer.classList.remove('hidden');
        chatContainer.classList.add('visible');
        
        // It's necessary to calculate the width of the chat container using scrollbar width to avoid visual bugs
        let scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        const adjustedWidth = chatContainer.offsetWidth + (scrollbarWidth);

        // Keep the distance between chat-container and everything else at the right side
        chatContainer.style.width = `${adjustedWidth}px`;
        chatButton.style.right = `${adjustedWidth + 10}px`;
        switchModelButton.style.right = `${adjustedWidth + 10}px`;
        modelContainer.style.right = `${adjustedWidth + 10}px`;
        updateLayout();
        // As chat is shown, expand-button should be visible
        expandCollapseContainer.style.display = 'block';
        expandCollapseContainer.style.right = `${adjustedWidth + 10}px`;
        updateExpandCollapseButton();
        // If users get the chat expanded when used hideChat, then if this function is call, show it expanded
        if (chatContainer.offsetWidth > (window.innerWidth - scrollbarWidth) * 0.9) {
            expandChat();
            isChatExpanded = !isChatExpanded;
            updateSliderLabelsVisibility();
        }
    }
    // Focus on chat input
    chatInput = document.getElementById('chat-input');
    chatInput.focus();  
}

// hideChat does the opposite of showChat, all values are set considering de css, take care changing them
function hideChat() {
    if (chatContainer && chatButton && notebookContainer && expandCollapseContainer && switchModelButton) {
        chatContainer.classList.add('hidden');
        chatContainer.classList.remove('visible');

        const buttonPosition = '1%';
        chatButton.style.right = buttonPosition;
        chatButton.style.left = 'auto';
        switchModelButton.style.right = buttonPosition;
        switchModelButton.style.left = 'auto';
        modelContainer.style.right = buttonPosition;
        modelContainer.style.left = 'auto';

        expandCollapseContainer.style.display = 'none';

        notebookContainer.style.width = '70%';
        notebookContainer.style.marginLeft = '15%';
        notebookContainer.style.marginRight = '15%';

        generalButtons.style.display = 'flex';
        isChatExpanded = false;

        messageWidthSlider.style.display = 'none';
        updateSliderLabelsVisibility();
    }
}

function toggleChat() {
    if (chatContainer) {
        if (chatContainer.classList.contains('hidden')) {
            showChat();
        } else {
            hideChat();
        }
    }
}

function handleKeyToggleChat(event) {
    if (event.ctrlKey && event.key === 's') {
        event.preventDefault();
        toggleChat();
    }
}

function updateChatButtonTitle() {
    if (chatButton && chatContainer) {
        chatButton.title = chatContainer.classList.contains('hidden') ? 'Show chat (ctrl+s)' : 'Hide chat (ctrl+s)';
    }
}

// Users can resize the chat while holding the mouse on chat-resizer
function resizeChat(e) {
    if (isResizing && chatContainer && chatButton && expandCollapseContainer && switchModelButton) {
        requestAnimationFrame(() => {
            const windowWidth = window.innerWidth;
            const newChatWidth = Math.max(minChatWidth, Math.min(maxChatWidth, windowWidth - e.clientX));
            // As it moves, recalculate the chat-container and move all the right-side buttons
            chatContainer.style.width = `${newChatWidth}px`;
            chatButton.style.right = `${newChatWidth + 10}px`;
            switchModelButton.style.right = `${newChatWidth + 10}px`;
            modelContainer.style.right = `${newChatWidth + 10}px`;
            expandCollapseContainer.style.right = `${newChatWidth + 10}px`;
            updateLayout();
        });
    }
}

function startResizing(e) {
    isResizing = true;
    document.addEventListener('mousemove', resizeChat);
    document.addEventListener('mouseup', stopResizing);
}

function stopResizing() {
    isResizing = false;
    document.removeEventListener('mousemove', resizeChat);
    document.removeEventListener('mouseup', stopResizing);
}

// Next ones are implemented to expand or collapse chat-container
function expandChat() {
    if (chatContainer && notebookContainer && chatButton && expandCollapseContainer && 
        chatTabsContainer && expandCollapseButton && chatResizer && switchModelButton) {
        
        // This "if" is to prevent the assignment of lastChatWidth when the chat is already expanded
        // That variable is used on expandChat, just ignore it
        if (chatContainer.offsetWidth < (window.innerWidth - window.innerWidth * 0.2)) {
            lastChatWidth = chatContainer.offsetWidth;
        }
        
        // Expand chat based on window width and scrollbar width
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        chatContainer.style.width = '100%';
        notebookContainer.style.marginRight = '0px';

        // Now, reconsider buttons position and chat tabs
        const assignChatButtonLeft = document.getElementById('menu-button').getBoundingClientRect().right + 15 - (scrollbarWidth * 0.1);
        const assignChatButtonTop = document.getElementById('menu-button').getBoundingClientRect().top;
        chatButton.style.left = `${assignChatButtonLeft}px`;
        chatButton.style.top = `${assignChatButtonTop}px`;
        switchModelButton.style.left = `${assignChatButtonLeft}px`;
        modelContainer.style.left = `${assignChatButtonLeft - 50}px`;
        const assignExpandCollapseContainerLeft = document.getElementById('menu-button').getBoundingClientRect().top - 10 - (scrollbarWidth * 0.1);
        expandCollapseContainer.style.left = `${assignExpandCollapseContainerLeft}px`;
        const assignChatTabsContainerLeft = document.getElementById('chat-button').getBoundingClientRect().right + 15 - (scrollbarWidth * 0.1);
        chatTabsContainer.style.marginLeft = `${assignChatTabsContainerLeft}px`;
        chatTabsContainer.style.marginTop = `${assignChatButtonTop - 2}px`;

        // Hide the resizer and other buttons, rotating the expand-collapse button so user understands that next click will collapse
        expandCollapseButton.style.transform = 'rotate(180deg)';
        chatResizer.style.display = 'none';
        generalButtons.style.display = 'none';
        expandCollapseContainer.style.display = 'block';
        updateButtonSpacing();
        // Show width slider and its labels as explained before
        messageWidthSlider.style.display = 'block';
        updateSliderLabelsVisibility();
        document.documentElement.style.setProperty('--message-width', `${20 + (lastSliderValue * 2)}%`);
    }
}

// Collapse do the opposite of expand, but considering the last width of the chat-container based
// on the lastChatWidth variable set by the user
function collapseChat() {
    if (chatContainer && notebookContainer && chatButton && expandCollapseContainer && 
        chatTabsContainer && expandCollapseButton && chatResizer && switchModelButton) {

        chatContainer.style.width = `${lastChatWidth}px`;
        chatContainer.style.right = '0';
        chatContainer.style.left = 'auto';

        const buttonPosition = lastChatWidth + 10;
        chatButton.style.right = `${buttonPosition}px`;
        chatButton.style.left = 'auto';
        switchModelButton.style.right = `${buttonPosition}px`;
        switchModelButton.style.left = 'auto';
        modelContainer.style.right = `${buttonPosition}px`;
        modelContainer.style.left = 'auto';
        expandCollapseContainer.style.right = `${buttonPosition}px`;
        expandCollapseContainer.style.left = 'auto';

        // Restart positions and visibility
        chatTabsContainer.style.marginLeft = '0';
        chatTabsContainer.style.marginTop = '0';
        expandCollapseButton.style.transform = 'rotate(0deg)';
        chatResizer.style.display = 'block';
        generalButtons.style.display = 'flex';

        updateLayout();
        messageWidthSlider.style.display = 'none';
        updateSliderLabelsVisibility();
        document.documentElement.style.setProperty('--message-width', '80%');
    }
}

function updateExpandCollapseButtonTitle() {
    if (expandCollapseButton) {
        expandCollapseButton.title = isChatExpanded ? 'Reduce chat (ctrl+right arrow)' : 'Expand chat (ctrl+left arrow)';
    }
}

function toggleExpand() {
    if (isChatExpanded) {
        collapseChat();
    } else {
        expandChat();
    }
    isChatExpanded = !isChatExpanded;
    adjustExpandCollapseButtonPosition();

    messageWidthSlider.style.display = isChatExpanded ? 'block' : 'none';
    document.querySelector('.slider-labels').style.display = isChatExpanded ? 'flex' : 'none';
    if (isChatExpanded) {
        positionMessageWidthSlider();
    }
}

// When chat is expanded, stopButton and expandCollapseButton are above the chat-input, so we have to move them
// as input grows or shrinks. Also stopButton is set at left side (same as expandCollapseButton)
function adjustExpandCollapseButtonPosition() {
    const chatInput = document.getElementById('chat-input');
    const expandCollapseContainer = document.getElementById('expand-collapse-container');
    const offsetBottom = chatInput.offsetHeight + 20;
    if (isChatExpanded) {
        expandCollapseContainer.style.bottom = `${offsetBottom}px`;
    } else {
        expandCollapseContainer.style.bottom = '30px';
    }

    if (stopButton.style.display !== 'none') {
        const rect = expandCollapseContainer.getBoundingClientRect();
        stopButton.style.left = `${rect.left}px`;
        stopButton.style.top = `${rect.top - 40}px`;
    }
}

function updateExpandCollapseButton() {
    if (expandCollapseButton && chatContainer) {
        expandCollapseButton.style.display = chatContainer.classList.contains('visible') ? 'block' : 'none';
    }
}

function handleKeyExpandChat(event) {
    // as some times user uses ctrl+ any arrow to move between words, this exception is added
    if (
        event.ctrlKey && 
        event.key === 'ArrowLeft' && 
        !isChatExpanded &&
        chatContainer.classList.contains('visible') &&
        (document.activeElement !== chatInput || chatInput.value.length === 0) &&
        !document.querySelector('.cell-content').matches(':focus') &&
        !document.querySelector('.edit-textarea').matches(':focus')
    ) {
        toggleExpand();
    } else if (
        event.ctrlKey && 
        event.key === 'ArrowRight' && 
        isChatExpanded &&
        chatContainer.classList.contains('visible') &&
        (document.activeElement !== chatInput || chatInput.value.length === 0) &&
        !document.querySelector('.cell-content').matches(':focus') &&
        !document.querySelector('.edit-textarea').matches(':focus')
    ) {
        toggleExpand();
    }
}

// This is used only when ai-button (chat button beside each cell) is clicked to return just that cell content when sending a message
function getCellContext(cellIndex) {
    const cell = document.querySelectorAll('.cell')[cellIndex];
    return cell ? cell.querySelector('.cell-content').value : '';
}

// Otherway, when user sends a message, it returns all the cells content using green cells (cell-cover), this is called on sendMessage
function getGeneralContext() {
    const cells = document.querySelectorAll('.cell');
    let context = '';
    cells.forEach((cell, index) => {
        if (!cell.querySelector('.cell-cover').classList.contains('red')) {
            context += `[${index}] ${cell.querySelector('.cell-content').value}\n\n`;
        }
    });
    return context;
}

// When ai-button is clicked (handleAiButtonClick()) creates the tab with none messages,
// shows chat so user gets feedback and creates the context sent in the future
function addChatTab(cellIndex) {
    const tabId = `cell-${cellIndex}`;
    if (!chatTabs[tabId]) {
        chatTabs[tabId] = {
            title: `Cell [${cellIndex}]`,
            messages: [],
            context: getCellContext(cellIndex)
        };
        updateChatTabs();
    }
    switchToTab(tabId);
}

function handleAiButtonClick(event) {
    if (event.target.classList.contains('ai-button')) {
        const cellContainer = event.target.closest('.cell-container');
        if (cellContainer) {
            const cellIndex = Array.from(cellContainer.parentNode.children).indexOf(cellContainer);
            addChatTab(cellIndex);
            showChat();
        }
    }
}

// As chat tabs are created (in id="chat-tabs"), we could differentiate between general (can't remove) and unique cell tabs
// in any case, the new selecction should be "active" so user gets feedback
function updateChatTabs() {
    const tabsContainer = document.getElementById('chat-tabs');
    tabsContainer.innerHTML = '';
    Object.keys(chatTabs).forEach(tabId => {
        const tab = document.createElement('div');
        tab.className = 'chat-tab';
        // activeChatTab is set at switchToTab
        if (tabId === activeChatTab) tab.classList.add('active');
        
        const tabTitle = document.createElement('span');
        tabTitle.textContent = chatTabs[tabId].title;
        tabTitle.onclick = () => switchToTab(tabId);
        tab.appendChild(tabTitle);

        if (tabId !== 'general') {
            const closeButton = document.createElement('span');
            closeButton.className = 'close-tab';
            closeButton.textContent = '✖';
            closeButton.onclick = (e) => {
                e.stopPropagation();
                closeTab(tabId);
            };
            tab.appendChild(closeButton);
        }

        tabsContainer.appendChild(tab);
    });
}

// if we cloase a tab, get back to general, if undo redo is wanted, add it before delete
function closeTab(tabId) {
    delete chatTabs[tabId];
    if (activeChatTab === tabId) {
        activeChatTab = 'general';
    }
    updateChatTabs();
    updateChatMessages();
    updateChatInput();
}

function updateChatMessages() {
    const chatMessages = document.getElementById('chat-messages');
    chatMessages.innerHTML = '';
    chatTabs[activeChatTab].messages.forEach(message => {
        addMessage(message.type, message.content);
    });
}


function switchToTab(tabId) {
    // We have to differentiate between current input when chatting in one tab and get a new input when switching to another
    // This is functionality is implemented at updateChatInput()
    const currentInput = document.getElementById('chat-input');
    if (currentInput) {
        chatTabs[activeChatTab].inputText = currentInput.value;
    }
    activeChatTab = tabId;
    updateChatTabs();
    
    // It's necessary to update the chat messages
    const chatMessages = document.getElementById('chat-messages');
    chatMessages.innerHTML = '';
    
    chatTabs[activeChatTab].messages.forEach(message => {
        const messageElement = createMessageElement(message);
        chatMessages.appendChild(messageElement);
    });
    
    updateChatInput();
    applyCodeHighlightingAndCopyFunctionality();
}

function updateChatInput() {
    // As this is called when switching tabs or closing...
    const chatInputContainer = document.getElementById('chat-input-container');
    chatInputContainer.innerHTML = '';
    const chatInput = document.createElement('textarea');
    chatInput.id = 'chat-input';
    chatInput.placeholder = 'Type your message...';
    chatInput.rows = 1;
    // keep the input or create a new one blank
    chatInput.value = chatTabs[activeChatTab].inputText || '';

    function adjustChatInputHeight() {
        // input could increase its height when user types a lot of text (lines)
        chatInput.style.height = 'auto';
        chatInput.style.height = `${chatInput.scrollHeight}px`;
        // if it's expanded, expand-collapse button is above the input, so this call is necessary
        adjustExpandCollapseButtonPosition();
    }

    chatInput.addEventListener('input', adjustChatInputHeight);
    // Send message when users press Enter
    chatInput.addEventListener('keydown', function(event) {
        if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey) {
            event.preventDefault();
            sendMessage();
        }
    });
    chatInputContainer.appendChild(chatInput);
    adjustChatInputHeight();
}

// Now lets see a loot of functions to manage messages, edit, retry, etc

// createMessageElement adds a message type (user, api) and appends svg editButton if it's a user message
// or retryButton if it's an api message, including the listeners of each one
// This function is similar (in code) to addMessage, but used to load messages when switching tabs
function createMessageElement(message) {
    const messageContainer = document.createElement('div');
    messageContainer.classList.add('message-container');
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', message.type);
    messageElement.dataset.messageId = message.id;
    
    if (message.type === 'user') {
        fetch('static/svg/edit-svgrepo-com.svg')
            .then(response => response.text())
            .then(svgContent => {
                const editButton = document.createElement('div');
                editButton.innerHTML = svgContent;
                editButton.className = 'edit-button';
                editButton.title = 'Edit';
                editButton.style.cursor = 'pointer';
                editButton.onclick = () => editMessage(message.id);
                messageElement.appendChild(editButton);
            })
        }

    const contentElement = document.createElement('div');
    contentElement.className = 'message-content';
    contentElement.innerHTML = message.content;
    messageElement.appendChild(contentElement);

    if (message.type === 'api') {
        const retryButton = document.createElement('div');
        retryButton.innerHTML = '⟳';
        retryButton.className = 'retry-button';
        retryButton.title = 'Retry';
        retryButton.style.cursor = 'pointer';
        retryButton.style.color = 'white';
        retryButton.style.backgroundColor = 'transparent';
        retryButton.onclick = () => retryMessage(message.id);
        messageElement.appendChild(retryButton);
    }
    
    messageContainer.appendChild(messageElement);
    return messageElement;
}

// When a message is added, it's a must do it at last position
function updateMessageInChat(messageId, newContent) {
    const messageIndex = chatTabs[activeChatTab].messages.findIndex(m => m.id === messageId);
    if (messageIndex !== -1) {
        chatTabs[activeChatTab].messages[messageIndex].content = newContent;
    }
}

// But if retry or edit is used, then we have to remove the subsequent messages
function removeSubsequentMessages(messageId) {
    const messageIndex = chatTabs[activeChatTab].messages.findIndex(m => m.id === messageId);
    if (messageIndex !== -1) {
        chatTabs[activeChatTab].messages = chatTabs[activeChatTab].messages.slice(0, messageIndex + 1);
        const chatMessages = document.getElementById('chat-messages');
        const messages = chatMessages.querySelectorAll('.message');
        for (let i = messageIndex + 1; i < messages.length; i++) {
            chatMessages.removeChild(messages[i]);
        }
    }
}

function retryMessage(messageId) {
    // if message is in stream, wait (sendMessage() value) and return/do nothing
    if (isWaitingForResponse) {
        return;
    }
    // Otherwise, remove the message and call sendMessage with same input
    const messageIndex = chatTabs[activeChatTab].messages.findIndex(m => m.id === messageId);
    if (messageIndex !== -1) {
        const userMessageIndex = messageIndex - 1;
        if (userMessageIndex >= 0 && chatTabs[activeChatTab].messages[userMessageIndex].type === 'user') {
            chatTabs[activeChatTab].messages.splice(messageIndex, 1);
            const apiMessageElement = document.querySelector(`.message[data-message-id="${messageId}"]`);
            if (apiMessageElement) {
                apiMessageElement.remove();
            }
            removeSubsequentMessages(chatTabs[activeChatTab].messages[userMessageIndex].id);
            sendMessage(chatTabs[activeChatTab].messages[userMessageIndex].content, true);
        }
    }
}

function editMessage(messageId) {
    const messageElement = document.querySelector(`.message[data-message-id="${messageId}"]`);
    const contentElement = messageElement.querySelector('.message-content');
    const originalContent = contentElement.textContent;
    
    // Loads necessary html
    contentElement.innerHTML = `
        <textarea class="edit-textarea">${originalContent}</textarea>
        <div class="edit-buttons">
            <button class="cancel-edit">Cancel</button>
            <button class="send-edit">Send</button>
        </div>
    `;
    
    // Focus on textarea and set cursor at the end
    const textarea = contentElement.querySelector('.edit-textarea');
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    // Same input height management
    function adjustEditInputHeight() {
        textarea.style.height = 'fit-content';
        textarea.style.height = `${textarea.scrollHeight}px`;
    }

    textarea.addEventListener('input', adjustEditInputHeight);
    
    contentElement.querySelector('.cancel-edit').onclick = () => {
        contentElement.innerHTML = originalContent;
    };
    // And if it's not empty, updates at right position
    contentElement.querySelector('.send-edit').onclick = () => {
        const newContent = textarea.value.trim();
        if (newContent === "") {
            return;
        }
        contentElement.innerHTML = escapeHtml(newContent);
        updateMessageInChat(messageId, newContent);
        
        const nextMessage = messageElement.nextElementSibling;
        if (nextMessage && nextMessage.classList.contains('api')) {
            nextMessage.remove();
            const apiMessageId = nextMessage.dataset.messageId;
            const apiMessageIndex = chatTabs[activeChatTab].messages.findIndex(m => m.id === parseInt(apiMessageId));
            if (apiMessageIndex !== -1) {
                chatTabs[activeChatTab].messages.splice(apiMessageIndex, 1);
            }
        }
        removeSubsequentMessages(messageId);
        sendMessage(newContent, true);
    };
}

// This function is used to adding messages at chat-messages container
function addMessage(type, content) {
    // creates an id for each message
    const messageId = Date.now();
    // and adds it to the chatTabs object
    chatTabs[activeChatTab].messages.push({type, content, id: messageId});
    
    const chatMessages = document.getElementById('chat-messages');
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', type);
    messageElement.dataset.messageId = messageId;
    
    if (type === 'user') {
        fetch('static/svg/edit-svgrepo-com.svg')
            .then(response => response.text())
            .then(svgContent => {
                const editButton = document.createElement('div');
                editButton.innerHTML = svgContent;
                editButton.className = 'edit-button';
                editButton.title = 'Edit';
                editButton.style.cursor = 'pointer';
                editButton.onclick = () => editMessage(messageId);
                messageElement.appendChild(editButton);
            });
    }
    
    const contentElement = document.createElement('div');
    contentElement.className = 'message-content';
    if (type === 'api') {
        // using html to process content
        contentElement.innerHTML = content;
    } else {
        // replace this content to admit line breaks and nothing more (user messages)
        contentElement.innerHTML = content.replace(/\n/g, '<br>');
    }
    messageElement.appendChild(contentElement);
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    if (type === 'api') {
        const retryButton = document.createElement('div');
        retryButton.innerHTML = '⟳';
        retryButton.className = 'retry-button';
        retryButton.title = 'Retry';
        retryButton.style.cursor = 'pointer';
        retryButton.style.color = 'white';
        retryButton.style.backgroundColor = 'transparent';
        retryButton.onclick = () => retryMessage(messageId);
        messageElement.appendChild(retryButton);
        applyCodeHighlightingAndCopyFunctionality();
    }
    // triggers MathJax (mathematical formulas)
    MathJax.typesetPromise([messageElement]).then(() => {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });
}

// With the aim of processing html as api returns content, when message is not full returned, this will be used
function updateLastApiMessage(content) {
    const chatMessages = document.getElementById('chat-messages');
    const lastMessage = chatMessages.querySelector('.message.api:last-child');

    if (lastMessage) {
        const contentElement = lastMessage.querySelector('.message-content') || lastMessage;
        contentElement.innerHTML = content;
        
        const messages = chatTabs[activeChatTab].messages;
        if (messages.length > 0 && messages[messages.length - 1].type === 'api') {
            messages[messages.length - 1].content = content;
        }

        MathJax.typesetPromise([contentElement]).then(() => {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        });
    } else {
        addMessage('api', content);
    }

    applyCodeHighlightingAndCopyFunctionality();
}

// Again, lot of functions to process html content, convert it to markdown, process math expressions, etc :D

// First one is used to highlight code in a code block (inside pre code) and add copy functionality
// Code block is same as: ```python\nprint('Hello, world!')\n```
function applyCodeHighlightingAndCopyFunctionality() {
    document.querySelectorAll('pre code').forEach((block) => {
        if (!block.dataset.highlighted) {
            hljs.highlightElement(block);
            block.dataset.highlighted = 'true';
        }
    });

    const copyButtons = document.querySelectorAll('.copy-code-btn');
    copyButtons.forEach(button => {
        if (!button.dataset.listenerAdded) {
            button.addEventListener('click', () => {
                const code = button.parentElement.nextElementSibling.textContent;
                navigator.clipboard.writeText(code).then(() => {
                    button.textContent = 'Copied!';
                    setTimeout(() => {
                        button.textContent = 'Copy';
                    }, 2000);
                });
            });
            button.dataset.listenerAdded = 'true';
        }
    });
}

// Now we manage text content as html, markdown, math expressions transforms text
function escapeHtml(unsafe) {
    return unsafe.replace(/[&<"']/g, function (m) {
        switch (m) {
            case '&':
                return '&amp;';
            case '<':
                return '&lt;';
            case '>':
                return '&gt;';
            case '"':
                return '&quot;';
            case "'":
                return '&#039;';
            default:
                return m;
        }
    });
}

function unescapeHtml(text) {
    if (!text) return '';
    var entities = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#39;': "'"
    };
    return text.replace(/&amp;|&lt;|&gt;|&quot;|&#39;/g, function(m) { return entities[m]; });
}

// sendMessage uses current messages to get conversational context
// As that messages are processed in real time, we may need to save the original in a variable and processed messages in other one (or html),
// wasting space as conversation grows
// in order to avoid this, we use this function to reverse every message to its original content, if we don't use it, api will return
// strange messages following lasts messages sintaxis (like: <p>, "Copy Button", etc)
function convertHtmlToMarkdown(htmlText) {
    let text = htmlText;
  
    // Step 1: get <p> content and replace <code> by backticks `
    text = text.replace(/<p>([\s\S]*?)<\/p>/g, (match, content) => {
        content = content.replace(/<code>/g, '`').replace(/<\/code>/g, '`');
        return content + '\n';
    });
    // if there isnt more content, avoid it
    text = text.trimEnd();
  
    // Step 2: replace code block by triple backticks
    text = text.replace(/<div class="code-block">[\s\S]*?<pre><code(?:\s+class="([^"]*)")?>([\s\S]*?)<\/code><\/pre>[\s\S]*?<\/div>/g, (match, lang, code) => {
        const language = lang ? lang.split(/\s+/)[0] : '';
        return `\n\`\`\`${language}\n${code.trim()}\n\`\`\`\n`;
    });

    // Step 3: if there is a word incluiding '"': \"word\" change it as "word"
    text = text.replace(/\\\"([^"]*)\\\"/g, '"$1"');

    // Step 4: Just in case, if there is a line only with spaces, remove it
    text = text.replace(/^\s*$/gm, '');

    // Step 5: Replace multiple \n (if 3 or more) with just two
    text = text.replace(/\n{3,}/g, '\n\n');

    // Step 6: unnumbered lists (ul y li) to "- value\n"
    text = text.replace(/<ul>([\s\S]*?)<\/ul>/g, (match, content) => {
        return content.replace(/<li>([\s\S]*?)<\/li>/g, (match, listItemContent) => {
            return `- ${listItemContent.trim()}\n`;
        }).trim() + '\n';
    });

    // Paso 7: Numbered lists with counter (ol y li)
    let counter = 1;
    text = text.replace(/<ol>([\s\S]*?)<\/ol>/g, (match, content) => {
        counter = 1;
        return content.replace(/<li>([\s\S]*?)<\/li>/g, (match, listItemContent) => {
            return `${counter++}. ${listItemContent.trim()}\n`;
        }).trim() + '\n';
    });

    // Resting steps: deletes multiple line formulas: \[, \(, $, $$
    text = text.replace(/\\\[\s*([\s\S]*?)\s*\\\]/g, (match, content) => {
        return `\\[ ${content.trim()} \\]`;
    });

    text = text.replace(/\\\(\s*([\s\S]*?)\s*\\\)/g, (match, content) => {
        return `\\( ${content.trim()} \\)`;
    });
    
    text = text.replace(/\$\s*([\s\S]*?)\s*\$/g, (match, content) => {
        return `$ ${content.trim()} $`;
    });
    
    text = text.replace(/\$\$\s*([\s\S]*?)\s*\$\$/g, (match, content) => {
        return `$$ ${content.trim()} $$`;
    });

    return unescapeHtml(text.trim());
}

// In order to process content it's necessary to differentiate between code blocks, math expressions, and markdown
function processContent(text) {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const mathExpressions = [];
    let lastIndex = 0;
    let result = '';
    let match;

    // function to replace LaTeX formulas with markers
    function replaceMath(match, offset) {
        const placeholder = `%%MATH_EXPR_${mathExpressions.length}%%`;
        mathExpressions.push(match);
        return placeholder;
    }

    // to identify math expressions
    const parenthesisMathPattern = /\\\([\s\S]*?\\\)/g; // gets everyting between \( and \) in a single line or multiple lines
    const bracketMathPattern = /\\\[\s*[\s\S]*?\s*\\\]/g; // same as last but \[ and \]
    const displayMathPattern = /\$\s*[\s\S]*?\s*\$/g; // gets everything between $ and $ in a single line or multiple lines
    const displayMathPattern2 = /\$\$([^\$]+)\$\$/g; // same as last but $$ and $$ 
    const commandPattern = /\\[\s\S]*?\\/g; // everything between \ and \ in a single line or multiple lines


    // porcessing code blocks
    while ((match = codeBlockRegex.exec(text)) !== null) {
        const language = match[1];
        const code = match[2];

        // Add content before the code block
        if (match.index > lastIndex) {
            let markdownText = text.slice(lastIndex, match.index);
            
            // replace formulas
            markdownText = markdownText
                .replace(displayMathPattern, replaceMath)
                .replace(displayMathPattern2, replaceMath)
                .replace(parenthesisMathPattern, replaceMath)
                .replace(bracketMathPattern, replaceMath)
                .replace(commandPattern, replaceMath);

            // Markdown
            let processedMarkdown = marked(markdownText);

            // restore formulas
            mathExpressions.forEach((expr, index) => {
                const placeholder = `%%MATH_EXPR_${index}%%`;
                processedMarkdown = processedMarkdown.replace(placeholder, expr);
            });

            result += processedMarkdown;
        }

        // add code block functionality
        result += `
            <div class="code-block">
                <div class="code-block-header">
                    <span class="language">${language || 'plaintext'}</span>
                    <button class="copy-code-btn">Copy</button>
                </div>
                <pre><code class="${language || 'plaintext'}">${code}</code></pre>
            </div>`;
        lastIndex = codeBlockRegex.lastIndex;
    }

    // if there is still content, process it
    if (lastIndex < text.length) {
        let remainingText = text.slice(lastIndex);
        
        remainingText = remainingText
            .replace(displayMathPattern, replaceMath)
            .replace(displayMathPattern2, replaceMath)
            .replace(parenthesisMathPattern, replaceMath)
            .replace(bracketMathPattern, replaceMath)
            .replace(commandPattern, replaceMath);

        let processedMarkdown = marked(remainingText);

        mathExpressions.forEach((expr, index) => {
            const placeholder = `%%MATH_EXPR_${index}%%`;
            processedMarkdown = processedMarkdown.replace(placeholder, expr);
        });

        result += processedMarkdown;
    }

    return result;
}

// Finally, send the message to server and get the response in a proper way
function sendMessage(overrideMessage = null, isRetry = false) {
    if (isWaitingForResponse) {
        return;
    }

    const chatInput = document.getElementById('chat-input');
    // get text from input or override message
    const message = unescapeHtml(overrideMessage) || unescapeHtml(chatInput.value.trim());
    // update chat input height and wait for response
    if (message) {
        isWaitingForResponse = true;
        updateStopButton(true);
        chatInput.style.height = 'auto';
        adjustExpandCollapseButtonPosition();
        // Add user message to chat
        if (!isRetry) {
            addMessage('user', escapeHtml(message));
        }
        // Reset input
        if (!overrideMessage) {
            chatInput.value = '';
            chatTabs[activeChatTab].inputText = '';
        }
        // as said earlier, we will get general context or cell context (ai-button) 
        const activeTab = chatTabs[activeChatTab];
        const context = activeChatTab === 'general' ? getGeneralContext() : activeTab.context;
        // and process content to avoid strange sintaxis
        const chatHistory = activeTab.messages.map(m => ({
            role: m.type === 'user' ? 'user' : 'assistant',
            content: convertHtmlToMarkdown(m.content)
        }));
        // if we want to stop api response (stop button) this is necessary
        controller = new AbortController();
        const signal = controller.signal;
        // call server
        fetch('/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                context: context, 
                question: message,
                chat_history: chatHistory,
                model: currentModel
            }),
            signal: signal
        }).then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            // initiate the response
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let apiMessage = '';
            let messageAdded = false;
            // and read it, if it's complete addMessage, otherwise updateLastApiMessage
            function read() {
                reader.read().then(({done, value}) => {
                    if (done) {
                        if (!messageAdded) {
                            const processedContent = processContent(apiMessage);
                            addMessage('api', processedContent);
                        }
                        isWaitingForResponse = false;
                        updateStopButton(false);
                        return;
                    }

                    const chunk = decoder.decode(value);
                    const lines = chunk.split('\n');
                    lines.forEach(line => {
                        if (line.startsWith('data: ')) {
                            const data = JSON.parse(line.slice(5));
                            if (data.full_response) {
                                apiMessage = data.full_response;
                                if (!messageAdded) {
                                    const processedContent = processContent(apiMessage);
                                    addMessage('api', processedContent);
                                    messageAdded = true;
                                } else {
                                    const processedContent = processContent(apiMessage);
                                    updateLastApiMessage(processedContent);
                                }
                            } else if (data.content) {
                                apiMessage += data.content;
                                if (!messageAdded) {
                                    const processedContent = processContent(apiMessage);
                                    addMessage('api', processedContent);
                                    messageAdded = true;
                                } else {
                                    const processedContent = processContent(apiMessage);
                                    updateLastApiMessage(processedContent);
                                }
                            }
                        }
                    });

                    read();
                });
            }

            read();
        }).catch(error => {
            if (error.name !== 'AbortError') {
                addMessage('api', 'Error: Could not connect to the API.');
            }
            isWaitingForResponse = false;
            updateStopButton(false);
        });
    }
}

// call this to stop api
function stopApiResponse() {
    if (controller) {
        controller.abort();
        isWaitingForResponse = false;
        updateStopButton(false);
        addMessage('api', 'Response stopped by user.');
        // last message is info ("Response stopped by user"), so remove retry button
        const chatMessages = document.getElementById('chat-messages');
        const lastMessage = chatMessages.querySelector('.message.api:last-child');
        if (lastMessage) {
            const retryButton = lastMessage.querySelector('.retry-button');
            if (retryButton) {
                retryButton.remove();
            }
        }
    }
}

// update stop button position and visibility
function updateStopButton(show) {
    if (show) {
        const expandCollapseContainer = document.getElementById('expand-collapse-container');
        const rect = expandCollapseContainer.getBoundingClientRect();
        stopButton.style.position = 'fixed';
        stopButton.style.left = `${rect.left}px`;
        stopButton.style.top = `${rect.top - 40}px`;
        stopButton.style.display = 'block';
        stopButton.style.zIndex = '1000';
    } else {
        stopButton.style.display = 'none';
    }
}

// Similar to chatGPT or Claude, use enter to send the message or ctrl+enter or shift+enter to add a new line
function handleChatInputKeydown(event) {
    if (event.key === 'Enter') {
        if (event.ctrlKey || event.shiftKey) {
            const start = this.selectionStart;
            const end = this.selectionEnd;
            this.value = this.value.substring(0, start) + '\n' + this.value.substring(end);
            this.selectionStart = this.selectionEnd = start + 1;
        } else {
            event.preventDefault();
            sendMessage();
        }
    }
}

document.addEventListener('DOMContentLoaded', initChat);

window.chatFunctions = {
    switchToTab,
    updateChatTabs,
    updateChatMessages,
    updateChatInput,
    addMessage,
    sendMessage,
    showChat,
    hideChat,
    collapseChat,
    updateSliderLabelsVisibility,
    toggleChat,
    updateLayout,
    handleResize,
    updateButtonSpacing,
    updateMessageWidth,
    toggleExpand
};
