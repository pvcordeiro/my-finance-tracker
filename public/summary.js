async function fetchData()
{
    const res = await fetch('/data');
    if (!res.ok)
        throw new Error('Failed to load data');
    return await res.json();
}

function monthName(ym)
{
    const [y, m] = ym.split('-');
    return `${y} - ${('0'+m).slice(-2)}`;
}

function getRollingMonths(startDate) {
    const labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    let months = [];
    let year = startDate.getFullYear();
    let month = startDate.getMonth();
    for (let i = 0; i < 12; i++)
	{
        months.push({
            label: labels[month],
            year: year,
            month: month
        });
        month++;
        if (month > 11)
		{
            month = 0;
            year++;
        }
    }
    return months;
}

function renderSummary(data) {
    const now = new Date();
    const months = getRollingMonths(now);
    let html = '<table class="summary-table">';
    html += '<thead class="summary-thead"><tr><th class="summary-td-month">Month</th><th class="summary-td-income">| Income</th><th class="summary-td-expense">| Expenses |</th><th class="summary-td-net">Net</th></tr></thead><tbody>';
    let annualIncome = 0, annualExpenses = 0;
    let runningBalance = 0;
    let prevBalance = 0;
    const monthMap = { Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5, Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11 };
    for (let i = 0; i < 12; i++)
	{
        let m = months[i];
        let monthIdx = monthMap[m.label];
        let totalIncome = 0, totalExpenses = 0;
        let bankAmount = 0;
        if (Array.isArray(data.incomes))
            for (const inc of data.incomes)
                if (Array.isArray(inc.amounts) && inc.amounts[monthIdx] !== undefined && inc.amounts[monthIdx] !== "")
                    totalIncome += Number(inc.amounts[monthIdx]) || 0;
        if (Array.isArray(data.expenses))
            for (const exp of data.expenses)
                if (Array.isArray(exp.amounts) && exp.amounts[monthIdx] !== undefined && exp.amounts[monthIdx] !== "")
                    totalExpenses += Number(exp.amounts[monthIdx]) || 0;
        if (m.year === now.getFullYear() && m.month === now.getMonth() && typeof data.bankAmount === 'number')
            bankAmount = data.bankAmount;
        let net = totalIncome - totalExpenses;
        if (m.year < now.getFullYear() || (m.year === now.getFullYear() && m.month < now.getMonth()))
		{
            prevBalance += net;
            runningBalance = prevBalance;
        }
		else if (m.year === now.getFullYear() && m.month === now.getMonth())
            runningBalance = prevBalance + net + bankAmount;
        else
            runningBalance += net;
        annualIncome += totalIncome;
        annualExpenses += totalExpenses;
        html += `<tr class="summary-row">
            <td class="summary-td-month">${m.label}</td>
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
    // horizontal scroll
    const sc = document.getElementById('summary-container');
    sc.style.overflowX = 'auto';
    sc.style.margin = '0 auto';
    sc.style.maxWidth = '100vw';
}

fetchData().then(renderSummary).catch(e => {
    document.getElementById('summary-container').textContent = 'Error loading summary: ' + e.message;
});
