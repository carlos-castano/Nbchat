let activeCell = null;
let undoStack = [];
let redoStack = [];
let isUndoingOrRedoing = false;

// Next 4 functions are for the undo/redo functionality
function saveState() {
    if (isUndoingOrRedoing) return;
    
    const cells = document.querySelectorAll('.cell-container');
    const state = Array.from(cells).map(cell => ({
        type: cell.querySelector('.markdown-output') ? 'markdown' : 'code',
        content: cell.querySelector('.cell-content').value,
        isProcessed: cell.querySelector('.markdown-output, .code-output').style.display === 'block'
    }));
    
    undoStack.push(state);
    redoStack = [];
}

function undo() {
    if (undoStack.length > 1) {
        isUndoingOrRedoing = true;
        redoStack.push(undoStack.pop());
        applyState(undoStack[undoStack.length - 1]);
        isUndoingOrRedoing = false;
    }
}

function redo() {
    if (redoStack.length > 0) {
        isUndoingOrRedoing = true;
        const nextState = redoStack.pop();
        undoStack.push(nextState);
        applyState(nextState);
        isUndoingOrRedoing = false;
    }
}

function applyState(state) {
    const notebook = document.querySelector('#notebook');
    notebook.innerHTML = '';
    state.forEach(cellState => {
        const cellContainer = document.createElement('div');
        cellContainer.className = 'cell-container';
        
        const cellNumber = document.createElement('div');
        cellNumber.className = 'cell-number';
        cellContainer.appendChild(cellNumber);
        
        const cellCheckbox = document.createElement('input');
        cellCheckbox.type = 'checkbox';
        cellCheckbox.className = 'cell-select-checkbox';
        cellCheckbox.addEventListener('change', () => toggleCheckboxStyle(cellCheckbox));
        cellContainer.appendChild(cellCheckbox);
        
        const cell = createCellContent(cellState.type, cellState.content);
        cellContainer.appendChild(cell);
        
        notebook.appendChild(cellContainer);
        
        if (cellState.isProcessed) {
            if (cellState.type === 'markdown') {
                processMarkdownCell(cellContainer);
            } else {
                processCodeCell(cellContainer);
            }
        }
        
        addCellButtons(cellContainer);
    });
    updateCellNumbers();
    showAddCellButtons();
}

// This functions uses marked.min.js to process markdown
function processMarkdownCell(cell) {
    // get the content of the textarea
    const textarea = cell.querySelector('.cell-content');
    const output = cell.querySelector('.markdown-output');
    // Removes leading and trailing whitespaces
    const cleanedMarkdown = textarea.value.replace(/^\s*\n|\n\s*$/g, '');
    // And process it
    output.innerHTML = marked(cleanedMarkdown);
    output.style.display = 'block';
    textarea.style.display = 'none';
    cell.querySelector('.cell-buttons').style.display = 'none';
    // Listen when clicked to show the textarea again
    output.addEventListener('click', () => {
        textarea.style.display = 'block';
        output.style.display = 'none';
        cell.querySelector('.cell-buttons').style.display = 'flex';
        textarea.focus();
    });

    if (!isUndoingOrRedoing) {
        saveState();
    }
}

// This function uses highlight.js to process code (same logic)
function processCodeCell(cell) {
    const textarea = cell.querySelector('.cell-content');
    const output = cell.querySelector('.code-output');
    const code = textarea.value;

    const codeOutputDiv = document.createElement('div');
    codeOutputDiv.className = 'code-output';
    
    const codeElement = document.createElement('code');
    // As we are working with ipynb, uses python lenguage for highlighting
    codeElement.className = 'language-python';
    const cleanedCode = code.replace(/^\s*\n|\n\s*$/g, '');
    codeElement.textContent = cleanedCode;
    codeOutputDiv.appendChild(codeElement);
    hljs.highlightElement(codeElement);

    output.innerHTML = '';
    output.appendChild(codeOutputDiv);
    output.style.display = 'block';
    textarea.style.display = 'none';
    cell.querySelector('.cell-buttons').style.display = 'none';
    output.addEventListener('click', () => {
        textarea.style.display = 'block';
        output.style.display = 'none';
        cell.querySelector('.cell-buttons').style.display = 'flex';
        textarea.focus();
    });
    if (!isUndoingOrRedoing) {
        saveState();
    }
}

