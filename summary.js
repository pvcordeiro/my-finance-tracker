async function fetchData() {
    const res = await fetch('/data', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to load data');
    return await res.json();
}

function monthName(ym) {
    const [y, m] = ym.split('-');
    return `${y} - ${('0'+m).slice(-2)}`;
}

function renderSummary(data) {
    // Always show all months of the current year, one below the other
    const now = new Date();
    const year = now.getFullYear();
    const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    let html = '<table class="summary-table">';
    html += '<thead class="summary-thead"><tr><th class="summary-td-month">Month</th><th class="summary-td-income">| Income</th><th class="summary-td-expense">| Expenses |</th><th class="summary-td-net">Net</th></tr></thead><tbody>';
    let annualIncome = 0, annualExpenses = 0;
    let runningBalance = 0;
    let prevBalance = 0;
    const nowMonth = now.getMonth();
    let bankAmountForCurrentMonth = 0;
    for (let m = 0; m < 12; m++) {
        let totalIncome = 0, totalExpenses = 0;
        let bankAmount = 0;
        // Loop through all months in the DB and sum the value at index m
        for (const key in data) {
            let monthData = data[key];
            if (typeof monthData === 'number') {
                monthData = { bankAmount: monthData };
            } else if (typeof monthData !== 'object' || monthData === null) {
                monthData = {};
            }
            if (monthData.incomes) {
                for (const inc of monthData.incomes) {
                    if (Array.isArray(inc.amounts) && inc.amounts[m] !== undefined && inc.amounts[m] !== "") {
                        totalIncome += Number(inc.amounts[m]) || 0;
                    }
                }
            }
            if (monthData.expenses) {
                for (const exp of monthData.expenses) {
                    if (Array.isArray(exp.amounts) && exp.amounts[m] !== undefined && exp.amounts[m] !== "") {
                        totalExpenses += Number(exp.amounts[m]) || 0;
                    }
                }
            }
            // Get the bankAmount for the current month
            if (m === nowMonth && typeof monthData.bankAmount === 'number') {
                bankAmount = monthData.bankAmount;
                bankAmountForCurrentMonth = bankAmount;
            }
        }
        let net = totalIncome - totalExpenses;
        if (m < nowMonth) {
            prevBalance += net;
            runningBalance = prevBalance;
        } else if (m === nowMonth) {
            runningBalance = prevBalance + net + bankAmount;
        } else {
            runningBalance += net;
        }
        annualIncome += totalIncome;
        annualExpenses += totalExpenses;
        html += `<tr class="summary-row">
            <td class="summary-td-month">${monthLabels[m]} ${year}</td>
            <td class="summary-td-income">€ ${totalIncome.toFixed(2)}</td>
            <td class="summary-td-expense">€ ${totalExpenses.toFixed(2)}</td>
            <td class="summary-td-net" style="color:${runningBalance>=0?'#388e3c':'#c62828'};font-weight:600;">€ ${runningBalance.toFixed(2)}</td>
        </tr>`;
    }
    html += `</tbody><tfoot class="summary-tfoot"><tr>
        <th class="summary-td-total">Total</th>
        <th class="summary-td-income">€ ${annualIncome.toFixed(2)}</th>
        <th class="summary-td-expense">€ ${annualExpenses.toFixed(2)}</th>
        <th class="summary-td-net">€ ${runningBalance.toFixed(2)}</th>
        <th></th>
    </tr></tfoot></table>`;
    document.getElementById('summary-container').innerHTML = html;
    // Responsive: make table horizontally scrollable on small screens
    const sc = document.getElementById('summary-container');
    sc.style.overflowX = 'auto';
    sc.style.margin = '0 auto';
    sc.style.maxWidth = '100vw';
}

fetchData().then(renderSummary).catch(e => {
    document.getElementById('summary-container').textContent = 'Error loading summary: ' + e.message;
});
