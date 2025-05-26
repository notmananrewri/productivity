// Dashboard Logic
const motivationalQuoteElement = document.getElementById('motivational-quote');
const studyGraphContainer = document.getElementById('study-graph-container');
const studyTimeChartCanvas = document.getElementById('studyTimeChart');

// Pomodoro Stats Elements
const totalSessionsElement = document.getElementById('total-sessions');
const totalStudyTimeElement = document.getElementById('total-study-time');
const avgSessionLengthElement = document.getElementById('avg-session-length');

// Monthly Productivity Elements
const monthlyProductivityGraphContainer = document.getElementById('monthly-productivity-graph-container');
const monthlyProductivityChartCanvas = document.getElementById('monthlyProductivityChart');
const productiveMonthsCountElement = document.getElementById('productive-months-count');
const nonProductiveMonthsCountElement = document.getElementById('non-productive-months-count');
const mostProductiveMonthElement = document.getElementById('most-productive-month');

// NEW: Task Completion Elements
const totalTasksAddedElement = document.getElementById('total-tasks-added');
const totalTasksCompletedElement = document.getElementById('total-tasks-completed');
const completionRateElement = document.getElementById('completion-rate');
const taskCompletionChartCanvas = document.getElementById('taskCompletionChart');
const taskCompletionGraphContainer = document.getElementById('task-completion-graph-container');


let studyTimeChartInstance = null; // To hold the Chart.js instance for weekly study
let monthlyProductivityChartInstance = null; // To hold the Chart.js instance for monthly productivity
let taskCompletionChartInstance = null; // NEW: To hold the Chart.js instance for daily task completion

const quotes = [
  "The best way to predict the future is to create it.",
  "The secret of getting ahead is getting started.",
  "It does not matter how slowly you go as long as you do not stop.",
  "Believe you can and you're halfway there.",
  "The only way to do great work is to love what you do."
];

function displayRandomQuote() {
  const randomIndex = Math.floor(Math.random() * quotes.length);
  motivationalQuoteElement.textContent = quotes[randomIndex];
}

function getWeekNumber(d) {
    // Copy date so don't modify original
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    // Set to nearest Thursday: current date + 4 - current day number
    // (Sunday = 0, Monday = 1, etc.)
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    // Get first day of year
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    // Calculate full weeks to nearest Thursday
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return weekNo;
}

function renderStudyGraph() {
    const allSessions = JSON.parse(localStorage.getItem('pomodoroStudySessions') || '[]');
    
    // Get current week number
    const today = new Date();
    const currentWeek = getWeekNumber(today);
    const currentYear = today.getFullYear();

    // Filter sessions for the current week and aggregate by subject
    const weeklyStudyData = {}; // { 'English': 120, 'Physics': 90 } (in minutes)

    allSessions.forEach(session => {
        const sessionDate = new Date(session.date + 'T00:00:00'); // Add T00:00:00 to avoid timezone issues
        const sessionWeek = getWeekNumber(sessionDate);
        const sessionYear = sessionDate.getFullYear();

        if (sessionWeek === currentWeek && sessionYear === currentYear) {
            const subject = session.subject;
            const duration = session.duration; // Already in minutes
            weeklyStudyData[subject] = (weeklyStudyData[subject] || 0) + duration;
        }
    });

    // Prepare data for Chart.js
    const subjects = ['English', 'Physics', 'Chemistry', 'Maths']; // Ensure consistent order
    const dataValues = subjects.map(subject => (weeklyStudyData[subject] || 0) / 60); // Convert minutes to hours

    if (studyTimeChartInstance) {
        studyTimeChartInstance.destroy(); // Destroy existing chart before creating a new one
    }

    const ctx = studyTimeChartCanvas.getContext('2d');
    studyTimeChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: subjects,
            datasets: [{
                label: `Study Time (Hours) - Week ${currentWeek}, ${currentYear}`,
                data: dataValues,
                backgroundColor: [
                    'rgba(75, 192, 192, 0.6)', // English (Teal)
                    'rgba(54, 162, 235, 0.6)', // Physics (Blue)
                    'rgba(255, 206, 86, 0.6)', // Chemistry (Yellow)
                    'rgba(153, 102, 255, 0.6)' // Maths (Purple)
                ],
                borderColor: [
                    'rgba(75, 192, 192, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(153, 102, 255, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Hours Studied',
                        color: '#FFFFFF' // White color for Y-axis title
                    },
                    ticks: {
                        color: '#FFFFFF' // White color for Y-axis ticks
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.2)', // Lighter grid lines
                        drawBorder: false // Hide axis line itself
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Subject',
                        color: '#FFFFFF' // White color for X-axis title
                    },
                    ticks: {
                        color: '#FFFFFF' // White color for X-axis ticks
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.2)', // Lighter grid lines
                        drawBorder: false // Hide axis line itself
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#FFFFFF' // White color for legend text
                    }
                },
                title: {
                    display: true,
                    text: 'Weekly Study Time',
                    color: '#FFFFFF', // White color for chart title
                    font: {
                        size: 18
                    }
                }
            }
        }
    });

    // Hide placeholder if chart is rendered
    if (dataValues.some(val => val > 0)) { // If there's any data
        studyGraphContainer.querySelector('.graph-placeholder').style.display = 'none';
        studyTimeChartCanvas.style.display = 'block';
    } else {
        studyGraphContainer.querySelector('.graph-placeholder').textContent = 'No study data for this week yet.';
        studyGraphContainer.querySelector('.graph-placeholder').style.display = 'block';
        studyTimeChartCanvas.style.display = 'none';
    }
}

