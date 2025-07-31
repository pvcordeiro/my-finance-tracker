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
    // Restore Save button color on any input change
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
        document.body.addEventListener('input', function (e) {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                saveBtn.style.display = 'block';
                saveBtn.style.background = '#59cf4e';
                saveBtn.style.color = '#fff';
            }
        }, true);
    }
});

// If you dynamically add entries/inputs, call attachNegativeInputListeners(newContainer) after adding them
async function loadData() {
    const response = await fetch("/data", {
        credentials: "include"
    });
    const allData = await response.json();
    const now = new Date();
    const ym = `${now.getFullYear()}-${('0'+(now.getMonth()+1)).slice(-2)}`;
    let data = allData[ym];
    if (!data) {
        // If no data for this month, initialize
        data = { incomes: [], expenses: [], bankAmount: 0 };
    }
    const bankInput = document.getElementById('bankAmount');
    bankInput.value = data.bankAmount || "";
    populateData(data);
    // Store allData for later use in saveData
    window._allMonthsData = allData;
}

async function saveData() {
    const now = new Date();
    const ym = `${now.getFullYear()}-${('0'+(now.getMonth()+1)).slice(-2)}`;
    const data = collectData();
    data.bankAmount = parseFloat(document.getElementById('bankAmount').value) || 0;
    // Use all months data, update just this month
    let allData = window._allMonthsData || {};
    allData[ym] = data;
    await fetch("/data", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(allData),
        credentials: "include"
    });
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
        saveBtn.style.display = 'none';
        saveBtn.disabled = true;
        setTimeout(() => {
            saveBtn.disabled = false;
        }, 1200);
    }
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

    data.incomes.forEach((income) => {
        addEntry("incomeContainer", income, false);
    });

    data.expenses.forEach((expense) => {
        addEntry("expenseContainer", expense, false);
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
                <div class="month-container" style="display:flex;align-items:center;gap:0.1em;">
                    <label style="min-width:2.5em;">${label}</label>
                    <div class="euro-input-wrapper" style="flex:1;">
                        <span class="euro-prefix">€</span>
                        <input type="number" placeholder="0" value="${data.amounts[index] !== undefined && data.amounts[index] !== "" ? data.amounts[index] : ""}">
                    </div>
                </div>
            `).join("")}
        </div>
        <button class="remove-btn" onclick="removeEntry(this)">x</button>
    `;

    // Toggle expand/collapse logic (allow multiple open)
    header.addEventListener("click", () => {
        const isExpanded = entry.classList.contains('expanded');
        if (!isExpanded) {
            entry.classList.add('expanded');
            header.classList.add('active');
        } else {
            entry.classList.remove('expanded');
            header.classList.remove('active');
        }
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

    const totalIncomeElem = document.getElementById("totalIncome");
    if (totalIncomeElem) totalIncomeElem.textContent = totalIncome;
    const totalExpensesElem = document.getElementById("totalExpenses");
    if (totalExpensesElem) totalExpensesElem.textContent = totalExpenses;
    const bankAmountInput = document.getElementById('bankAmount');
    const bankAmount = bankAmountInput ? parseFloat(bankAmountInput.value) || 0 : 0;
    const netSavingsElem = document.getElementById("netSavings");
    if (netSavingsElem) netSavingsElem.textContent = bankAmount + totalIncome - totalExpenses;
    if (bankAmountInput && !bankAmountInput._listenerAdded) {
        bankAmountInput.addEventListener('input', calculateTotals);
        bankAmountInput._listenerAdded = true;
    }

    monthlyIncome.forEach((income, index) => {
        monthlyBalance[index] = income - monthlyExpenses[index];
    });

    // Add bank amount to the current month only
    const now = new Date();
    const currentMonth = now.getMonth(); // 0 = Jan
    monthlyBalance[currentMonth] += bankAmount;

    // Only update monthly balance fields if they exist
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
        const elem = document.getElementById(monthIds[index]);
        if (elem) elem.textContent = `€${balance}`;
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
        const entryContainer = document.getElementById(type + 'Container');
        if (entryContainer) {
            entryContainer.querySelectorAll('.entry').forEach(e => {
                e.classList.remove('expanded');
                const header = e.querySelector('.entry-header');
                if (header) header.classList.remove('active');
            });
        }
    }
}

// Load existing data when the page loads
window.onload = function () {
    loadData();
    document.getElementById("incomeDropdown").classList.remove("open");
    document.getElementById("incomeArrow").textContent = '▼';
    document.getElementById("expenseDropdown").classList.remove("open");
    document.getElementById("expenseArrow").textContent = '▼';
};
