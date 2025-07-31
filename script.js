document.addEventListener('DOMContentLoaded', () => {
    const saveBtn = document.getElementById('saveBtn');
    function showSaveBtn()
	{
        if (saveBtn)
		{
            saveBtn.style.display = 'block';
            saveBtn.style.background = '#59cf4e';
            saveBtn.style.color = '#fff';
        }
    }
    if (saveBtn)
	{
        document.body.addEventListener('input', function (e)
		{
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')
                showSaveBtn();
        }, true);
        const addIncomeBtn = document.getElementById('addIncomeBtn');
        if (addIncomeBtn)
            addIncomeBtn.addEventListener('click', showSaveBtn);
        const addExpenseBtn = document.getElementById('addExpenseBtn');
        if (addExpenseBtn)
            addExpenseBtn.addEventListener('click', showSaveBtn);
        document.body.addEventListener('click', function(e)
		{
            if (e.target.classList && e.target.classList.contains('remove-btn'))
                showSaveBtn();
        }, true);
    }
});

async function loadData() {
    const response = await fetch("/data", {
        credentials: "include"
    });
    const allData = await response.json();
    const now = new Date();
    const ym = `${now.getFullYear()}-${('0'+(now.getMonth()+1)).slice(-2)}`;
    let data = allData[ym];
    if (!data)
        data = { incomes: [], expenses: [], bankAmount: 0 };
    const bankInput = document.getElementById('bankAmount');
    bankInput.value = data.bankAmount || "";
    populateData(data);
    window._allMonthsData = allData;
}

async function saveData() {
    const now = new Date();
    const ym = `${now.getFullYear()}-${('0'+(now.getMonth()+1)).slice(-2)}`;
    const data = collectData();
    data.bankAmount = parseFloat(document.getElementById('bankAmount').value) || 0;
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
    if (saveBtn)
	{
        saveBtn.style.display = 'none';
        saveBtn.disabled = true;
        setTimeout(() => {
            saveBtn.disabled = false;
        }, 1200);
    }
}

function collectData()
{
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

function populateData(data)
{
    const incomeContainer = document.getElementById("incomeContainer");
    const expenseContainer = document.getElementById("expenseContainer");
    const addIncomeBtn = document.getElementById("addIncomeBtn");
    const addExpenseBtn = document.getElementById("addExpenseBtn");

    incomeContainer.innerHTML = "";
    expenseContainer.innerHTML = "";

    // only show input field if there's an input to be fielded
    if (!data.incomes || data.incomes.length === 0)
	{
        incomeContainer.style.display = 'none';
        if (addIncomeBtn)
			addIncomeBtn.style.display = '';
    }
	else
	{
        incomeContainer.style.display = '';
        if (addIncomeBtn)
			addIncomeBtn.style.display = '';
        data.incomes.forEach((income) => {
            addEntry("incomeContainer", income, false);
        });
    }

    if (!data.expenses || data.expenses.length === 0)
	{
        expenseContainer.style.display = 'none';
        if (addExpenseBtn)
			addExpenseBtn.style.display = '';
    }
	else
	{
        expenseContainer.style.display = '';
        if (addExpenseBtn)
			addExpenseBtn.style.display = '';
        data.expenses.forEach((expense) => {
            addEntry("expenseContainer", expense, false);
        });
    }

    calculateTotals();
}

function addEntry(
    containerId,
    data = { description: "", amounts: new Array(12).fill("") }, expanded = false
)
{
    const container = document.getElementById(containerId);
    container.style.display = '';
    const entry = document.createElement("div");
    entry.className = "entry" + (expanded ? " expanded" : "");

    const monthLabels = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];

    // input field header with total and remove button
    const header = document.createElement("div");
    header.className = "entry-header";
    header.innerHTML = `
        <span class="entry-desc">${data.description || "(No description)"}</span>
        <span class="annual-total">€0</span>
        <button class="remove-btn" onclick="removeEntry(this)">x</button>
    `;
    if (expanded)
		header.classList.add("active");

	//entry field toggler
    const content = document.createElement("div");
    content.className = "entry-content";
    content.innerHTML = `
        <input type="text" value="${data.description}" placeholder="Description" class="desc-input">
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
    `;

    // toggler too
    header.addEventListener("click", () => {
        const isExpanded = entry.classList.contains('expanded');
        if (!isExpanded)
		{
            entry.classList.add('expanded');
            header.classList.add('active');
        }
		else
		{
            entry.classList.remove('expanded');
            header.classList.remove('active');
        }
    });

    // instant description updator
    content.querySelector('.desc-input').addEventListener('input', function() {
        header.querySelector('.entry-desc').textContent = this.value || "(No description)";
        calculateTotals();
    });

    content.querySelectorAll("input").forEach((input) => {
        input.addEventListener("input", calculateTotals);
    });

    entry.appendChild(header);
    entry.appendChild(content);
    container.appendChild(entry);
    if (expanded)
		calculateTotals();
}

