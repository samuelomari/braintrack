// BrainTrack - Smart Study Assistant
class BrainTrack {
    constructor() {
        this.tasks = JSON.parse(localStorage.getItem('braintrack-tasks')) || [];
        this.completedTasks = parseInt(localStorage.getItem('braintrack-completed')) || 0;
        this.totalStudyTime = parseInt(localStorage.getItem('braintrack-study-time')) || 0;
        this.sessionsCompleted = parseInt(localStorage.getItem('braintrack-sessions')) || 0;
        this.timer = null;
        this.timeLeft = 25 * 60; // 25 minutes in seconds
        this.isStudySession = true;
        this.isRunning = false;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.renderTasks();
        this.updateDashboard();
        this.loadDarkMode();
    }

    setupEventListeners() {
        // Task form
        document.getElementById('task-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addTask();
        });

        // Smart suggestion
        document.getElementById('suggest-task').addEventListener('click', () => {
            this.showSuggestion();
        });

        // Timer controls
        document.getElementById('start-timer').addEventListener('click', () => {
            this.startTimer();
        });
        document.getElementById('pause-timer').addEventListener('click', () => {
            this.pauseTimer();
        });
        document.getElementById('reset-timer').addEventListener('click', () => {
            this.resetTimer();
        });

        // Dark mode
        document.getElementById('dark-mode-toggle').addEventListener('click', () => {
            this.toggleDarkMode();
        });
    }

    addTask() {
        const subject = document.getElementById('task-subject').value;
        const description = document.getElementById('task-description').value;
        const deadline = document.getElementById('task-deadline').value;

        if (!subject || !description || !deadline) return;

        const task = {
            id: Date.now(),
            subject,
            description,
            deadline: new Date(deadline),
            completed: false,
            created: new Date()
        };

        this.tasks.push(task);
        this.saveTasks();
        this.renderTasks();

        // Clear form
        document.getElementById('task-form').reset();
    }

    renderTasks() {
        const taskList = document.getElementById('task-list');
        taskList.innerHTML = '';

        // Sort tasks by deadline (urgent first)
        const sortedTasks = this.tasks.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

        sortedTasks.forEach(task => {
            const taskElement = document.createElement('div');
            taskElement.className = `task-item ${task.completed ? 'completed' : ''}`;
            
            const deadlineStr = new Date(task.deadline).toLocaleString();
            const urgency = this.getUrgency(task.deadline);
            
            taskElement.innerHTML = `
                <div class="task-info">
                    <h3>${task.subject} <span class="urgency ${urgency.class}">${urgency.text}</span></h3>
                    <p>${task.description}</p>
                    <small>Deadline: ${deadlineStr}</small>
                </div>
                <div class="task-actions">
                    ${!task.completed ? '<button class="complete-btn">Complete</button>' : ''}
                    <button class="delete-btn">Delete</button>
                </div>
            `;

            // Event listeners for buttons
            const completeBtn = taskElement.querySelector('.complete-btn');
            const deleteBtn = taskElement.querySelector('.delete-btn');

            if (completeBtn) {
                completeBtn.addEventListener('click', () => this.completeTask(task.id));
            }
            deleteBtn.addEventListener('click', () => this.deleteTask(task.id));

            taskList.appendChild(taskElement);
        });
    }

    getUrgency(deadline) {
        const now = new Date();
        const timeDiff = deadline - now;
        const hoursDiff = timeDiff / (1000 * 60 * 60);

        if (hoursDiff < 0) return { text: 'OVERDUE', class: 'overdue' };
        if (hoursDiff < 24) return { text: 'URGENT', class: 'urgent' };
        if (hoursDiff < 72) return { text: 'SOON', class: 'soon' };
        return { text: 'FUTURE', class: 'future' };
    }

    completeTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            task.completed = true;
            this.completedTasks++;
            this.saveTasks();
            this.saveStats();
            this.renderTasks();
            this.updateDashboard();
        }
    }

    deleteTask(id) {
        this.tasks = this.tasks.filter(t => t.id !== id);
        this.saveTasks();
        this.renderTasks();
    }

    showSuggestion() {
        const incompleteTasks = this.tasks.filter(t => !t.completed);
        if (incompleteTasks.length === 0) {
            document.getElementById('suggestion-display').innerHTML = '<p>🎉 All tasks completed! Great job!</p>';
            return;
        }

        // Sort by urgency (overdue first, then soonest deadline)
        const sorted = incompleteTasks.sort((a, b) => {
            const aUrgency = this.getUrgencyScore(a.deadline);
            const bUrgency = this.getUrgencyScore(b.deadline);
            return bUrgency - aUrgency; // Higher score = more urgent
        });

        const suggestion = sorted[0];
        const deadlineStr = new Date(suggestion.deadline).toLocaleString();
        
        document.getElementById('suggestion-display').innerHTML = `
            <h3>📚 Recommended Task:</h3>
            <p><strong>${suggestion.subject}</strong></p>
            <p>${suggestion.description}</p>
            <p>Deadline: ${deadlineStr}</p>
        `;
    }

    getUrgencyScore(deadline) {
        const now = new Date();
        const timeDiff = deadline - now;
        const hoursDiff = timeDiff / (1000 * 60 * 60);

        if (hoursDiff < 0) return 100; // Overdue
        if (hoursDiff < 24) return 80; // Urgent
        if (hoursDiff < 72) return 60; // Soon
        return 40; // Future
    }

    startTimer() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        document.getElementById('start-timer').disabled = true;
        document.getElementById('pause-timer').disabled = false;
        
        this.timer = setInterval(() => {
            this.timeLeft--;
            this.updateTimerDisplay();
            
            if (this.timeLeft <= 0) {
                this.sessionComplete();
            }
        }, 1000);
    }

    pauseTimer() {
        this.isRunning = false;
        clearInterval(this.timer);
        document.getElementById('start-timer').disabled = false;
        document.getElementById('pause-timer').disabled = true;
    }

    resetTimer() {
        this.pauseTimer();
        this.timeLeft = 25 * 60;
        this.isStudySession = true;
        this.updateTimerDisplay();
    }

    sessionComplete() {
        clearInterval(this.timer);
        this.isRunning = false;
        
        if (this.isStudySession) {
            this.totalStudyTime += 25;
            this.sessionsCompleted++;
            this.saveStats();
            this.updateDashboard();
            alert('Study session complete! Take a 5-minute break.');
            this.timeLeft = 5 * 60;
            this.isStudySession = false;
        } else {
            alert('Break time over! Ready for another study session?');
            this.timeLeft = 25 * 60;
            this.isStudySession = true;
        }
        
        this.updateTimerDisplay();
        document.getElementById('start-timer').disabled = false;
        document.getElementById('pause-timer').disabled = true;
    }

    updateTimerDisplay() {
        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = this.timeLeft % 60;
        document.getElementById('timer-display').textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    updateDashboard() {
        document.getElementById('completed-tasks').textContent = this.completedTasks;
        document.getElementById('total-study-time').textContent = `${this.totalStudyTime} minutes`;
        document.getElementById('session-count').textContent = this.sessionsCompleted;
        
        // Progress level based on completed tasks and study time
        let level = 'Beginner';
        if (this.completedTasks >= 10 || this.totalStudyTime >= 500) level = 'Intermediate';
        if (this.completedTasks >= 25 || this.totalStudyTime >= 1500) level = 'Advanced';
        if (this.completedTasks >= 50 || this.totalStudyTime >= 3000) level = 'Expert';
        
        document.getElementById('progress-level').textContent = level;
    }

    toggleDarkMode() {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        localStorage.setItem('braintrack-dark-mode', isDark);
        document.getElementById('dark-mode-toggle').textContent = isDark ? '☀️ Light Mode' : '🌙 Dark Mode';
    }

    loadDarkMode() {
        const isDark = localStorage.getItem('braintrack-dark-mode') === 'true';
        if (isDark) {
            document.body.classList.add('dark-mode');
            document.getElementById('dark-mode-toggle').textContent = '☀️ Light Mode';
        }
    }

    saveTasks() {
        localStorage.setItem('braintrack-tasks', JSON.stringify(this.tasks));
    }

    saveStats() {
        localStorage.setItem('braintrack-completed', this.completedTasks);
        localStorage.setItem('braintrack-study-time', this.totalStudyTime);
        localStorage.setItem('braintrack-sessions', this.sessionsCompleted);
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new BrainTrack();
});