function renderPomodoroStats() {
    const allSessions = JSON.parse(localStorage.getItem('pomodoroStudySessions') || '[]');

    let totalSessions = allSessions.length;
    let totalStudyMinutes = 0;

    allSessions.forEach(session => {
        totalStudyMinutes += session.duration;
    });

    const totalStudyHours = (totalStudyMinutes / 60).toFixed(1); // One decimal place
    const averageSessionLength = totalSessions > 0 ? (totalStudyMinutes / totalSessions).toFixed(1) : 0;

    totalSessionsElement.textContent = totalSessions;
    totalStudyTimeElement.textContent = `${totalStudyHours} hours`;
    avgSessionLengthElement.textContent = `${averageSessionLength} mins`;
}

// Function to render monthly productivity graph
function renderMonthlyProductivityGraph() {
    // Ensure window.todoApp is available before trying to access its functions
    if (!window.todoApp || typeof window.todoApp.isDayProductive !== 'function') {
        console.error('todo.js functions not accessible for monthly productivity graph.');
        monthlyProductivityGraphContainer.querySelector('.graph-placeholder').textContent = 'Error: To-Do data not loaded.';
        monthlyProductivityGraphContainer.querySelector('.graph-placeholder').style.display = 'block';
        monthlyProductivityChartCanvas.style.display = 'none';
        return;
    }

    const dailyProductivityData = JSON.parse(localStorage.getItem('dailyProductivity') || '{}');
    const monthlyProductivity = {}; // { 'YYYY-MM': { productiveDays: 0, nonProductiveDays: 0, totalDays: 0 } }
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // Aggregate daily productivity into monthly counts
    for (const dateKey in dailyProductivityData) {
        const [year, month, day] = dateKey.split('-');
        const monthYearKey = `${year}-${month}`; // YYYY-MM

        if (!monthlyProductivity[monthYearKey]) {
            monthlyProductivity[monthYearKey] = { productiveDays: 0, nonProductiveDays: 0, totalDays: 0 };
        }

        const status = dailyProductivityData[dateKey];
        if (status === 'yes') {
            monthlyProductivity[monthYearKey].productiveDays++;
        } else if (status === 'no') {
            monthlyProductivity[monthYearKey].nonProductiveDays++;
        }
        monthlyProductivity[monthYearKey].totalDays++; // Count all days with a status
    }

    // Sort months chronologically
    const sortedMonthKeys = Object.keys(monthlyProductivity).sort();

    const labels = sortedMonthKeys.map(key => {
        const [year, monthNum] = key.split('-');
        return `${monthNames[parseInt(monthNum) - 1]} ${year.slice(2)}`; // e.g., "Jan 24"
    });

    const productiveDaysData = sortedMonthKeys.map(key => monthlyProductivity[key].productiveDays);
    const nonProductiveDaysData = sortedMonthKeys.map(key => monthlyProductivity[key].nonProductiveDays);

    if (monthlyProductivityChartInstance) {
        monthlyProductivityChartInstance.destroy();
    }

    const ctx = monthlyProductivityChartCanvas.getContext('2d');
    monthlyProductivityChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Productive Days',
                    data: productiveDaysData,
                    backgroundColor: 'rgba(0, 255, 0, 0.6)', // Green for productive
                    borderColor: 'rgba(0, 255, 0, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Non-Productive Days',
                    data: nonProductiveDaysData,
                    backgroundColor: 'rgba(255, 0, 0, 0.6)', // Red for non-productive
                    borderColor: 'rgba(255, 0, 0, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    stacked: true, // Stack bars for total days
                    title: {
                        display: true,
                        text: 'Month',
                        color: '#FFFFFF'
                    },
                    ticks: {
                        color: '#FFFFFF'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.2)',
                        drawBorder: false
                    }
                },
                y: {
                    stacked: true, // Stack bars for total days
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Days',
                        color: '#FFFFFF'
                    },
                    ticks: {
                        color: '#FFFFFF'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.2)',
                        drawBorder: false
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#FFFFFF'
                    }
                },
                title: {
                    display: true,
                    text: 'Monthly Productivity Overview',
                    color: '#FFFFFF',
                    font: {
                        size: 18
                    }
                }
            }
        }
    });

    // Hide placeholder if chart is rendered
    if (sortedMonthKeys.length > 0) {
        monthlyProductivityGraphContainer.querySelector('.graph-placeholder').style.display = 'none';
        monthlyProductivityChartCanvas.style.display = 'block';
    } else {
        monthlyProductivityGraphContainer.querySelector('.graph-placeholder').textContent = 'No productivity data yet.';
        monthlyProductivityGraphContainer.querySelector('.graph-placeholder').style.display = 'block';
        monthlyProductivityChartCanvas.style.display = 'none';
    }
}