// This function it's used to process the hole notebook when loaded via selectIpynbFile(), function found in menu.js
function processNotebookData(notebookData) {
    notebookData.cells.forEach(cell => {
        if (cell.cell_type === 'markdown') {
            const newCell = addCell('markdown', cell.source.join(''));
            processMarkdownCell(newCell);
        } else if (cell.cell_type === 'code') {
            const newCell = addCell('code', cell.source.join(''));
            processCodeCell(newCell);
        }
    });
}


function updateCellNumbers() {
    const cells = document.querySelectorAll('.cell-container');
    cells.forEach((cell, index) => {
        const cellNumber = cell.querySelector('.cell-number');
        if (cellNumber) {
            cellNumber.textContent = `[${index}]`;
        }
    });
}

// This could be avoided writting in html, next functions are for the global buttons (select all, run all, etc)
function addGlobalCellButtons() {
    const selectAllButton = document.createElement('div');
    selectAllButton.id = 'select-all-btn';
    selectAllButton.title = 'Select all';
    const icon = document.createElement('img');
    icon.src = 'static/svg/select-cursor-svgrepo-com.svg';
    icon.alt = 'Select all icon';
    selectAllButton.appendChild(icon);
    selectAllButton.addEventListener('click', toggleSelectAll);

    const changeContextToMajorityButton = document.createElement('div');
    changeContextToMajorityButton.id = 'change-context-to-majority-btn';
    changeContextToMajorityButton.title = 'Change context seen by AI (by selected majority)';
    const changeContextToMajorityIcon = document.createElement('img');
    changeContextToMajorityIcon.src = 'static/svg/eye-closed-svgrepo-com.svg';
    changeContextToMajorityIcon.alt = 'Change context to majority selected icon';
    changeContextToMajorityButton.appendChild(changeContextToMajorityIcon);
    changeContextToMajorityButton.addEventListener('click', changeSelectedContextVision);

    const runAllButton = document.createElement('div');
    runAllButton.id = 'run-all-btn';
    runAllButton.title = 'Run selected';
    const runIcon = document.createElement('img');
    runIcon.src = 'static/svg/play-svgrepo-com.svg';
    runIcon.alt = 'Run all icon';
    runAllButton.appendChild(runIcon);
    runAllButton.addEventListener('click', runAllSelectedCells);

    const deleteButton = document.createElement('div');
    deleteButton.id = 'delete-btn';
    deleteButton.title = 'Delete selected';
    const deleteIcon = document.createElement('img');
    deleteIcon.src = 'static/svg/trash-svgrepo-com.svg';
    deleteIcon.alt = 'Delete icon';
    deleteButton.appendChild(deleteIcon);
    deleteButton.addEventListener('click', deleteSelectedCells);

    const copyButton = document.createElement('div');
    copyButton.id = 'copy-btn';
    copyButton.title = 'Copy selected';
    const copyIcon = document.createElement('img');
    copyIcon.src = 'static/svg/copy-to-clipboard-svgrepo-com.svg';
    copyIcon.alt = 'Copy to clipboard icon';
    copyButton.appendChild(copyIcon);
    copyButton.addEventListener('click', copySelectedCellsText);

    const generalButtonsContainer = document.querySelector('#general-buttons');
    generalButtonsContainer.appendChild(selectAllButton);
    generalButtonsContainer.appendChild(changeContextToMajorityButton);
    generalButtonsContainer.appendChild(runAllButton);
    generalButtonsContainer.appendChild(deleteButton);
    generalButtonsContainer.appendChild(copyButton);
}

// The logics follows: if more cells selected are red, change to green, else to red and viceversa
// Green means that general chat can see this cell and red means that it can't
function changeSelectedContextVision(){
    const selectedCells = document.querySelectorAll('.cell-container .cell-select-checkbox:checked');
    let redCells = 0;
    let greenCells = 0;
    selectedCells.forEach(checkbox => {
        const cell = checkbox.closest('.cell-container');
        const cellCover = cell.querySelector('.cell-cover');
        if (cellCover.classList.contains('red')) {
            redCells++;
        } else {
            greenCells++;
        }
    });
    selectedCells.forEach(checkbox => {
        const cell = checkbox.closest('.cell-container');
        const cellCover = cell.querySelector('.cell-cover');
        if (redCells > greenCells) {
            cellCover.classList.remove('red');
            cellCover.classList.add('green');
            showNotification('Included context seen by AI', cell);
        } else {
            cellCover.classList.remove('green');
            cellCover.classList.add('red');
            showNotification('Excluded context seen by AI', cell);
        }
    });
}

