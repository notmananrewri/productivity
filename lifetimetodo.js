// Lifetime To-Do List Logic
const lifetimeNewTodoInput = document.getElementById('lifetime-new-todo-input');
const lifetimeAddTodoBtn = document.getElementById('lifetime-add-todo-btn');
const lifetimeTodoList = document.getElementById('lifetime-todo-list');

// Use a single array to store lifetime todos
let lifetimeTodos = JSON.parse(localStorage.getItem('lifetimeTodos') || '[]');

function saveLifetimeTodos() {
    localStorage.setItem('lifetimeTodos', JSON.stringify(lifetimeTodos));
}

function renderLifetimeTodos() {
    lifetimeTodoList.innerHTML = ''; // Clear existing list

    if (lifetimeTodos.length === 0) {
        const messageItem = document.createElement('li');
        messageItem.textContent = 'No lifetime tasks. Add one!';
        messageItem.classList.add('no-todos-message');
        lifetimeTodoList.appendChild(messageItem);
        return;
    }

    lifetimeTodos.forEach((todo, index) => {
        const listItem = document.createElement('li');
        listItem.classList.add('todo-item'); // Reuse existing todo-item styling
        listItem.setAttribute('draggable', true); // Make list item draggable
        listItem.dataset.index = index; // Store original index for reordering

        if (todo.completed) {
            listItem.classList.add('completed');
        }

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = todo.completed;
        checkbox.addEventListener('change', () => toggleLifetimeTodo(index));

        const textSpan = document.createElement('span');
        textSpan.textContent = todo.text;

        const deleteButton = document.createElement('button');
        deleteButton.innerHTML = '&#x2716;'; // Stylish X icon
        deleteButton.classList.add('delete-todo-btn'); // Reuse existing delete button styling
        deleteButton.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent drag start if clicking delete button
            deleteLifetimeTodo(index);
        });

        listItem.appendChild(checkbox);
        listItem.appendChild(textSpan);
        listItem.appendChild(deleteButton);
        lifetimeTodoList.appendChild(listItem);
    });

    addLifetimeDragAndDropListeners(); // Attach drag-and-drop listeners
}

function addLifetimeTodo() {
    const todoText = lifetimeNewTodoInput.value.trim();
    if (todoText === '') {
        showCustomAlert('Please enter a task.', lifetimeNewTodoInput); // Reusing global alert
        return;
    }

    lifetimeTodos.push({ text: todoText, completed: false });
    saveLifetimeTodos();
    renderLifetimeTodos();
    lifetimeNewTodoInput.value = ''; // Clear the input field
    lifetimeNewTodoInput.focus();
}

function deleteLifetimeTodo(index) {
    showCustomConfirm('Are you sure you want to delete this task?', () => { // Reusing global confirm
        lifetimeTodos.splice(index, 1);
        saveLifetimeTodos();
        renderLifetimeTodos();
    });
}

function toggleLifetimeTodo(index) {
    if (lifetimeTodos[index]) {
        lifetimeTodos[index].completed = !lifetimeTodos[index].completed;
        saveLifetimeTodos();
        renderLifetimeTodos();
    }
}

// Event Listeners for Lifetime To-Do List
lifetimeAddTodoBtn.addEventListener('click', addLifetimeTodo);
lifetimeNewTodoInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addLifetimeTodo();
    }
});

// Drag and Drop Logic for Lifetime To-Do
let draggedLifetimeItem = null;

function addLifetimeDragAndDropListeners() {
    const lifetimeTodoItems = lifetimeTodoList.querySelectorAll('.todo-item');

    lifetimeTodoItems.forEach(item => {
        item.addEventListener('dragstart', handleLifetimeDragStart);
        item.addEventListener('dragover', handleLifetimeDragOver);
        item.addEventListener('dragenter', handleLifetimeDragEnter);
        item.addEventListener('dragleave', handleLifetimeDragLeave);
        item.addEventListener('drop', handleLifetimeDrop);
        item.addEventListener('dragend', handleLifetimeDragEnd);
    });
}

function handleLifetimeDragStart(e) {
    draggedLifetimeItem = this;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
    setTimeout(() => {
        this.classList.add('dragging');
    }, 0);
}

function handleLifetimeDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleLifetimeDragEnter(e) {
    e.preventDefault();
    if (this !== draggedLifetimeItem && !this.classList.contains('dragging')) {
        this.classList.add('over');
    }
}

function handleLifetimeDragLeave() {
    this.classList.remove('over');
}

function handleLifetimeDrop(e) {
    e.preventDefault();
    this.classList.remove('over');

    if (this !== draggedLifetimeItem) {
        // Get original indices
        const draggedIndex = parseInt(draggedLifetimeItem.dataset.index);
        const droppedIndex = parseInt(this.dataset.index);

        // Remove the dragged todo from its original position
        const [removed] = lifetimeTodos.splice(draggedIndex, 1);

        // Insert the dragged todo at the new position
        lifetimeTodos.splice(droppedIndex, 0, removed);
        
        saveLifetimeTodos();
        renderLifetimeTodos(); // Re-render the list to update display and data-indices
    }
}

function handleLifetimeDragEnd() {
    const lifetimeTodoItems = lifetimeTodoList.querySelectorAll('.todo-item');
    lifetimeTodoItems.forEach(item => {
        item.classList.remove('dragging', 'over');
    });
    draggedLifetimeItem = null;
}

// Initial render of Lifetime To-Do items when the page loads
document.addEventListener('DOMContentLoaded', renderLifetimeTodos);

// Note: showCustomAlert and showCustomConfirm are assumed to be globally available
// from main.js or another utility script. If not, you might need to copy them here
// or ensure they are properly exposed.
