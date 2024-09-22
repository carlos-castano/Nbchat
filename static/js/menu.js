let initialNotebookMargin;
let initialButtonContainerMargin;

document.addEventListener('DOMContentLoaded', () => {
    const menuButton = document.getElementById('menu-button');
    const buttonContainer = document.getElementById('button-container');
    const menu = document.getElementById('menu');

    function initializeLayout() {
        const notebookContainer = document.getElementById('notebook-container');
        const notebookComputedStyle = window.getComputedStyle(notebookContainer);
        initialNotebookMargin = parseInt(notebookComputedStyle.marginLeft, 10);
        
        const buttonContainerComputedStyle = window.getComputedStyle(buttonContainer);
        initialButtonContainerMargin = {
            left: parseInt(buttonContainerComputedStyle.marginLeft, 10),
            right: parseInt(buttonContainerComputedStyle.marginRight, 10)
        };
    }

    initializeLayout();

    menuButton.style.left = menu.classList.contains('hidden') ? '10px' : '260px';
    menuButton.addEventListener('click', () => {
        toggleMenu();
    });
    document.addEventListener('click', (event) => {
        const isMenuClicked = menu.contains(event.target) || menuButton.contains(event.target);
        if (!isMenuClicked) {
            hideMenu();
        }
    
    });

    function addMenuButtons() {
        const menu = document.querySelector('#menu');

        const selectIpynbButton = document.createElement('button');
        selectIpynbButton.textContent = 'Load .ipynb 🔗';
        // Add a little space 1st button
        selectIpynbButton.style.marginTop = '5px';
        selectIpynbButton.classList.add('menu-button');
        selectIpynbButton.onclick = selectIpynbFile;
        menu.appendChild(selectIpynbButton);

        const saveAsIpynbButton = document.createElement('button');
        saveAsIpynbButton.textContent = 'Save as .ipynb 💾';
        saveAsIpynbButton.classList.add('menu-button');
        saveAsIpynbButton.onclick = saveAsIpynb;
        menu.appendChild(saveAsIpynbButton);

        const loadButton = document.createElement('button');
        loadButton.textContent = 'Load session 📖 🗪';
        loadButton.classList.add('menu-button');
        loadButton.onclick = () => {
            alert('All unsaved changes will be lost. Use Menu -> Save session to save cells and chats or Menu -> Save as .ipynb to save only cells.');
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.nbchat';
            input.onchange = (e) => loadSession(e.target.files[0]);
            input.click();
        };
        menu.appendChild(loadButton);
        
        const saveButton = document.createElement('button');
        saveButton.textContent = 'Save session 📘 🗪';
        saveButton.classList.add('menu-button');
        saveButton.onclick = saveSession;
        menu.appendChild(saveButton);
    }

    addMenuButtons();
    setupBasicUnloadWarning();
});

// Warns the user when trying to leave the page with unsaved changes
function setupBasicUnloadWarning() {
    window.addEventListener('beforeunload', (event) => {
        event.preventDefault(); // Cancel any event (close, reload, etc.)
        // This message won't be shown in most browsers
        alert('All unsaved changes will be lost. Use Menu -> Save session to save cells and chats or Menu -> Save as .ipynb to save only cells.');
    });
}

function toggleMenu() {
    menu = document.getElementById('menu');
    if (menu.classList.contains('hidden')) {
        showMenu();
    } else {
        hideMenu();
    }
}

function showMenu() {
    menu = document.getElementById('menu');
    menu.classList.remove('hidden');
    menu.classList.add('visible');
    menuButton = document.getElementById('menu-button');
    menuButton.style.left = '13.5%';
    if (isChatExpanded) {
        document.getElementById('chat-button').style.display = 'none';
        document.getElementById('expand-collapse-button').style.display = 'none';
        document.getElementById('switch-model-button').style.display = 'none';
    }
}

function hideMenu() {
    menu = document.getElementById('menu');
    menu.classList.add('hidden');
    menu.classList.remove('visible');
    menuButton = document.getElementById('menu-button');
    menuButton.style.left = '10px';
    if (isChatExpanded) {
        document.getElementById('chat-button').style.display = 'flex';
        document.getElementById('expand-collapse-button').style.display = 'flex';
        document.getElementById('switch-model-button').style.display = 'flex';
    }
}