// Process every selected cell
function runAllSelectedCells() {
    const selectedCells = document.querySelectorAll('.cell-container .cell-select-checkbox:checked');
    if (selectedCells.length === 0) return;
    selectedCells.forEach(checkbox => {
        const cell = checkbox.closest('.cell-container');
        const isMarkdown = cell.querySelector('.markdown-output') !== null;
        if (isMarkdown) {
            processMarkdownCell(cell);
        } else {
            processCodeCell(cell);
        }
    });
    

}

// Copy the text of every selected cell as plain text (if markdown cotains "# 1" it's copied as "# 1")
function copySelectedCellsText() {
    const selectedCells = document.querySelectorAll('.cell-container .cell-select-checkbox:checked');
    let textToCopy = '';
    selectedCells.forEach(checkbox => {
        const cell = checkbox.closest('.cell-container');
        const textarea = cell.querySelector('.cell-content-wrapper textarea');
        const codeOutput = cell.querySelector('.code-output');
        const markdownOutput = cell.querySelector('.markdown-output');

        if (textarea && textarea.style.display !== 'none') {
            const cellText = textarea.value.trim();
            if (cellText) {
                textToCopy += cellText + '\n\n';
            }
        } else if (codeOutput && codeOutput.style.display !== 'none') {
            const codeText = codeOutput.querySelector('code').textContent.trim();
            if (codeText) {
                textToCopy += codeText + '\n\n';
            }
        } else if (markdownOutput && markdownOutput.style.display !== 'none') {
            const markdownText = markdownOutput.innerText.trim();
            if (markdownText) {
                textToCopy += markdownText + '\n\n';
            }
        }
    });
    navigator.clipboard.writeText(textToCopy.trim())
        .then(() => {
            if (textToCopy === '') {
                showNotification('Nothing selected', document.querySelector('#copy-btn'));
                return;
            }
            showNotification('Copied', document.querySelector('#copy-btn'));
        });
}

function deleteSelectedCells() {
    const selectedCells = document.querySelectorAll('.cell-container .cell-select-checkbox:checked');
    if (selectedCells.length === 0) return; 
    selectedCells.forEach(checkbox => {
        const cell = checkbox.closest('.cell-container');
        cell.remove();
    });
    updateSelectAllButtonState();
    updateCellNumbers();
    showAddCellButtons();
    if (!isUndoingOrRedoing) {
        saveState();
    }
}

// This function is used to update the select all button title
function updateSelectAllButtonState() {
    const selectAllButton = document.querySelector('#select-all-btn');
    if (!selectAllButton) return;
    const cells = document.querySelectorAll('.cell-container .cell-select-checkbox');
    if (cells.length === 0) return;
    const allSelected = Array.from(cells).every(checkbox => checkbox.checked);
    const allDeselected = Array.from(cells).every(checkbox => !checkbox.checked);

    if (allSelected) {
        selectAllButton.title = 'Deselect all';
    } else if (allDeselected) {
        selectAllButton.title = 'Select all';
    } else {
        selectAllButton.title = 'Select all';
    }
}

// Next 2 functions goal is to select all or deselect all cells
function toggleSelectAll() {
    const cells = document.querySelectorAll('.cell-container .cell-select-checkbox');
    const allSelected = Array.from(cells).every(checkbox => checkbox.checked);
    cells.forEach(checkbox => {
        checkbox.checked = !allSelected;
        toggleCheckboxStyle(checkbox);
    });
}

function toggleCheckboxStyle(checkbox) {
    if (checkbox.checked) {
        checkbox.parentNode.classList.add('checkbox-selected');
    } else {
        checkbox.parentNode.classList.remove('checkbox-selected');
    }
    updateSelectAllButtonState();
}

