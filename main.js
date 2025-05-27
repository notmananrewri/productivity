const tabs = document.querySelectorAll('nav button');
const sections = document.querySelectorAll('.tab');

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const target = tab.getAttribute('data-tab');
    sections.forEach(sec => {
      sec.classList.remove('active'); // Deactivate all tabs
      if (sec.id === target) {
        sec.classList.add('active'); // Activate the clicked tab
      }
    });
    // If switching to dashboard, re-render the graph
    if (target === 'dashboard' && window.dashboardApp && typeof window.dashboardApp.renderStudyGraph === 'function') {
        window.dashboardApp.renderStudyGraph();
        window.dashboardApp.renderMonthlyProductivityGraph(); // Ensure monthly graph also re-renders
        window.dashboardApp.renderPomodoroStats(); // Ensure pomodoro stats also re-render
        window.dashboardApp.renderMonthlyProductivityStats(); // Ensure monthly stats also re-render
    }
  });
});

const timerDisplay = document.getElementById('timer-display');
const resetBtn = document.getElementById('reset-btn');
const settingsBtn = document.getElementById('settings-btn');
const settingsPopup = document.getElementById('settings-popup');
const saveSettingsBtn = document.getElementById('save-settings');
const cancelSettingsBtn = document.getElementById('cancel-settings');

const focusInput = document.getElementById('focus-time');
const breakInput = document.getElementById('break-time');
const longBreakInput = document.getElementById('long-break-time');
const longBreakCycleInput = document.getElementById('long-break-cycle');

// Subject elements
const subjectSelect = document.getElementById('subject-select');
const pomodoroSubjectDisplay = document.getElementById('pomodoro-subject-display');

let timer = null;
let isRunning = false;
let isPaused = false;
let currentMode = 'focus'; // 'focus', 'break', 'longBreak'
let cycleCount = 0;

let focusTime = parseInt(focusInput.value) * 60;
let breakTime = parseInt(breakInput.value) * 60;
let longBreakTime = parseInt(longBreakInput.value) * 60;
let longBreakCycle = parseInt(longBreakCycleInput.value);

let timeLeft = focusTime;
let selectedSubject = localStorage.getItem('pomodoroSelectedSubject') || 'No Subject Selected'; // Load from localStorage

// Alarm sound variables
let alarmInterval = null; // To control the intermittent alarm

// NEW: Function to play a single, short beep
function playSingleBeep() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        if (!audioContext) {
            console.warn("AudioContext not supported, cannot play beep.");
            return;
        }

        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.type = 'sine'; // Softer waveform
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime); // Slightly higher, less harsh frequency

        gainNode.gain.setValueAtTime(0.7, audioContext.currentTime); // Volume
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.15); // Fade out quickly

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2); // Play for 0.2 seconds

        // Close the audio context after the sound has played to release resources
        oscillator.onended = () => {
            audioContext.close();
        };

    } catch (e) {
        console.error("Error playing single beep:", e);
    }
}

// Function to start the intermittent alarm
function startIntermittentAlarm() {
    // Stop any existing alarm first
    stopAlarmSound();
    // Play the first beep immediately
    playSingleBeep();
    // Then set an interval to play subsequent beeps
    alarmInterval = setInterval(playSingleBeep, 2000); // Beep every 2 seconds
}

// Function to stop the intermittent alarm sound
function stopAlarmSound() {
    if (alarmInterval) {
        clearInterval(alarmInterval);
        alarmInterval = null;
    }
}


// Function to record a completed focus session
function recordStudySession(subject, durationMinutes) {
    const today = new Date();
    const dateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    let sessions = JSON.parse(localStorage.getItem('pomodoroStudySessions') || '[]');
    
    sessions.push({
        date: dateKey,
        subject: subject,
        duration: durationMinutes // Duration in minutes
    });
    
    localStorage.setItem('pomodoroStudySessions', JSON.stringify(sessions));
    console.log(`Recorded session: ${durationMinutes} mins of ${subject} on ${dateKey}`);

    // Trigger dashboard update
    if (window.dashboardApp && typeof window.dashboardApp.renderPomodoroStats === 'function') {
        window.dashboardApp.renderPomodoroStats();
        window.dashboardApp.renderStudyGraph();
    }
}


