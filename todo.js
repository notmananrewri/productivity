// To-Do List Logic
const todoDateDisplay = document.getElementById('todo-date-display');
const newTodoInput = document.getElementById('new-todo-input');
const addTodoBtn = document.getElementById('add-todo-btn');
const todoList = document.getElementById('todo-list');
const prevDayBtn = document.getElementById('prev-day-btn');
const nextDayBtn = document.getElementById('next-day-btn');
const productiveDayStatusSelect = document.getElementById('productive-day-status');

let allTodos = JSON.parse(localStorage.getItem('allTodos') || '{}');
let dailyProductivity = JSON.parse(localStorage.getItem('dailyProductivity') || '{}');

let currentTodoDate = new Date(); // Initialize to today's date

// Helper function to format a Date object into a YYYY-MM-DD string
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Helper function to parse YYYY-MM-DD string to a Date object
function parseDateString(dateString) {
    const [year, month, day] = dateString.split('-').map(Number);
    // Use UTC to avoid timezone issues when setting date
    return new Date(Date.UTC(year, month - 1, day));
}

function saveAllTodos() {
    localStorage.setItem('allTodos', JSON.stringify(allTodos));
}

function saveDailyProductivity() {
    localStorage.setItem('dailyProductivity', JSON.stringify(dailyProductivity));
}

function renderTodos() {
    todoList.innerHTML = ''; // Clear existing list

    const formattedDate = formatDate(currentTodoDate);
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    todoDateDisplay.textContent = currentTodoDate.toLocaleDateString('en-US', options);

    const todosForCurrentDate = allTodos[formattedDate] || [];

    productiveDayStatusSelect.value = dailyProductivity[formattedDate] || 'none';

    if (todosForCurrentDate.length === 0) {
        const messageItem = document.createElement('li');
        messageItem.textContent = 'No tasks for this day. Add one!';
        messageItem.classList.add('no-todos-message');
        todoList.appendChild(messageItem);
        return;
    }

    todosForCurrentDate.forEach((todo, index) => {
        const listItem = document.createElement('li');
        listItem.classList.add('todo-item');
        listItem.setAttribute('draggable', true); // Make list item draggable
        listItem.dataset.index = index; // Store original index for reordering

        if (todo.completed) {
            listItem.classList.add('completed');
        }

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = todo.completed;
        checkbox.addEventListener('change', () => toggleTodo(index));

        const textSpan = document.createElement('span');
        textSpan.textContent = todo.text;

        const deleteButton = document.createElement('button');
        // Changed from '✗' to a more common delete icon symbol (e.g., trash can)
        // You might need to import a font icon library like Font Awesome for actual icons.
        // For now, using a unicode character or an SVG if you have it.
        // Using '&#x1F5D1;' for a trash can emoji, or '&#x2716;' for a heavy multiplication X.
        // For a more stylish look without external fonts, a simple 'X' with CSS styling is often best.
        deleteButton.innerHTML = '&#x2716;'; // Heavy multiplication X for a clean cross icon
        deleteButton.classList.add('delete-todo-btn');
        deleteButton.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent drag start if clicking delete button
            deleteTodo(index);
        });

        listItem.appendChild(checkbox);
        listItem.appendChild(textSpan);
        listItem.appendChild(deleteButton);
        todoList.appendChild(listItem);
    });

    addDragAndDropListeners(); // Attach listeners after rendering
}

function addTodo() {
    const todoText = newTodoInput.value.trim();
    if (todoText === '') {
        showCustomAlert('Please enter a task.', newTodoInput);
        return;
    }

    const formattedDate = formatDate(currentTodoDate);
    if (!allTodos[formattedDate]) {
        allTodos[formattedDate] = [];
    }

    allTodos[formattedDate].push({ text: todoText, completed: false });
    saveAllTodos();
    renderTodos();
    newTodoInput.value = '';
    newTodoInput.focus();
}

function deleteTodo(index) {
    showCustomConfirm('Are you sure you want to delete this task?', () => {
        const formattedDate = formatDate(currentTodoDate);
        if (allTodos[formattedDate]) {
            allTodos[formattedDate].splice(index, 1);
            if (allTodos[formattedDate].length === 0) {
                delete allTodos[formattedDate];
            }
            saveAllTodos();
            renderTodos();
        }
    });
}

function toggleTodo(index) {
    const formattedDate = formatDate(currentTodoDate);
    if (allTodos[formattedDate] && allTodos[formattedDate][index]) {
        allTodos[formattedDate][index].completed = !allTodos[formattedDate][index].completed;
        saveAllTodos();
        renderTodos();
    }
}