// In order to insert a cell, we get addCell() to add the first or top cell, and insertCell() for the rest
function addCell(type, content = '') {
    // creates every element necessary for a cell
    const cellContainer = document.createElement('div');
    cellContainer.className = 'cell-container';

    const cellNumber = document.createElement('div');
    cellNumber.className = 'cell-number';
    cellContainer.appendChild(cellNumber);

    const cellCheckbox = document.createElement('input');
    cellCheckbox.type = 'checkbox';
    cellCheckbox.className = 'cell-select-checkbox';
    cellCheckbox.addEventListener('change', () => toggleCheckboxStyle(cellCheckbox));
    cellContainer.appendChild(cellCheckbox);

    const cell = createCellContent(type, content);
    cellContainer.appendChild(cell);

    // As every cell gets 2 add cell buttons in the bottom container, the first one needs to be created with 2 buttons more in the top
    // because we could need to add a cell before the first one
    const notebook = document.querySelector('#notebook');
    let topInsertButtons = document.querySelector('#top-insert-buttons');
    
    if (!topInsertButtons) {
        topInsertButtons = createTopInsertButtons();
        const notebookContainer = document.querySelector('#notebook-container');
        notebookContainer.insertBefore(topInsertButtons, notebook);
    }

    if (notebook.firstChild) {
        notebook.insertBefore(cellContainer, notebook.firstChild);
    } else {
        notebook.appendChild(cellContainer);
    }

    addCellButtons(cellContainer);
    updateCellNumbers();

    if (!isUndoingOrRedoing) {
        saveState();
    }
    return cellContainer.querySelector('.cell');
}

function insertCell(type, refCellContainer) {
    // Just creates all the elements needed for a cell
    const newCellContainer = document.createElement('div');
    newCellContainer.className = 'cell-container';

    const cellNumber = document.createElement('div');
    cellNumber.className = 'cell-number';
    newCellContainer.appendChild(cellNumber);

    const cellCheckbox = document.createElement('input');
    cellCheckbox.type = 'checkbox';
    cellCheckbox.className = 'cell-select-checkbox';
    cellCheckbox.addEventListener('change', () => toggleCheckboxStyle(cellCheckbox));
    newCellContainer.appendChild(cellCheckbox);

    const newCell = createCellContent(type);
    newCellContainer.appendChild(newCell);

    // Adds the next buttons to addCell, update the number and change the title of the select all button 
    // (because if we add a cell, this new one will not be selected)
    refCellContainer.parentNode.insertBefore(newCellContainer, refCellContainer.nextSibling);
    addCellButtons(newCellContainer);
    updateCellNumbers();
    updateSelectAllButtonState();

    if (!isUndoingOrRedoing) {
        saveState();
    }
}

// addCellButtons() is used to add the buttons to add the bottom buttons in every cell
function addCellButtons(cellContainer) {
    const existingButtons = cellContainer.querySelector('.cell-insert-buttons');
    if (existingButtons) {
        existingButtons.remove();
    }

    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'cell-insert-buttons';
    
    const addMarkdownButton = document.createElement('button');
    addMarkdownButton.textContent = '+ Markdown';
    addMarkdownButton.addEventListener('click', () => insertCell('markdown', cellContainer));
    
    const addCodeButton = document.createElement('button');
    addCodeButton.textContent = '+ Code';
    addCodeButton.addEventListener('click', () => insertCell('code', cellContainer));

    const aiButton = document.createElement('button');
    aiButton.textContent = '💭';
    aiButton.className = 'ai-button';
    aiButton.title = 'Open chat (context seen by AI will be only this cell)';
    buttonsContainer.appendChild(addMarkdownButton);
    buttonsContainer.appendChild(addCodeButton);
    buttonsContainer.appendChild(aiButton);
    
    cellContainer.appendChild(buttonsContainer);
    showAddCellButtons();
}

// Logic to show the kind of add cell buttons (if there is none or more than that)
function showAddCellButtons() {
    const cellContainers = document.querySelectorAll('.cell-container');
    const topInsertButtons = document.querySelector('#top-insert-buttons');
    const addMarkdownCellButton = document.querySelector('#add-markdown-cell');
    const addCodeCellButton = document.querySelector('#add-code-cell');

    if (cellContainers.length < 1) {
        if (topInsertButtons) topInsertButtons.style.display = 'none';
        addMarkdownCellButton.style.display = 'block';
        addCodeCellButton.style.display = 'block';
    } else {
        if (topInsertButtons) topInsertButtons.style.display = 'flex';
        addMarkdownCellButton.style.display = 'none';
        addCodeCellButton.style.display = 'none';
    }
    centerTopInsertButtons();
}

