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
    populateData(data);
}

async function saveData() {
    const data = collectData();
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

    data.incomes.forEach((income) => {
        addEntry("incomeContainer", income);
    });

    data.expenses.forEach((expense) => {
        addEntry("expenseContainer", expense);
    });

    calculateTotals();
}

function addEntry(
    containerId,
    data = { description: "", amounts: new Array(12).fill("") }
) {
    const container = document.getElementById(containerId);
    const entry = document.createElement("div");
    entry.className = "entry";

    const monthLabels = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
    ];


    entry.innerHTML = `
        <input type="text" value="${data.description}" placeholder="Description">
        <div class="annual-total">€0</div>
        <div class="months">
            ${monthLabels
                .map(
                    (label, index) => `
                <div class="month-container">
                    <label>${label}</label>
                    <div class="euro-input-wrapper">
                        <span class="euro-prefix">€</span>
                        <input type="number" placeholder="0" value="${data.amounts[index] !== undefined && data.amounts[index] !== "" ? data.amounts[index] : ""}">
                    </div>
                </div>
            `
                )
                .join("")}
        </div>
        <button class="remove-btn" onclick="removeEntry(this)">x</button>
    `;

    container.appendChild(entry);
    entry.querySelectorAll("input").forEach((input) => {
        input.addEventListener("input", calculateTotals);
    });
    // Attach negative listeners and update negative state for new inputs
    attachNegativeInputListeners(entry);
    updateNegativeInputs();
    calculateTotals();
}

function removeEntry(button) {
    const entry = button.parentElement;
    entry.remove();
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
    document.getElementById("netSavings").textContent =
        totalIncome - totalExpenses;

    monthlyIncome.forEach((income, index) => {
        monthlyBalance[index] = income - monthlyExpenses[index];
    });

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
