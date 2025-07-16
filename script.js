// Main script for CPU Scheduling Visualizer
// Author: vishu (debugged and refined)

// Ensure the DOM is fully loaded before attaching listeners
document.addEventListener('DOMContentLoaded', function () {
    // --- DOM References ---
    const processTable = document.querySelector('#processTable tbody');
    const addBtn = document.getElementById('addProcessBtn');
    const clearBtn = document.getElementById('clearBtn');
    const calcBtn = document.getElementById('calculateBtn');
    const algoOptions = document.querySelectorAll('.algorithm-option');
    const quantumBox = document.getElementById('quantumContainer');

    const avgTurnaround = document.getElementById('avgTurnaround');
    const avgWaiting = document.getElementById('avgWaiting');
    const throughput = document.getElementById('throughput');

    const ganttChart = document.getElementById('ganttChart');
    const ganttBar = document.getElementById('ganttContainer');
    const ganttTime = document.getElementById('ganttTimeline');
    const countLabel = document.getElementById('processCount');

    // --- Internal State ---
    let processes = [];
    let selectedMethod = 'fcfs';
    let currentTime = 0;

    function updateProcessCounter() {
        const count = processes.length;
        countLabel.textContent = `${count} process${count !== 1 ? 'es' : ''}`;
        countLabel.style.display = count ? 'inline-block' : 'none';
    }

    function clearAll() {
        processes = [];
        processTable.innerHTML = '';
        avgTurnaround.textContent = '0.00';
        avgWaiting.textContent = '0.00';
        throughput.textContent = '0.00';
        ganttChart.style.display = 'none';
        updateProcessCounter();
    }

    function addProcess() {
        const id = document.getElementById('processId').value.trim() || `P${processes.length + 1}`;
        const arrival = parseInt(document.getElementById('arrivalTime').value) || 0;
        const burst = parseInt(document.getElementById('burstTime').value) || 1;

        if (burst <= 0) {
            alert('Burst time must be a positive number.');
            return;
        }

        const proc = {
            id,
            arrivalTime: arrival,
            burstTime: burst,
            remainingTime: burst,
            priority: Math.floor(Math.random() * 5) + 1
        };

        processes.push(proc);

        const row = processTable.insertRow();
        row.innerHTML = `<td>${id}</td><td>${arrival}</td><td>${burst}</td><td>-</td><td>-</td><td>-</td>`;

        ['processId', 'arrivalTime', 'burstTime'].forEach(id => document.getElementById(id).value = '');

        updateProcessCounter();
    }

    // --- Algorithm Selection ---
    algoOptions.forEach(option => {
        option.addEventListener('click', () => {
            algoOptions.forEach(btn => btn.classList.remove('selected'));
            option.classList.add('selected');
            selectedMethod = option.dataset.method;
            quantumBox.style.display = selectedMethod === 'rr' ? 'block' : 'none';
        });
    });

    // --- Button Hooks ---
    addBtn.addEventListener('click', addProcess);
    clearBtn.addEventListener('click', clearAll);
    calcBtn.addEventListener('click', () => {
        if (processes.length === 0) {
            alert('Add at least one process to continue.');
            return;
        }

        currentTime = 0;
        const history = [];
        const ganttData = [];
        const work = JSON.parse(JSON.stringify(processes));

        const algoMap = {
            'fcfs': firstComeFirstServed,
            'sjf': shortestJobFirst,
            'srtf': shortestRemainingTime,
            'rr': roundRobin,
            'priority': priorityBased
        };

        algoMap[selectedMethod](work, history, ganttData);
        renderResults(history);
        renderGantt(ganttData);
    });

    // --- Scheduling Algorithms ---
    function firstComeFirstServed(queue, done, chart) {
        queue.sort((a, b) => a.arrivalTime - b.arrivalTime);

        for (const p of queue) {
            if (currentTime < p.arrivalTime) currentTime = p.arrivalTime;
            const start = currentTime;
            const end = start + p.burstTime;
            currentTime = end;
            chart.push({ processId: p.id, startTime: start, endTime: end });
            done.push({ ...p, completedTime: end, waitingTime: start - p.arrivalTime, turnaroundTime: end - p.arrivalTime });
        }
    }

    function shortestJobFirst(queue, done, chart) {
        queue.sort((a, b) => a.arrivalTime - b.arrivalTime);
        const ready = [];

        while (queue.length || ready.length) {
            while (queue.length && queue[0].arrivalTime <= currentTime) ready.push(queue.shift());
            if (!ready.length) {
                currentTime = queue[0].arrivalTime;
                continue;
            }
            ready.sort((a, b) => a.burstTime - b.burstTime);
            const p = ready.shift();
            const start = currentTime;
            const end = start + p.burstTime;
            currentTime = end;
            chart.push({ processId: p.id, startTime: start, endTime: end });
            done.push({ ...p, completedTime: end, waitingTime: start - p.arrivalTime, turnaroundTime: end - p.arrivalTime });
        }
    }

    function shortestRemainingTime(queue, done, chart) {
        const ready = [];
        let active = null;

        while (queue.length || ready.length || active) {
            while (queue.length && queue[0].arrivalTime <= currentTime) ready.push(queue.shift());
            if (!active && ready.length) {
                ready.sort((a, b) => a.remainingTime - b.remainingTime);
                active = ready.shift();
            }
            if (active) {
                chart.push({ processId: active.id, startTime: currentTime, endTime: currentTime + 1 });
                active.remainingTime--;
                if (active.remainingTime === 0) {
                    done.push({ ...active, completedTime: currentTime + 1, waitingTime: (currentTime + 1) - active.arrivalTime - active.burstTime, turnaroundTime: (currentTime + 1) - active.arrivalTime });
                    active = null;
                } else {
                    ready.push(active);
                    active = null;
                }
            } else {
                currentTime++;
            }
        }
    }

    function roundRobin(queue, done, chart) {
        const quantum = parseInt(document.getElementById('quantum').value) || 2;
        const ready = [];

        while (queue.length || ready.length) {
            while (queue.length && queue[0].arrivalTime <= currentTime) ready.push(queue.shift());
            if (!ready.length) {
                currentTime = queue.length ? queue[0].arrivalTime : currentTime + 1;
                continue;
            }
            const p = ready.shift();
            const execTime = Math.min(quantum, p.remainingTime);
            const start = currentTime;
            const end = start + execTime;
            currentTime = end;
            p.remainingTime -= execTime;
            chart.push({ processId: p.id, startTime: start, endTime: end });
            if (p.remainingTime > 0) {
                while (queue.length && queue[0].arrivalTime <= currentTime) ready.push(queue.shift());
                ready.push(p);
            } else {
                done.push({ ...p, completedTime: end, waitingTime: end - p.arrivalTime - p.burstTime, turnaroundTime: end - p.arrivalTime });
            }
        }
    }

    function priorityBased(queue, done, chart) {
        const ready = [];

        while (queue.length || ready.length) {
            while (queue.length && queue[0].arrivalTime <= currentTime) ready.push(queue.shift());
            if (!ready.length) {
                currentTime = queue[0].arrivalTime;
                continue;
            }
            ready.sort((a, b) => a.priority - b.priority);
            const p = ready.shift();
            const start = currentTime;
            const end = start + p.burstTime;
            currentTime = end;
            chart.push({ processId: p.id, startTime: start, endTime: end });
            done.push({ ...p, completedTime: end, waitingTime: start - p.arrivalTime, turnaroundTime: end - p.arrivalTime });
        }
    }

    // --- Metric Display ---
    function renderResults(results) {
        processTable.innerHTML = '';

        let totalTAT = 0, totalWT = 0;
        const totalTime = Math.max(...results.map(p => p.completedTime)) || 1;

        results.forEach(p => {
            totalTAT += p.turnaroundTime;
            totalWT += p.waitingTime;
            const row = processTable.insertRow();
            row.innerHTML = `<td>${p.id}</td><td>${p.arrivalTime}</td><td>${p.burstTime}</td><td>${p.completedTime}</td><td>${p.waitingTime}</td><td>${p.turnaroundTime}</td>`;
        });

        avgTurnaround.textContent = (totalTAT / results.length).toFixed(2);
        avgWaiting.textContent = (totalWT / results.length).toFixed(2);
        throughput.textContent = (results.length / totalTime).toFixed(2);
    }

    // --- Gantt Chart Renderer ---
    function renderGantt(entries) {
    ganttChart.style.display = 'block';
    ganttBar.innerHTML = '';
    ganttTime.innerHTML = '';

    const total = Math.max(...entries.map(e => e.endTime));
    const colors = {};
    const hueGap = 360 / processes.length;

    // Assign unique colors to real processes
    processes.forEach((p, i) => {
        colors[p.id] = `hsl(${i * hueGap}, 70%, 60%)`;
    });
    colors["IDLE"] = '#444';

    // Insert idle slots if gaps exist
    const finalEntries = [];
    let lastEnd = 0;

    for (const segment of entries) {
        if (segment.startTime > lastEnd) {
            finalEntries.push({
                processId: "IDLE",
                startTime: lastEnd,
                endTime: segment.startTime
            });
        }
        finalEntries.push(segment);
        lastEnd = segment.endTime;
    }

    for (const seg of finalEntries) {
        const bar = document.createElement('div');
        bar.className = 'gantt-process';
        bar.textContent = seg.processId === "IDLE" ? "" : seg.processId;
        bar.style.backgroundColor = colors[seg.processId];
        bar.style.width = `${((seg.endTime - seg.startTime) / total) * 100}%`;
        bar.title = `${seg.processId} (${seg.startTime} - ${seg.endTime})`;
        ganttBar.appendChild(bar);
    }

    for (let t = 0; t <= total; t++) {
        const tick = document.createElement('div');
        tick.className = 'gantt-time';
        tick.textContent = t;
        ganttTime.appendChild(tick);
    }
}

});