function updateDisplay() {
  const min = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const sec = (timeLeft % 60).toString().padStart(2, '0');
  timerDisplay.textContent = `${min}:${sec}`;
  pomodoroSubjectDisplay.textContent = selectedSubject; // Update subject display
}

function updateTimerColor() {
  // First, remove all mode-specific and state-specific classes
  timerDisplay.classList.remove('running', 'paused', 'focus', 'break', 'longBreak', 'waiting-for-click');

  if (isWaitingForClick) { // Check for waiting state first
    timerDisplay.classList.add('waiting-for-click');
  } else if (isRunning) {
    // If running, apply the current mode's color
    timerDisplay.classList.add(currentMode);
    timerDisplay.classList.add('running'); // Keep 'running' for potential animations
  } else if (isPaused) {
    // If paused, apply the 'paused' color
    timerDisplay.classList.add('paused');
  } else {
    // If neither running nor paused (i.e., reset or initial state),
    // revert to default background color (which is set in style.css for .timer-circle)
    timerDisplay.classList.remove('running', 'paused', 'focus', 'break', 'longBreak');
    timerDisplay.style.backgroundColor = '';
    timerDisplay.style.boxShadow = '';
  }
}


function startTimer() {
  if (isRunning) return;
  isRunning = true;
  isPaused = false;
  isWaitingForClick = false; // Ensure this is false when starting
  stopAlarmSound(); // Ensure alarm is off if somehow still on

  // Make sure the subject is the one currently selected in the dropdown when starting
  // This is important because the user might change it without saving settings.
  selectedSubject = subjectSelect.value === 'none' ? 'No Subject Selected' : subjectSelect.options[subjectSelect.selectedIndex].text;
  localStorage.setItem('pomodoroSelectedSubject', selectedSubject); // Save selected subject immediately
  updateTimerColor(); // Update color immediately when starting

  timer = setInterval(() => {
    timeLeft--;
    if (timeLeft <= 0) {
      clearInterval(timer);
      isRunning = false; // Timer has finished
      isPaused = true; // Set to paused state
      isWaitingForClick = true; // Set waiting state
      startIntermittentAlarm(); // NEW: Play intermittent alarm
      updateTimerColor(); // Update color to waiting state
      updateDisplay(); // Ensure display is 00:00

      // REMOVED: Automatic startTimer() call here
      // The user now has to click to proceed
      return; // Exit to prevent further execution until clicked
    } else {
      updateDisplay();
    }
  }, 1000);
}

function pauseTimer() {
  if (!isRunning) return;
  clearInterval(timer);
  isRunning = false;
  isPaused = true;
  isWaitingForClick = false; // Not waiting, just paused
  stopAlarmSound(); // Ensure alarm is off if pausing mid-alarm (unlikely but good)
  updateTimerColor(); // Update color immediately when pausing
}

function resetTimer() {
  clearInterval(timer);
  isRunning = false;
  isPaused = false;
  isWaitingForClick = false; // Reset waiting state
  currentMode = 'focus'; // Always reset to focus mode, but color will be grey initially
  cycleCount = 0;
  timeLeft = focusTime;
  stopAlarmSound(); // Stop alarm on reset
  updateDisplay();
  updateTimerColor(); // Update color to the "grey" reset state
  
  // Reset subject display to the one loaded/defaulted at startup
  selectedSubject = localStorage.getItem('pomodoroSelectedSubject') || 'No Subject Selected';
  // Also ensure the dropdown reflects this
  subjectSelect.value = 'none'; // Default to "No Subject Selected"
  for(let i=0; i<subjectSelect.options.length; i++){
    if(subjectSelect.options[i].text === selectedSubject){
        subjectSelect.value = subjectSelect.options[i].value;
        break;
    }
  }
  updateDisplay(); // Update display after subject potentially changes
}