// Used to create the content of a cell (big part of this could be written in html)
function createCellContent(type, content = '') {
    const cell = document.createElement('div');
    cell.className = 'cell';

    if (type === 'markdown') {
        cell.innerHTML += `
            <div class="cell-content-wrapper">
            <textarea class="cell-content" placeholder="Markdown..." tabindex="0" style="border: none; outline: none; color: white">${content}</textarea>
            <div class="markdown-output" style="display:none;"></div>
            <div class="cell-cover"></div>
            </div>
            <div class="cell-buttons">
            <button class="execute-button" tabindex="-1">▷</button>
            <button class="delete-button" tabindex="-1">🗑</button>
            <button class="copy-button" tabindex="-1">🗐</button>
            </div>
        `;
    } else if (type === 'code') {
        cell.innerHTML += `
            <div class="cell-content-wrapper">
                <textarea class="cell-content" placeholder="Code..." tabindex="0" style="border: none; outline: none; color: white">${content}</textarea>
                <div class="code-output" style="display:none;"></div>
                <div class="cell-cover"></div>
            </div>
            <div class="cell-buttons">
                <button class="execute-button" tabindex="-1">▷</button>
                <button class="delete-button" tabindex="-1">🗑</button>
                <button class="copy-button" tabindex="-1">🗐</button>
            </div>
        `;
    }    

    // the functionality behind red or green cell-cover is written in chat.js
    cell.querySelector('.cell-cover').addEventListener('click', function() {
        this.classList.toggle('red');
        if (this.classList.contains('red')) {
            showNotification('Excluded context seen by AI', this);
        } else {
            showNotification('Included context seen by AI', this);
        }
    });
    
    cell.addEventListener('click', () => {
        document.querySelectorAll('.cell').forEach(c => c.classList.remove('active'));
        cell.classList.add('active');
    });

    const executeButton = cell.querySelector('.execute-button');
    executeButton.title = 'Execute';
    const deleteButton = cell.querySelector('.delete-button');
    deleteButton.title = 'Delete';
    const copyButton = cell.querySelector('.copy-button');
    copyButton.title = 'Copy';
    const textarea = cell.querySelector('.cell-content');
    // we need this listener to make the textarea grow as the user writes
    textarea.addEventListener('input', () => {
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
    });
    
    deleteButton.addEventListener('click', () => {
        const cellContainer = cell.closest('.cell-container');
        cellContainer.remove();
        showAddCellButtons();
        updateCellNumbers();
        if (activeCell === cell) {
            activeCell = null;
        }
        if (!isUndoingOrRedoing) {
            saveState();
        }
    });

    executeButton.addEventListener('click', () => {
        if (type === 'markdown') {
            processMarkdownCell(cell);
        } else if (type === 'code') {
            processCodeCell(cell);
        }
    });

    copyButton.addEventListener('click', () => {
        const textToCopy = textarea.value;
        navigator.clipboard.writeText(textToCopy).then(() => {
            textarea.setSelectionRange(0, 0);
            textarea.blur();
            showNotification('Copied', copyButton);
        });
    });

    textarea.addEventListener('keydown', (event) => {
        // tab inserts 4 spaces
        if (event.key === 'Tab') {
            event.preventDefault();
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            textarea.value = textarea.value.substring(0, start) + '    ' + textarea.value.substring(end);
            textarea.selectionStart = textarea.selectionEnd = start + 4;
        }
    });

    cell.addEventListener('click', () => {
        if (activeCell) {
            activeCell.classList.remove('active');
        }
        activeCell = cell;
        activeCell.classList.add('active');
    });

    return cell;
}

function showNotification(message, element) {
    const notification = document.createElement('div');
    notification.style.position = 'absolute';
    notification.style.padding = '5px 10px';
    notification.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    notification.style.color = 'white';
    notification.style.borderRadius = '5px';
    notification.style.zIndex = '1000';
    notification.style.visibility = 'hidden';
    notification.innerText = message;

    document.body.appendChild(notification);

    const rect = element.getBoundingClientRect();
    const notificationHeight = notification.offsetHeight;
    notification.style.top = `${rect.top + rect.height / 2 - notificationHeight / 2}px`;
    notification.style.left = `${rect.right + 10}px`;

    notification.style.visibility = 'visible';

    setTimeout(() => {
        document.body.removeChild(notification);
    }, 1500);
}