// Function to render monthly productivity stats
function renderMonthlyProductivityStats() {
    const dailyProductivityData = JSON.parse(localStorage.getItem('dailyProductivity') || '{}');
    const monthlyProductivity = {}; // { 'YYYY-MM': { productiveDays: 0, nonProductiveDays: 0, totalDays: 0 } }
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    for (const dateKey in dailyProductivityData) {
        const [year, month, day] = dateKey.split('-');
        const monthYearKey = `${year}-${month}`;

        if (!monthlyProductivity[monthYearKey]) {
            monthlyProductivity[monthYearKey] = { productiveDays: 0, nonProductiveDays: 0, totalDays: 0 };
        }

        const status = dailyProductivityData[dateKey];
        if (status === 'yes') {
            monthlyProductivity[monthYearKey].productiveDays++;
        } else if (status === 'no') {
            monthlyProductivity[monthYearKey].nonProductiveDays++;
        }
        monthlyProductivity[monthYearKey].totalDays++;
    }

    let totalProductiveMonths = 0;
    let totalNonProductiveMonths = 0;
    let maxProductiveDays = -1;
    let mostProductiveMonth = 'N/A';

    for (const monthKey in monthlyProductivity) {
        const monthData = monthlyProductivity[monthKey];
        if (monthData.productiveDays > monthData.nonProductiveDays) {
            totalProductiveMonths++;
        } else if (monthData.nonProductiveDays > monthData.productiveDays) {
            totalNonProductiveMonths++;
        }
        // If equal, it's neither predominantly productive nor non-productive for this count.

        // Find most productive month
        if (monthData.productiveDays > maxProductiveDays) {
            maxProductiveDays = monthData.productiveDays;
            const [year, monthNum] = monthKey.split('-');
            mostProductiveMonth = `${monthNames[parseInt(monthNum) - 1]} ${year}`;
        }
    }

    productiveMonthsCountElement.textContent = totalProductiveMonths;
    nonProductiveMonthsCountElement.textContent = totalNonProductiveMonths;
    mostProductiveMonthElement.textContent = mostProductiveMonth;
}

// NEW: Function to render task completion stats
function renderTaskCompletionStats() {
    const allTodos = JSON.parse(localStorage.getItem('allTodos') || '{}');

    let totalAdded = 0;
    let totalCompleted = 0;

    for (const dateKey in allTodos) {
        const todosForDate = allTodos[dateKey];
        totalAdded += todosForDate.length;
        todosForDate.forEach(todo => {
            if (todo.completed) {
                totalCompleted++;
            }
        });
    }

    const completionRate = totalAdded > 0 ? ((totalCompleted / totalAdded) * 100).toFixed(1) : 0;

    totalTasksAddedElement.textContent = totalAdded;
    totalTasksCompletedElement.textContent = totalCompleted;
    completionRateElement.textContent = `${completionRate}%`;
}