timerDisplay.addEventListener('click', () => {
  if (isWaitingForClick) { // If waiting, acknowledge and proceed
    isWaitingForClick = false;
    stopAlarmSound(); // Stop the alarm
    
    // Logic to determine next mode (copied from original timer completion)
    if (currentMode === 'focus') {
      // Record the completed focus session (already done when timeLeft hits 0)
      cycleCount++;
      if (cycleCount % longBreakCycle === 0) {
        currentMode = 'longBreak';
        timeLeft = longBreakTime;
      } else {
        currentMode = 'break';
        timeLeft = breakTime;
      }
    } else { // If it was break or longBreak, next is always focus
      currentMode = 'focus';
      timeLeft = focusTime;
      // When returning to focus, reset selectedSubject to current dropdown value
      selectedSubject = subjectSelect.value === 'none' ? 'No Subject Selected' : subjectSelect.options[subjectSelect.selectedIndex].text;
      localStorage.setItem('pomodoroSelectedSubject', selectedSubject);
    }
    updateDisplay(); // Update display with new time/mode
    startTimer(); // Start the next phase
  } else if (!isRunning && !isPaused) { // Start from initial state
    startTimer();
  } else if (isRunning) { // Pause if running
    pauseTimer();
  } else if (isPaused) { // Resume if paused
    startTimer();
  }
});

resetBtn.addEventListener('click', resetTimer);

settingsBtn.addEventListener('click', () => {
  // When opening settings, make sure the dropdown reflects the currently selected subject
  let currentSubjectValue = 'none'; // Default to "No Subject Selected"
  for(let i=0; i<subjectSelect.options.length; i++){
    if(subjectSelect.options[i].text === selectedSubject){
        currentSubjectValue = subjectSelect.options[i].value;
        break;
    }
  }
  subjectSelect.value = currentSubjectValue;

  settingsPopup.classList.remove('hidden');
});

cancelSettingsBtn.addEventListener('click', () => {
  settingsPopup.classList.add('hidden');
});

saveSettingsBtn.addEventListener('click', () => {
  const newFocus = parseInt(focusInput.value);
  const newBreak = parseInt(breakInput.value);
  const newLongBreak = parseInt(longBreakInput.value);
  const newLongBreakCycle = parseInt(longBreakCycleInput.value);
  const newSelectedSubjectValue = subjectSelect.value;
  const newSelectedSubjectText = subjectSelect.options[subjectSelect.selectedIndex].text;

  if (
    newFocus >= 1 && newFocus <= 180 &&
    newBreak >= 1 && newBreak <= 60 &&
    newLongBreak >= 1 && newLongBreak <= 60 &&
    newLongBreakCycle >= 1 && newLongBreakCycle <= 10
  ) {
    focusTime = newFocus * 60;
    breakTime = newBreak * 60;
    longBreakTime = newLongBreak * 60;
    longBreakCycle = newLongBreakCycle;

    // Update the selected subject when settings are saved
    selectedSubject = newSelectedSubjectText;
    localStorage.setItem('pomodoroSelectedSubject', selectedSubject);

    resetTimer(); // Reset timer to apply new settings and ensure grey color
    settingsPopup.classList.add('hidden');
  } else {
    // Replaced alert with custom modal for consistency
    showCustomAlert('Please enter valid values in all fields.', focusInput);
  }
});

// Initialize display and color on load
// Ensure subject display is updated at load based on localStorage
// Also, ensure the subject select dropdown matches the loaded subject
document.addEventListener('DOMContentLoaded', () => {
    // Ensure Dashboard tab is active on load
    const dashboardTabButton = document.querySelector('nav button[data-tab="dashboard"]');
    if (dashboardTabButton) {
        dashboardTabButton.click(); // Simulate a click on the Dashboard tab button
    } else {
        // Fallback to Pomodoro if Dashboard button doesn't exist (e.g., if it was removed again)
        const pomodoroSection = document.getElementById('pomodoro');
        if (pomodoroSection) {
            sections.forEach(sec => {
                sec.classList.remove('active');
            });
            pomodoroSection.classList.add('active');
        }
    }

    updateDisplay();
    updateTimerColor(); // Initial call to set the default grey color

    let currentSubjectValue = 'none';
    for(let i=0; i<subjectSelect.options.length; i++){
        if(subjectSelect.options[i].text === selectedSubject){
            currentSubjectValue = subjectSelect.options[i].value;
            break;
        }
    }
    subjectSelect.value = currentSubjectValue;
});

// Custom Alert/Confirm Modals (copied from extra.js to be self-contained for Pomodoro)
// These functions prevent the use of browser's default alert/confirm which are blocked in some environments.
// NOTE: These functions are duplicated across main.js, calendar.js, and todo.js.
// For a cleaner solution, consider moving them to a single utility file (e.g., `utils.js`)
// and including that file before all others. For now, they are kept here for self-containment.
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