// topInsertButtons are the buttons that dosnt belong to any cell
// they are the first buttons to add a cell at the top of the notebook
function createTopInsertButtons() {
    const topInsertButtons = document.createElement('div');
    topInsertButtons.id = 'top-insert-buttons';
    topInsertButtons.className = 'cell-insert-buttons';
    
    const addMarkdownButton = document.createElement('button');
    addMarkdownButton.textContent = '+ Markdown';
    addMarkdownButton.addEventListener('click', () => addCell('markdown'));
    
    const addCodeButton = document.createElement('button');
    addCodeButton.textContent = '+ Code';
    addCodeButton.addEventListener('click', () => addCell('code'));

    topInsertButtons.appendChild(addMarkdownButton);
    topInsertButtons.appendChild(addCodeButton);

    return topInsertButtons;
}

function centerTopInsertButtons() {
    const topInsertButtons = document.getElementById('top-insert-buttons');
    const notebookContainer = document.getElementById('notebook-container');
    
    if (topInsertButtons && notebookContainer) {
        const notebookRect = notebookContainer.getBoundingClientRect();

        const newLeft = notebookRect.left + (notebookRect.width / 2);
        topInsertButtons.style.top = `${notebookRect.top}px`;
        topInsertButtons.style.left = `${newLeft}px`;
        topInsertButtons.style.transform = 'translate(-50%, -50%)';
    }
}

function centerGeneralButtons() {
    const generalButtons = document.getElementById('general-buttons');
    const notebookContainer = document.getElementById('notebook-container');
    
    if (generalButtons && notebookContainer) {
        const notebookRect = notebookContainer.getBoundingClientRect();
        
        const newLeft = notebookRect.left + (notebookRect.width / 2);
        generalButtons.style.left = `${newLeft}px`;
        generalButtons.style.transform = `translateX(-50%)`;
    }
}

function centerAllButtons() {
    centerGeneralButtons();
    centerTopInsertButtons();
}

// keyboard shortcuts: ctr+enter to execute a cell, ctr+z to undo and ctr+y to redo
document.addEventListener('keydown', (event) => {
    if (event.ctrlKey && event.key === 'Enter') {
        if (activeCell) {
            const isMarkdown = activeCell.querySelector('.markdown-output') !== null;
            if (isMarkdown) {
                processMarkdownCell(activeCell.closest('.cell-container'));
            } else {
                processCodeCell(activeCell.closest('.cell-container'));
            }
        }
    } else if (event.ctrlKey && event.key === 'z') {
        event.preventDefault();
        undo();
    } else if (event.ctrlKey && event.key === 'y') {
        event.preventDefault();
        redo();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    addMarkdownCellButton = document.querySelector('#add-markdown-cell');
    addCodeCellButton = document.querySelector('#add-code-cell');
    addMarkdownCellButton.addEventListener('click', () => addCell('markdown'));
    addCodeCellButton.addEventListener('click', () => addCell('code'));
    addGlobalCellButtons();
    // this listener and the next 2, are used for the undo/redo functionality
    document.addEventListener('input', (event) => {
        if (event.target.classList.contains('cell-content')) {
            if (!isUndoingOrRedoing) {
                saveState();
            }
        }
    });
    const deleteButton = document.querySelector('#delete-btn');
    if (deleteButton) {
        deleteButton.addEventListener('click', deleteSelectedCells);
    }

    const runAllButton = document.querySelector('#run-all-btn');
    if (runAllButton) {
        runAllButton.addEventListener('click', runAllSelectedCells);
    }

    // this is used to animate the general buttons "collapse" (dont touch them and watch a basic animation)
    function startCollapseTimer(time = 4000) {
        timer = setTimeout(() => {
            if (!mouseOver) {
                generalButtons.classList.add('collapsed');
            }
        }, time);
    }

    let mouseOver = false;
    let timer;
    const generalButtons = document.getElementById('general-buttons');
    generalButtons.addEventListener('mouseenter', () => {
        mouseOver = true;
        clearTimeout(timer);
        generalButtons.classList.remove('collapsed');
    });
    generalButtons.addEventListener('mouseleave', () => {
        mouseOver = false;
        startCollapseTimer();
    });
    startCollapseTimer(5000);

    window.addEventListener('load', centerAllButtons);
    window.addEventListener('resize', centerAllButtons);
    const config = { attributes: true, childList: true, subtree: true };
    const observer = new MutationObserver((mutations) => {
        centerAllButtons();
    });
    observer.observe(document.getElementById('notebook-container'), config);
    window.addEventListener('click', (event) => {
        if (event.target.tagName === 'A') {
            event.target.setAttribute('target', '_blank');
        }
    });
    saveState();
});