// Loads the .ipynb file and processes it (cell outputs are excluded)
function selectIpynbFile() {
    alert('All unsaved changes will be lost. Use Menu -> Save session to save cells and chats or Menu -> Save as .ipynb to save only cells.');
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.ipynb';
    input.onchange = async (event) => {
        const file = event.target.files[0];
        if (file && file.name.endsWith('.ipynb')) {
            window.chatFunctions.collapseChat();
            window.chatFunctions.hideChat();
            window.chatFunctions.showChat();
            document.querySelector('#chat-messages').innerHTML = '';
            document.querySelector('#notebook').innerHTML = '';
            const content = await file.text();
            const notebookData = JSON.parse(content);
            notebookData.cells.reverse();
            processNotebookData(notebookData);
        }
    };
    input.click();
    hideMenu();
}

// Loads everything saved in the .nbchat file
function loadSession(file) {
    // Some function from "window.chatFunctions" are used to avoid bugs when chat is expanded 
    // and this function is called.
    window.chatFunctions.collapseChat();
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const sessionData = JSON.parse(e.target.result);
        document.querySelector('#notebook').innerHTML = '';
        document.querySelector('#chat-messages').innerHTML = '';
        
        // It is necessary to reverse cells order to keep the original
        sessionData.cells.reverse().forEach(cellData => {
            const cell = addCell(cellData.type, cellData.content);
            if (cellData.type === 'markdown') {
                processMarkdownCell(cell);
            } else {
                processCodeCell(cell);
            }
            if (cellData.isExcluded) {
                cell.querySelector('.cell-cover').classList.add('red');
            }
        });
        
        chatTabs = sessionData.chatTabs || {
            'general': { title: 'Chat', messages: [], context: '', inputText: '' }
        };
        activeChatTab = sessionData.activeChatTab || 'general';

        window.chatFunctions.updateChatTabs();
        
        window.chatFunctions.switchToTab(activeChatTab);
        window.chatFunctions.updateChatInput();
        window.chatFunctions.updateLayout();
        window.chatFunctions.showChat();
        window.chatFunctions.hideChat();
        window.chatFunctions.showChat();

        const chatMessages = document.getElementById('chat-messages');
        chatMessages.scrollTop = chatMessages.scrollHeight;
        MathJax.typeset([chatMessages]);
    };
    reader.readAsText(file);
    hideMenu();
}

