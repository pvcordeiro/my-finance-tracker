async function fetchData() {
    const res = await fetch('/data', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to load data');
    return await res.json();
}
function monthLabels() {
    return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
}
function renderDetails(data) {
    const now = new Date();
    const year = now.getFullYear();
    const months = monthLabels();
    let html = '';
    // Incomes
    html += '<div class="details-section">';
    html += '<h2 style="color:#357abd;">Incomes</h2>';
    html += '<div style="overflow-x:auto;max-width:100vw;padding-bottom:8px;">';
    html += '<table class="details-table">';
    html += '<thead><tr><th class="sticky-col">Description</th>';
    months.forEach(m => html += `<th>${m}</th>`);
    html += '</tr></thead><tbody>';
    // Find current month data
    const ym = `${year}-${('0'+(now.getMonth()+1)).slice(-2)}`;
    const monthData = data[ym] || { incomes: [], expenses: [] };
    (monthData.incomes || []).forEach(inc => {
        html += `<tr><td class="sticky-col" style="text-align:left;font-weight:500;">${inc.description || ''}</td>`;
        for (let i = 0; i < 12; i++) {
            html += `<td class="month-cell" style="color:#357abd;">${inc.amounts && inc.amounts[i] !== undefined && inc.amounts[i] !== '' ? '€ ' + Number(inc.amounts[i]).toFixed(2) : '-'}</td>`;
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
    months.forEach(m => html += `<th>${m}</th>`);
    html += '</tr></thead><tbody>';
    (monthData.expenses || []).forEach(exp => {
        html += `<tr><td class="sticky-col" style="text-align:left;font-weight:500;">${exp.description || ''}</td>`;
        for (let i = 0; i < 12; i++) {
            html += `<td class="month-cell" style="color:#c62828;">${exp.amounts && exp.amounts[i] !== undefined && exp.amounts[i] !== '' ? '€ ' + Number(exp.amounts[i]).toFixed(2) : '-'}</td>`;
        }
        html += '</tr>';
    });
    html += '</tbody></table></div></div>';
    document.getElementById('details-container').innerHTML = html;
}
fetchData().then(renderDetails).catch(e => {
    document.getElementById('details-container').textContent = 'Error loading details: ' + e.message;
});
