async function fetchData()
{
    const res = await fetch('/data');
    if (!res.ok)
        throw new Error('Failed to load data');
    return await res.json();
}
function getRollingMonths(startDate)
{
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
function renderDetails(data)
{
    const monthMap = { Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5, Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11 };
    const now = new Date();
    const months = getRollingMonths(now);
    let prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    let prevMonthDisplay = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][prevMonth.getMonth()] + ' ' + prevMonth.getFullYear();
    let html = '';
    // Incomes
    html += '<div class="details-section">';
    html += '<h2 style="color:#357abd;">Incomes</h2>';
    html += '<div style="overflow-x:auto;max-width:100vw;padding-bottom:8px;">';
    html += '<table class="details-table">';
    html += '<thead><tr><th class="sticky-col">Description</th>';
    html += `<th>${prevMonthDisplay.split(' ')[0]}</th>`;
    months.forEach(m => html += `<th>${m.label}</th>`);
    html += '</tr></thead><tbody>';
    // Add Bank Amount row in details page, check if its not 0 first
    if (data.bankAmount !== undefined && Number(data.bankAmount) !== 0)
    {
        html += `<tr><td class="sticky-col" style="text-align:left;font-weight:500;">Bank Amount</td>`;
        html += `<td class="month-cell">-</td>`;
        for (let i = 0; i < 12; i++)
        {
            let showMonth = months[i];
            if (showMonth.year === now.getFullYear() && showMonth.month === now.getMonth())
                html += `<td class="month-cell" style="color:#357abd;font-weight:bold;">€ ${Number(data.bankAmount).toFixed(2)}</td>`;
            else
                html += '<td class="month-cell">-</td>';
        }
        html += '</tr>';
    }
    (data.incomes || []).forEach(inc => {
        html += `<tr><td class="sticky-col" style="text-align:left;font-weight:500;">${inc.description || ''}</td>`;
        let prevIdx = (now.getMonth() - 1 + 12) % 12;
        let prevVal = inc.amounts && inc.amounts[prevIdx] !== undefined && inc.amounts[prevIdx] !== '' ? '€ ' + Number(inc.amounts[prevIdx]).toFixed(2) : '-';
        html += `<td class="month-cell">${prevVal}</td>`;
        for (let i = 0; i < 12; i++)
        {
            let m = months[i];
            let idx = monthMap[m.label];
            let val = inc.amounts && inc.amounts[idx] !== undefined && inc.amounts[idx] !== '' ? '€ ' + Number(inc.amounts[idx]).toFixed(2) : '-';
            html += `<td class="month-cell" style="color:#357abd;">${val}</td>`;
        }
        html += '</tr>';
    });
    html += '</tbody></table></div></div>';
    // Expenses
    html += '<div class="details-section">';
    html += '<h2 style="color:#c62828;">Expenses</h2>';
    html += '<div style="overflow-x:auto;max-width:100vw;padding-bottom:8px;">';
    html += '<table class="details-table">';
    html += '<thead><tr><th class="sticky-col">Description</th>';
    html += `<th>${prevMonthDisplay.split(' ')[0]}</th>`;
    months.forEach(m => html += `<th>${m.label}</th>`);
    html += '</tr></thead><tbody>';
    (data.expenses || []).forEach(exp => {
        html += `<tr><td class="sticky-col" style="text-align:left;font-weight:500;">${exp.description || ''}</td>`;
        let prevIdx = (now.getMonth() - 1 + 12) % 12;
        let prevVal = exp.amounts && exp.amounts[prevIdx] !== undefined && exp.amounts[prevIdx] !== '' ? '€ ' + Number(exp.amounts[prevIdx]).toFixed(2) : '-';
        html += `<td class="month-cell">${prevVal}</td>`;
        for (let i = 0; i < 12; i++)
        {
            let m = months[i];
            let idx = monthMap[m.label];
            let val = exp.amounts && exp.amounts[idx] !== undefined && exp.amounts[idx] !== '' ? '€ ' + Number(exp.amounts[idx]).toFixed(2) : '-';
            html += `<td class="month-cell" style="color:#c62828;">${val}</td>`;
        }
        html += '</tr>';
    });
    html += '</tbody></table></div></div>';
    document.getElementById('details-container').innerHTML = html;
}
fetchData().then(renderDetails).catch(e => {
    document.getElementById('details-container').textContent = 'Error loading details: ' + e.message;
});
