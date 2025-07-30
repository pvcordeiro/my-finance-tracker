// Utility: Add or remove .negative class on all number inputs based on value
function updateNegativeInputs() {
    document.querySelectorAll('input[type="number"]').forEach(input => {
        if (parseFloat(input.value) < 0) {
            input.classList.add('negative');
        } else {
            input.classList.remove('negative');
        }
    });
}

// Attach input event listeners to all number inputs (including dynamically created ones)
function attachNegativeInputListeners(container=document) {
    container.querySelectorAll('input[type="number"]').forEach(input => {
        input.addEventListener('input', updateNegativeInputs);
    });
}

// Initial call on page load
document.addEventListener('DOMContentLoaded', () => {
    attachNegativeInputListeners();
    updateNegativeInputs();
});

// If you dynamically add entries/inputs, call attachNegativeInputListeners(newContainer) after adding them
async function loadData() {
    const response = await fetch("/data", {
        credentials: "include"
    });
    const data = await response.json();
    const bankInput = document.getElementById('bankAmount');
    if (data.bankAmount !== undefined && data.bankAmount !== 0 && data.bankAmount !== "") {
        bankInput.value = data.bankAmount;
    } else {
        bankInput.value = "";
    }
    populateData(data);
}

async function saveData() {
    const data = collectData();
    data.bankAmount = parseFloat(document.getElementById('bankAmount').value) || 0;
    await fetch("/data", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
        credentials: "include"
    });
    alert("Data saved successfully!");
}

function collectData() {
    const incomeEntries = document.querySelectorAll("#incomeContainer .entry");
    const expenseEntries = document.querySelectorAll(
        "#expenseContainer .entry"
    );

    const incomes = [];
    incomeEntries.forEach((entry) => {
        const incomeData = {
            description: entry.querySelector('input[type="text"]').value,
            amounts: Array.from(
                entry.querySelectorAll('.months input[type="number"]')
            ).map((input) => parseFloat(input.value) || ""),
        };
        incomes.push(incomeData);
    });

    const expenses = [];
    expenseEntries.forEach((entry) => {
        const expenseData = {
            description: entry.querySelector('input[type="text"]').value,
            amounts: Array.from(
                entry.querySelectorAll('.months input[type="number"]')
            ).map((input) => parseFloat(input.value) || ""),
        };
        expenses.push(expenseData);
    });

    return { incomes, expenses };
}

function populateData(data) {
    const incomeContainer = document.getElementById("incomeContainer");
    const expenseContainer = document.getElementById("expenseContainer");

    incomeContainer.innerHTML = "";
    expenseContainer.innerHTML = "";

    data.incomes.forEach((income, idx) => {
        addEntry("incomeContainer", income, idx === 0);
    });

    data.expenses.forEach((expense, idx) => {
        addEntry("expenseContainer", expense, idx === 0);
    });

    calculateTotals();
}

function addEntry(
    containerId,
    data = { description: "", amounts: new Array(12).fill("") }, expanded = false
) {
    const container = document.getElementById(containerId);
    const entry = document.createElement("div");
    entry.className = "entry" + (expanded ? " expanded" : "");

    const monthLabels = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];

    // Header (description/title)
    const header = document.createElement("div");
    header.className = "entry-header";
    header.textContent = data.description || "(No description)";
    if (expanded) header.classList.add("active");

    // Content (hidden unless expanded)
    const content = document.createElement("div");
    content.className = "entry-content";
    content.innerHTML = `
        <input type="text" value="${data.description}" placeholder="Description" class="desc-input">
        <div class="annual-total">€0</div>
        <div class="months">
            ${monthLabels.map((label, index) => `
                <div class="month-container">
                    <label>${label}</label>
                    <div class="euro-input-wrapper">
                        <span class="euro-prefix">€</span>
                        <input type="number" placeholder="0" value="${data.amounts[index] !== undefined && data.amounts[index] !== "" ? data.amounts[index] : ""}">
                    </div>
                </div>
            `).join("")}
        </div>
        <button class="remove-btn" onclick="removeEntry(this)">x</button>
    `;

    // Toggle expand/collapse logic
    header.addEventListener("click", () => {
        const isExpanded = entry.classList.contains('expanded');
        // Collapse all others
        container.querySelectorAll('.entry').forEach(e => {
            e.classList.remove('expanded');
            e.querySelector('.entry-header').classList.remove('active');
        });
        // If not already expanded, expand this one
        if (!isExpanded) {
            entry.classList.add('expanded');
            header.classList.add('active');
        }
        // If already expanded, leave it collapsed (toggle off)
    });

    // Update header text when description changes
    content.querySelector('.desc-input').addEventListener('input', function() {
        header.textContent = this.value || "(No description)";
        calculateTotals();
    });

    // Add listeners for totals and negative input
    content.querySelectorAll("input").forEach((input) => {
        input.addEventListener("input", calculateTotals);
    });
    attachNegativeInputListeners(content);
    updateNegativeInputs();

    entry.appendChild(header);
    entry.appendChild(content);
    container.appendChild(entry);
    if (expanded) calculateTotals();
}

