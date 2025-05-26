// Calendar Tab Logic
const calendarBody = document.getElementById('calendar-body');
const monthYearDisplay = document.getElementById('month-year');
const prevMonthBtn = document.getElementById('prev-month');
const nextMonthBtn = document.getElementById('next-month');

const eventModal = document.getElementById('event-modal');
const eventDateDisplay = document.getElementById('event-date-display');
const eventNameInput = document.getElementById('event-name');
const saveEventBtn = document.getElementById('save-event');
const cancelEventBtn = document.getElementById('cancel-event');

const upcomingEventsList = document.getElementById('upcoming-events-list');

let currentDate = new Date(); // tracks current calendar month/year
let selectedDate = null;      // stores date clicked for event adding/editing

// Load events from localStorage or empty object
const savedEvents = JSON.parse(localStorage.getItem('calendarEvents') || '{}');

// Helper function to format a Date object into a YYYY-MM-DD string
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function saveEvents() {
  localStorage.setItem('calendarEvents', JSON.stringify(savedEvents));
  renderUpcomingEvents(); // Call this whenever events are saved
}

function renderCalendar(date) {
  calendarBody.innerHTML = ''; // clear existing days

  const year = date.getFullYear();
  const month = date.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  monthYearDisplay.textContent = `${monthNames[month]} ${year}`;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let dayCount = 1;

  for (let i = 0; i < 6; i++) {
    const row = document.createElement('tr');

    for (let j = 0; j < 7; j++) {
      const cell = document.createElement('td');

      if (i === 0 && j < firstDay) {
        cell.classList.add('empty');
        cell.textContent = '';
      } else if (dayCount > daysInMonth) {
        cell.classList.add('empty');
        cell.textContent = '';
      } else {
        cell.classList.add('day');
        cell.textContent = dayCount;

        const dayKey = `${year}-${String(month + 1).padStart(2,'0')}-${String(dayCount).padStart(2,'0')}`;
        cell.dataset.date = dayKey; // Add data-date attribute for easier selection

        if (savedEvents[dayKey]) {
          cell.classList.add('has-event');
          cell.title = savedEvents[dayKey];
        }

        const today = new Date();
        if (
          dayCount === today.getDate() &&
          month === today.getMonth() &&
          year === today.getFullYear()
        ) {
          cell.classList.add('today');
        }

        // Apply productivity styling on render
        // Ensure window.todoApp and its function are available before calling
        if (window.todoApp && typeof window.todoApp.isDayProductive === 'function') {
            const productivityStatus = window.todoApp.isDayProductive(dayKey);
            cell.classList.remove('productive-day-calendar', 'non-productive-day-calendar'); // Clear existing classes
            if (productivityStatus === 'yes') {
                cell.classList.add('productive-day-calendar');
            } else if (productivityStatus === 'no') {
                cell.classList.add('non-productive-day-calendar');
            }
            // If 'none', no specific class is added, so it defaults to the base color.
        }


        cell.addEventListener('click', () => {
          selectedDate = dayKey;
          eventDateDisplay.textContent = `Date: ${dayKey}`;
          eventNameInput.value = savedEvents[dayKey] || '';
          eventModal.classList.remove('hidden');
          eventNameInput.focus();

          // Ensure the "Go to To-Do" button is correctly added/updated
          updateGoToTodoButton(dayKey);
        });

        dayCount++;
      }

      row.appendChild(cell);
    }

    calendarBody.appendChild(row);
  }
  renderUpcomingEvents(); // Ensure upcoming events are re-rendered with new listeners
}

function renderUpcomingEvents() {
  upcomingEventsList.innerHTML = '';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcoming = [];
  for (const dateKey in savedEvents) {
    const eventDate = new Date(dateKey);
    eventDate.setHours(0, 0, 0, 0);

    if (eventDate >= today) {
      upcoming.push({ date: dateKey, name: savedEvents[dateKey] });
    }
  }

  upcoming.sort((a, b) => new Date(a.date) - new Date(b.date));

  const displayLimit = 7;
  for (let i = 0; i < Math.min(upcoming.length, displayLimit); i++) {
    const event = upcoming[i];
    const listItem = document.createElement('li');

    const dateObj = new Date(event.date + 'T00:00:00');
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    const formattedDate = dateObj.toLocaleDateString('en-US', options);

    listItem.innerHTML = `<strong>${formattedDate}</strong>: ${event.name}`;
    // Add click listener to the list item
    listItem.addEventListener('click', () => {
        selectedDate = event.date; // Set the selectedDate to the event's date
        eventDateDisplay.textContent = `Date: ${event.date}`; // Display the full date key
        eventNameInput.value = event.name; // Pre-fill with the event name
        eventModal.classList.remove('hidden'); // Show the modal

        // Ensure the "Go to To-Do" button is correctly added/updated
        updateGoToTodoButton(event.date);
        
        eventNameInput.focus();
    });

    upcomingEventsList.appendChild(listItem);
  }

  if (upcoming.length === 0) {
    const listItem = document.createElement('li');
    listItem.textContent = 'No upcoming events.';
    upcomingEventsList.appendChild(listItem);
  }
}

