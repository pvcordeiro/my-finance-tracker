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
    let html = '<table class="summary-table" style="width:100%;max-width:900px;margin:auto;border-collapse:collapse;box-shadow:0 2px 8px #0001;background:#fff;">';
    html += '<thead style="background:#1a237e;color:#fff;"><tr><th style="padding:6px 2px;">Month</th><th style="padding:6px 2px;">| Income</th><th style="padding:6px 2px;">| Expenses |</th><th style="padding:6px 2px;">Net</th></tr></thead><tbody>';
    let annualIncome = 0, annualExpenses = 0;
    let runningBalance = 0;
    let bankAmountAdded = false;
    const nowMonth = now.getMonth();
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
            // Use the bankAmount from the current month (if present)
            if (!bankAmountAdded && m === nowMonth && typeof monthData.bankAmount === 'number' && monthData.bankAmount !== 0) {
                bankAmount = monthData.bankAmount;
                bankAmountAdded = true;
            }
        }
        let net = totalIncome - totalExpenses;
        if (m === nowMonth) {
            net += bankAmount;
            runningBalance = net;
        } else if (m > nowMonth) {
            runningBalance += net;
        } else if (m < nowMonth) {
            runningBalance = net;
        }
        annualIncome += totalIncome;
        annualExpenses += totalExpenses;
        html += `<tr style="text-align:center;">
            <td style="padding:4px 2px;">${monthLabels[m]} ${year}</td>
            <td style="padding:4px 2px;color:#357abd;font-weight:500;">€ ${totalIncome.toFixed(2)}</td>
            <td style="padding:4px 2px;color:#c62828;font-weight:500;">€ ${totalExpenses.toFixed(2)}</td>
            <td style="padding:4px 2px;color:${runningBalance>=0?'#388e3c':'#c62828'};font-weight:600;">€ ${runningBalance.toFixed(2)}</td>
        </tr>`;
    }
    html += `</tbody><tfoot style="background:#e3eafc;font-weight:bold;"><tr>
        <th style="padding:6px 2px;">Total</th>
        <th style="padding:6px 2px;">€ ${annualIncome.toFixed(2)}</th>
        <th style="padding:6px 2px;">€ ${annualExpenses.toFixed(2)}</th>
        <th style="padding:6px 2px;">€ ${runningBalance.toFixed(2)}</th>
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