// NEW: Function to render daily task completion graph
function renderTaskCompletionGraph() {
    const allTodos = JSON.parse(localStorage.getItem('allTodos') || '{}');

    const dailyData = {}; // { 'YYYY-MM-DD': { added: 0, completed: 0 } }

    // Aggregate data by date
    for (const dateKey in allTodos) {
        const todosForDate = allTodos[dateKey];
        dailyData[dateKey] = { added: todosForDate.length, completed: 0 };
        todosForDate.forEach(todo => {
            if (todo.completed) {
                dailyData[dateKey].completed++;
            }
        });
    }

    // Sort dates chronologically
    const sortedDates = Object.keys(dailyData).sort();

    const labels = sortedDates.map(dateKey => {
        const dateObj = new Date(dateKey + 'T00:00:00');
        return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); // e.g., "May 26"
    });

    const tasksAddedData = sortedDates.map(dateKey => dailyData[dateKey].added);
    const tasksCompletedData = sortedDates.map(dateKey => dailyData[dateKey].completed);

    if (taskCompletionChartInstance) {
        taskCompletionChartInstance.destroy();
    }

    const ctx = taskCompletionChartCanvas.getContext('2d');
    taskCompletionChartInstance = new Chart(ctx, {
        type: 'line', // Line chart for trends
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Tasks Added',
                    data: tasksAddedData,
                    borderColor: 'rgba(54, 162, 235, 1)', // Blue
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    fill: true,
                    tension: 0.3 // Smooth lines
                },
                {
                    label: 'Tasks Completed',
                    data: tasksCompletedData,
                    borderColor: 'rgba(75, 192, 192, 1)', // Teal
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    fill: true,
                    tension: 0.3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Date',
                        color: '#FFFFFF'
                    },
                    ticks: {
                        color: '#FFFFFF'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.2)',
                        drawBorder: false
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Tasks',
                        color: '#FFFFFF'
                    },
                    ticks: {
                        color: '#FFFFFF',
                        precision: 0 // Ensure whole numbers for task count
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.2)',
                        drawBorder: false
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#FFFFFF'
                    }
                },
                title: {
                    display: true,
                    text: 'Daily Task Completion Trend',
                    color: '#FFFFFF',
                    font: {
                        size: 18
                    }
                }
            }
        }
    });

    // Hide placeholder if chart is rendered
    if (sortedDates.length > 0) {
        taskCompletionGraphContainer.querySelector('.graph-placeholder').style.display = 'none';
        taskCompletionChartCanvas.style.display = 'block';
    } else {
        taskCompletionGraphContainer.querySelector('.graph-placeholder').textContent = 'No task data yet.';
        taskCompletionGraphContainer.querySelector('.graph-placeholder').style.display = 'block';
        taskCompletionChartCanvas.style.display = 'none';
    }
}


// Call on load to display greeting, a quote, and render graphs/stats
document.addEventListener('DOMContentLoaded', () => {
    displayRandomQuote();
    renderPomodoroStats(); // Render Pomodoro stats on load
    renderStudyGraph(); // Render weekly study graph on load
    renderMonthlyProductivityStats(); // Render monthly productivity stats on load
    renderMonthlyProductivityGraph(); // Render monthly productivity graph on load
    renderTaskCompletionStats(); // NEW: Render task completion stats on load
    renderTaskCompletionGraph(); // NEW: Render task completion graph on load
});

// Expose functions globally so main.js can call them on tab switch
window.dashboardApp = {
    renderStudyGraph: renderStudyGraph,
    renderPomodoroStats: renderPomodoroStats,
    renderMonthlyProductivityGraph: renderMonthlyProductivityGraph,
    renderMonthlyProductivityStats: renderMonthlyProductivityStats,
    renderTaskCompletionStats: renderTaskCompletionStats, // NEW: Expose task completion stats rendering
    renderTaskCompletionGraph: renderTaskCompletionGraph // NEW: Expose task completion graph rendering
};