// Saves cells content, their context status and chats (creates a .nbchat file)
async function saveSession() {
    const cells = document.querySelectorAll('.cell');
    const sessionData = {
        cells: Array.from(cells).map(cell => ({
            type: cell.querySelector('.markdown-output') ? 'markdown' : 'code',
            content: cell.querySelector('.cell-content').value,
            isExcluded: cell.querySelector('.cell-cover').classList.contains('red'),
        })),
        chatTabs: chatTabs,
        activeChatTab: activeChatTab,
    };

    const blob = new Blob([JSON.stringify(sessionData)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const fileName = await showFileNamePrompt('Enter the session file name:', 'session', '.nbchat');
    if (fileName) {
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName + '.nbchat';
        a.click();
    }
    URL.revokeObjectURL(url);
}


// Save cells content as .ipynb file (nothing else is saved including chats)
async function saveAsIpynb() {
    const cells = document.querySelectorAll('.cell');
    const notebook = {
        nbformat: 4,
        nbformat_minor: 2,
        metadata: {
            kernelspec: {
                display_name: "Python 3",
                language: "python",
                name: "python3"
            },
            language_info: {
                codemirror_mode: {
                    name: "ipython",
                    version: 3
                },
                file_extension: ".py",
                mimetype: "text/x-python",
                name: "python",
                nbconvert_exporter: "python",
                pygments_lexer: "ipython3",
                version: "3.8.0"
            }
        },
        cells: Array.from(cells).map(cell => {
            const cellType = cell.querySelector('.markdown-output') ? 'markdown' : 'code';
            const cellContent = cell.querySelector('.cell-content').value;

            return {
                cell_type: cellType,
                metadata: {},
                source: cellContent.split('\n').map(line => line + '\n'),
                execution_count: cellType === 'code' ? null : undefined,
                outputs: cellType === 'code' ? [] : undefined
            };
        })
    };

    const blob = new Blob([JSON.stringify(notebook, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const fileName = await showFileNamePrompt('Enter the notebook file name:', 'notebook', '.ipynb');
    if (fileName) {
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName + '.ipynb';
        a.click();
    }
    URL.revokeObjectURL(url);
}

// Ask the user for a file name to save the file
function showFileNamePrompt(message, defaultFileName, fileName) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        overlay.style.display = 'flex';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        overlay.style.zIndex = '1000000';

        const modal = document.createElement('div');
        modal.style.backgroundColor = '#333';
        modal.style.padding = '20px';
        modal.style.borderRadius = '10px';
        modal.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
        modal.style.textAlign = 'center';
        modal.style.color = 'white';
        modal.style.fontFamily = 'Arial, sans-serif';
        modal.style.width = '450px';

        const messageElement = document.createElement('p');
        messageElement.textContent = message;
        messageElement.style.fontSize = '18px';
        modal.appendChild(messageElement);

        const inputWrapper = document.createElement('div');
        inputWrapper.style.position = 'relative'; 
        inputWrapper.style.display = 'flex';
        inputWrapper.style.alignItems = 'center';
        inputWrapper.style.backgroundColor = '#555';
        inputWrapper.style.borderRadius = '5px';
        inputWrapper.style.width = '100%';
        inputWrapper.style.margin = '10px auto';
        inputWrapper.style.padding = '5px';

        const input = document.createElement('input');
        input.type = 'text';
        input.value = defaultFileName;
        input.spellcheck = false;
        input.style.paddingRight = '60px';
        input.style.flexGrow = '1';
        input.style.outline = 'none';
        input.style.border = 'none';
        input.style.backgroundColor = '#555';
        input.style.color = 'white';
        input.style.padding = '10px';
        input.style.fontSize = '18px';
        input.maxLength = 45;

        input.addEventListener('input', () => {
            if (input.value.length > 45) {
                input.value = input.value.substring(0, 45);
            }
        });

        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                resolve(input.value);
                document.body.removeChild(overlay);
            }
        });

        const suffix = document.createElement('span');
        suffix.textContent = fileName;
        suffix.style.borderRadius = '5px';
        suffix.style.color = 'white';
        suffix.style.fontSize = '16px';
        suffix.style.position = 'absolute';
        suffix.style.right = '5px';
        suffix.style.top = '50%';
        suffix.style.transform = 'translateY(-50%)';
        suffix.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
        suffix.style.padding = '5px 10px';
        suffix.style.borderRadius = '5px';
        suffix.style.pointerEvents = 'none';

        inputWrapper.appendChild(input);
        inputWrapper.appendChild(suffix);
        modal.appendChild(inputWrapper);

        const confirmButton = document.createElement('button');
        confirmButton.textContent = 'Download';
        confirmButton.style.marginTop = '20px';
        confirmButton.style.padding = '10px 20px';
        confirmButton.style.backgroundColor = '#3bbb4f';
        confirmButton.style.border = 'none';
        confirmButton.style.borderRadius = '5px';
        confirmButton.style.color = 'white';
        confirmButton.style.cursor = 'pointer';
        confirmButton.style.fontSize = '16px';
        confirmButton.style.marginRight = '10px';
        confirmButton.onclick = () => {
            resolve(input.value);
            document.body.removeChild(overlay);
        };
        modal.appendChild(confirmButton);

        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancel';
        cancelButton.style.marginTop = '20px';
        cancelButton.style.padding = '10px 20px';
        cancelButton.style.backgroundColor = '#3f3f3f';
        cancelButton.style.border = 'none';
        cancelButton.style.borderRadius = '5px';
        cancelButton.style.color = 'white';
        cancelButton.style.cursor = 'pointer';
        cancelButton.style.fontSize = '16px';
        cancelButton.onclick = () => {
            resolve(null);
            document.body.removeChild(overlay);
        };
        modal.appendChild(cancelButton);

        overlay.addEventListener('mousedown', (event) => {
            if (event.target === overlay) {
                resolve(null);
                document.body.removeChild(overlay);
            }
        });
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        input.focus();
    });
}