function removeEntry(button)
{
    let entry = button.closest('.entry');
    if (entry)
		entry.remove();
    // Hide container if no entries
    const incomeContainer = document.getElementById('incomeContainer');
    const expenseContainer = document.getElementById('expenseContainer');
    if (incomeContainer && incomeContainer.querySelectorAll('.entry').length === 0)
        incomeContainer.style.display = 'none';
    if (expenseContainer && expenseContainer.querySelectorAll('.entry').length === 0)
        expenseContainer.style.display = 'none';
    calculateTotals();
}

function calculateTotals()
{
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
        const headerTotal = entry.querySelector(".entry-header .annual-total");
        if (headerTotal)
			headerTotal.textContent = `€${total}`;
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
        const headerTotal = entry.querySelector(".entry-header .annual-total");
        if (headerTotal)
			headerTotal.textContent = `€${total}`;
        totalExpenses += total;
        amounts.forEach((amount, index) => {
            monthlyExpenses[index] += amount;
        });
    });

    const totalIncomeElem = document.getElementById("totalIncome");
    if (totalIncomeElem)
		totalIncomeElem.textContent = totalIncome;
    const totalExpensesElem = document.getElementById("totalExpenses");
    if (totalExpensesElem)
		totalExpensesElem.textContent = totalExpenses;
    const bankAmountInput = document.getElementById('bankAmount');
    const bankAmount = bankAmountInput ? parseFloat(bankAmountInput.value) || 0 : 0;
    const netSavingsElem = document.getElementById("netSavings");
    if (netSavingsElem)
		netSavingsElem.textContent = bankAmount + totalIncome - totalExpenses;
    if (bankAmountInput && !bankAmountInput._listenerAdded)
	{
        bankAmountInput.addEventListener('input', calculateTotals);
        bankAmountInput._listenerAdded = true;
    }

    monthlyIncome.forEach((income, index) => {
        monthlyBalance[index] = income - monthlyExpenses[index];
    });

    const now = new Date();
    const currentMonth = now.getMonth();
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
        const elem = document.getElementById(monthIds[index]);
        if (elem)
			elem.textContent = `€${balance}`;
    });

}


function toggleDropdown(type) {
    const dropdown = document.getElementById(type + 'Dropdown');
    const arrow = document.getElementById(type + 'Arrow');
    dropdown.classList.toggle('open');
    if (dropdown.classList.contains('open'))
        arrow.textContent = '▲';
    else
	{
        arrow.textContent = '▼';
        const entryContainer = document.getElementById(type + 'Container');
        if (entryContainer)
		{
            entryContainer.querySelectorAll('.entry').forEach(e => {
                e.classList.remove('expanded');
                const header = e.querySelector('.entry-header');
                if (header)
					header.classList.remove('active');
            });
        }
    }
}

window.onload = function () {
    loadData();
    document.getElementById("incomeDropdown").classList.remove("open");
    document.getElementById("incomeArrow").textContent = '▼';
    document.getElementById("expenseDropdown").classList.remove("open");
    document.getElementById("expenseArrow").textContent = '▼';
};