productiveDayStatusSelect.addEventListener('change', () => {
    const formattedDate = formatDate(currentTodoDate);
    dailyProductivity[formattedDate] = productiveDayStatusSelect.value;
    saveDailyProductivity();
    if (window.calendarApp && typeof window.calendarApp.updateDayProductivityDisplay === 'function') {
        window.calendarApp.updateDayProductivityDisplay(formattedDate, productiveDayStatusSelect.value);
    }
});

prevDayBtn.addEventListener('click', () => {
    currentTodoDate.setDate(currentTodoDate.getDate() - 1);
    renderTodos();
});

nextDayBtn.addEventListener('click', () => {
    currentTodoDate.setDate(currentTodoDate.getDate() + 1);
    renderTodos();
});

addTodoBtn.addEventListener('click', addTodo);
newTodoInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addTodo();
    }
});

// Drag and Drop Logic
let draggedItem = null;

function addDragAndDropListeners() {
    const todoItems = todoList.querySelectorAll('.todo-item');

    todoItems.forEach(item => {
        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragover', handleDragOver);
        item.addEventListener('dragenter', handleDragEnter);
        item.addEventListener('dragleave', handleDragLeave);
        item.addEventListener('drop', handleDrop);
        item.addEventListener('dragend', handleDragEnd);
    });
}

function handleDragStart(e) {
    draggedItem = this;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
    setTimeout(() => {
        this.classList.add('dragging');
    }, 0);
}

function handleDragOver(e) {
    e.preventDefault(); // Necessary to allow drop
    e.dataTransfer.dropEffect = 'move';
}

function handleDragEnter(e) {
    e.preventDefault();
    if (this !== draggedItem && !this.classList.contains('dragging')) {
        this.classList.add('over');
    }
}

function handleDragLeave() {
    this.classList.remove('over');
}

function handleDrop(e) {
    e.preventDefault();
    this.classList.remove('over');

    if (this !== draggedItem) {
        const formattedDate = formatDate(currentTodoDate);
        const todos = allTodos[formattedDate];

        // Get original indices
        const draggedIndex = parseInt(draggedItem.dataset.index);
        const droppedIndex = parseInt(this.dataset.index);

        // Remove the dragged todo from its original position
        const [removed] = todos.splice(draggedIndex, 1);

        // Insert the dragged todo at the new position
        todos.splice(droppedIndex, 0, removed);
        
        saveAllTodos();
        renderTodos(); // Re-render the list to update display and data-indices
    }
}

function handleDragEnd() {
    const todoItems = todoList.querySelectorAll('.todo-item');
    todoItems.forEach(item => {
        item.classList.remove('dragging', 'over');
    });
    draggedItem = null;
}


// Initial render of To-Do items when the page loads
document.addEventListener('DOMContentLoaded', renderTodos);

// Custom Alert/Confirm Modals (copied from main.js to be self-contained for To-Do)
function showCustomAlert(message, inputToFocus = null) {
    const alertModal = document.createElement('div');
    alertModal.classList.add('custom-modal');
    alertModal.innerHTML = `
        <div class="custom-modal-content">
            <p>${message}</p>
            <button id="custom-alert-ok">OK</button>
        </div>
    `;
    document.body.appendChild(alertModal);

    document.getElementById('custom-alert-ok').addEventListener('click', () => {
        alertModal.remove();
        if (inputToFocus) {
            inputToFocus.focus();
        }
    });

    // Close on outside click
    alertModal.addEventListener('click', (e) => {
        if (e.target === alertModal) {
            alertModal.remove();
            if (inputToFocus) {
                inputToFocus.focus();
            }
        }
    });
}

function showCustomConfirm(message, onConfirm) {
    const confirmModal = document.createElement('div');
    confirmModal.classList.add('custom-modal');
    confirmModal.innerHTML = `
        <div class="custom-modal-content">
            <p>${message}</p>
            <div class="custom-modal-actions">
                <button id="custom-confirm-yes">Yes</button>
                <button id="custom-confirm-no">No</button>
            </div>
        </div>
    `;
    document.body.appendChild(confirmModal);

    document.getElementById('custom-confirm-yes').addEventListener('click', () => {
        onConfirm();
        confirmModal.remove();
    });

    document.getElementById('custom-confirm-no').addEventListener('click', () => {
        confirmModal.remove();
    });

    // Close on outside click
    confirmModal.addEventListener('click', (e) => {
        if (e.target === confirmModal) {
            confirmModal.remove();
        }
    });
}

// NEW: Expose functions/variables globally for inter-script communication
window.todoApp = {
    setCurrentTodoDateAndRender: function(dateString) {
        currentTodoDate = parseDateString(dateString);
        renderTodos();
    },
    isDayProductive: function(dateString) {
        return dailyProductivity[dateString] || 'none';
    }
};