// NEW: Centralized function to create/update and manage "Go to To-Do" button
function updateGoToTodoButton(dateKey) {
    let goToTodoBtn = eventModal.querySelector('.go-to-todo-btn');
    const popupActions = eventModal.querySelector('.popup-actions');

    if (!goToTodoBtn) {
        goToTodoBtn = document.createElement('button');
        goToTodoBtn.textContent = 'Go to To-Do';
        goToTodoBtn.classList.add('go-to-todo-btn'); // Add a class for styling
        goToTodoBtn.style.backgroundColor = 'var(--green-muted)'; // Example styling
        goToTodoBtn.style.color = '#fff';
        goToTodoBtn.style.border = 'none';
        goToTodoBtn.style.padding = '10px 20px';
        goToTodoBtn.style.borderRadius = '8px';
        goToTodoBtn.style.cursor = 'pointer';
        goToTodoBtn.style.fontWeight = '600';
        goToTodoBtn.style.transition = 'background-color 0.3s';
        
        // NEW: Insert it as the first button in the popup-actions div
        popupActions.insertBefore(goToTodoBtn, popupActions.firstChild);
    } else {
        // If it exists, just update its text (if needed) and ensure listener is fresh
        goToTodoBtn.textContent = 'Go to To-Do';
        // Remove existing listener to prevent duplicates
        const oldGoToTodoBtn = goToTodoBtn;
        goToTodoBtn = oldGoToTodoBtn.cloneNode(true);
        oldGoToTodoBtn.parentNode.replaceChild(goToTodoBtn, oldGoToTodoBtn);
    }

    // Attach the event listener
    goToTodoBtn.addEventListener('click', () => {
        if (window.todoApp && typeof window.todoApp.setCurrentTodoDateAndRender === 'function') {
            window.todoApp.setCurrentTodoDateAndRender(dateKey); // Pass the date string
            const todoTabButton = document.querySelector('nav button[data-tab="todo"]');
            if (todoTabButton) {
                todoTabButton.click(); // Simulate a click on the To-Do tab button
            }
        } else {
            console.error('todo.js functions not accessible or not loaded.');
            showCustomAlert('Error: Could not navigate to To-Do. Please refresh the page.');
        }
        eventModal.classList.add('hidden'); // Hide calendar modal
        // Remove the button after use to clean up
        goToTodoBtn.remove();
    });
}


prevMonthBtn.addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar(currentDate);
});

nextMonthBtn.addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar(currentDate);
});

saveEventBtn.addEventListener('click', () => {
  const eventName = eventNameInput.value.trim();
  if (!eventName) {
    showCustomAlert('Please enter an event name.', eventNameInput);
    return;
  }

  savedEvents[selectedDate] = eventName;
  saveEvents();
  renderCalendar(currentDate); // Re-render calendar to update event display
  eventModal.classList.add('hidden');
  // Remove the "Go to To-Do" button when closing the modal
  const goToTodoBtn = eventModal.querySelector('.go-to-todo-btn');
  if (goToTodoBtn) {
      goToTodoBtn.remove();
  }
});

cancelEventBtn.addEventListener('click', () => {
  eventModal.classList.add('hidden');
  // Remove the "Go to To-Do" button when closing the modal
  const goToTodoBtn = eventModal.querySelector('.go-to-todo-btn');
  if (goToTodoBtn) {
      goToTodoBtn.remove();
  }
});

window.addEventListener('click', (e) => {
  if (e.target === eventModal) {
    eventModal.classList.add('hidden');
    // Remove the "Go to To-Do" button when closing the modal
    const goToTodoBtn = eventModal.querySelector('.go-to-todo-btn');
    if (goToTodoBtn) {
        goToTodoBtn.remove();
    }
  }
});

// Initial render
renderCalendar(currentDate);

// Add Delete button if it doesn't exist (ensuring it's only added once)
const deleteEventBtn = document.createElement('button');
deleteEventBtn.textContent = 'Delete';
deleteEventBtn.style.backgroundColor = '#b33a3a';
deleteEventBtn.style.color = '#fff';
deleteEventBtn.style.border = 'none';
deleteEventBtn.style.padding = '8px 16px';
deleteEventBtn.style.borderRadius = '8px';
deleteEventBtn.style.cursor = 'pointer';
deleteEventBtn.style.fontWeight = '600';
deleteEventBtn.id = 'delete-event-btn'; // Give it an ID to check for existence

const popupActions = eventModal.querySelector('.popup-actions');
// Check if the delete button is already appended to prevent duplicates
if (!document.getElementById('delete-event-btn')) {
  if (cancelEventBtn) {
    popupActions.insertBefore(deleteEventBtn, cancelEventBtn);
  } else {
    popupActions.appendChild(deleteEventBtn);
  }
}

deleteEventBtn.addEventListener('click', () => {
  if (!selectedDate) return;

  showCustomConfirm('Are you sure you want to delete this event?', () => {
    if (savedEvents[selectedDate]) {
      delete savedEvents[selectedDate];
      saveEvents();
      renderCalendar(currentDate); // Re-render calendar to update after deletion
    }
    eventModal.classList.add('hidden');
    // Remove the "Go to To-Do" button after deletion
    const goToTodoBtn = eventModal.querySelector('.go-to-todo-btn');
    if (goToTodoBtn) {
        goToTodoBtn.remove();
    }
  });
});

// Expose function globally for todo.js to update calendar day colors
window.calendarApp = {
    updateDayProductivityDisplay: function(dateKey, status) { // 'status' can be "yes", "no", or "none"
        const cell = document.querySelector(`.calendar-table td[data-date="${dateKey}"]`);
        if (cell) {
            cell.classList.remove('productive-day-calendar', 'non-productive-day-calendar'); // Clear existing classes
            if (status === 'yes') {
                cell.classList.add('productive-day-calendar');
            } else if (status === 'no') {
                cell.classList.add('non-productive-day-calendar');
            }
            // If 'none', no specific class is added, so it defaults to the base color.
        }
    }
};


// Custom Alert/Confirm Modals (to replace browser's alert/confirm)
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