function removeEntry(button) {
    // If button is inside entry-content, go up two levels
    let entry = button.closest('.entry');
    if (entry) entry.remove();
    calculateTotals();
}

function calculateTotals() {
    let totalIncome = 0;
    let totalExpenses = 0;
    const monthlyIncome = new Array(12).fill(0);
    const monthlyExpenses = new Array(12).fill(0);
    const monthlyBalance = new Array(12).fill(0);

    document.querySelectorAll("#incomeContainer .entry").forEach((entry) => {
        const amounts = Array.from(
            entry.querySelectorAll('.months input[type="number"]')
        ).map((input) => parseFloat(input.value) || 0);
        const total = amounts.reduce((a, b) => a + b, 0);
        entry.querySelector(".annual-total").textContent = `€${total}`;
        totalIncome += total;
        amounts.forEach((amount, index) => {
            monthlyIncome[index] += amount;
        });
    });

    document.querySelectorAll("#expenseContainer .entry").forEach((entry) => {
        const amounts = Array.from(
            entry.querySelectorAll('.months input[type="number"]')
        ).map((input) => parseFloat(input.value) || 0);
        const total = amounts.reduce((a, b) => a + b, 0);
        entry.querySelector(".annual-total").textContent = `€${total}`;
        totalExpenses += total;
        amounts.forEach((amount, index) => {
            monthlyExpenses[index] += amount;
        });
    });

    document.getElementById("totalIncome").textContent = totalIncome;
    document.getElementById("totalExpenses").textContent = totalExpenses;
    const bankAmount = parseFloat(document.getElementById('bankAmount').value) || 0;
    document.getElementById("netSavings").textContent = bankAmount + totalIncome - totalExpenses;
    document.getElementById('bankAmount').addEventListener('input', calculateTotals);

    monthlyIncome.forEach((income, index) => {
        monthlyBalance[index] = income - monthlyExpenses[index];
    });

    // Add bank amount to the current month only
    const now = new Date();
    const currentMonth = now.getMonth(); // 0 = Jan
    monthlyBalance[currentMonth] += bankAmount;

    const monthIds = [
        "balanceJan",
        "balanceFeb",
        "balanceMar",
        "balanceApr",
        "balanceMay",
        "balanceJun",
        "balanceJul",
        "balanceAug",
        "balanceSep",
        "balanceOct",
        "balanceNov",
        "balanceDec",
    ];

    monthlyBalance.forEach((balance, index) => {
        document.getElementById(monthIds[index]).textContent = `€${balance}`;
    });
    // Update negative class after all calculations
    updateNegativeInputs();
}


function toggleDropdown(type) {
    const dropdown = document.getElementById(type + 'Dropdown');
    const arrow = document.getElementById(type + 'Arrow');
    dropdown.classList.toggle('open');
    if (dropdown.classList.contains('open')) {
        arrow.textContent = '▲';
    } else {
        arrow.textContent = '▼';
    }
}

// Load existing data when the page loads
window.onload = function () {
    loadData();
    // Start with dropdowns closed on mobile
    document.getElementById("incomeDropdown").classList.remove("open");
    document.getElementById("incomeArrow").textContent = '▼';
    document.getElementById("expenseDropdown").classList.remove("open");
    document.getElementById("expenseArrow").textContent = '▼';
};
