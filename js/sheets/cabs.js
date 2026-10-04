/* ==========================================================================
   WHEEL UP DASHBOARD - SHEET 3: CABS & EXPENSE LOGGING VIEW RENDERER
   ========================================================================== */

const SheetCabs = (function() {

  function render(container, financialData) {
    const { cabStatsMap, summary, filteredExpenses, sortedCabs } = financialData;
    const state = Store.getState();

    container.innerHTML = `
      <!-- Cabs Header -->
      <div class="card" style="background: linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(56, 189, 248, 0.15)); border: 1px solid rgba(56, 189, 248, 0.3);">
        <div class="card-header">
          <div>
            <h2 class="card-title" style="font-size: 1.25rem;"><i class="fa-solid fa-car-side" style="color: var(--accent-primary);"></i> Cabs Fleet & Expenses Ledger</h2>
            <p style="font-size: 0.82rem; color: var(--text-muted); margin-top: 0.2rem;">
              Active cabs sorted to top. Log EMI & maintenance expenses with owner out-of-pocket payment tracking.
            </p>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <button class="btn btn-sm btn-danger-soft" onclick="App.openModal('log-expense')">
              <i class="fa-solid fa-receipt"></i> Log Cab Expense
            </button>
            <button class="btn btn-sm btn-primary" onclick="App.openModal('add-cab')">
              <i class="fa-solid fa-plus"></i> Add New Cab
            </button>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-top: 0.5rem;">
          <div style="background: rgba(0,0,0,0.2); padding: 0.85rem; border-radius: var(--radius-md);">
            <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">Total Fleet Cabs</div>
            <div style="font-size: 1.3rem; font-weight: 800; color: var(--text-main);">${sortedCabs.length} Cabs</div>
          </div>
          <div style="background: rgba(0,0,0,0.2); padding: 0.85rem; border-radius: var(--radius-md);">
            <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">Total EMI Paid</div>
            <div style="font-size: 1.3rem; font-weight: 800; color: var(--accent-warning);">${Utils.formatINR(summary.fleetTotalEMI)}</div>
          </div>
          <div style="background: rgba(0,0,0,0.2); padding: 0.85rem; border-radius: var(--radius-md);">
            <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">Total Repairs & Maintenance</div>
            <div style="font-size: 1.3rem; font-weight: 800; color: var(--accent-danger);">${Utils.formatINR(summary.fleetTotalExpenses - summary.fleetTotalEMI)}</div>
          </div>
          <div style="background: rgba(0,0,0,0.2); padding: 0.85rem; border-radius: var(--radius-md);">
            <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">Total Fleet Net Profit</div>
            <div style="font-size: 1.3rem; font-weight: 800; color: var(--accent-success);">${Utils.formatINR(summary.fleetTotalNetProfit)}</div>
          </div>
        </div>
      </div>

      <!-- Cabs Grid (Active First, Inactive Last) -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 1.25rem;">
        ${sortedCabs.map(cab => renderCabCard(cabStatsMap[cab.id], financialData, state)).join('')}
      </div>

      <!-- Expenses Receipts Log Table -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i class="fa-solid fa-file-invoice-dollar"></i> Expense Receipts Log</h3>
          <button class="btn btn-sm btn-danger-soft" onclick="App.openModal('log-expense')">
            <i class="fa-solid fa-plus"></i> Add Expense
          </button>
        </div>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Cab Plate</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Paid By (Source)</th>
                <th>Vendor / Mechanic</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${renderExpensesTableRows(filteredExpenses, state)}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderCabCard(cStat, financialData, state) {
    if (!cStat) return '';
    const { cab, revenue, expensesTotal, emiExpenses, repairExpenses, otherExpenses, netProfit, assignedDriverId } = cStat;
    const driver = state.drivers.find(d => d.id === assignedDriverId);
    const cabExpenses = financialData.filteredExpenses.filter(e => e.cabId === cab.id);

    const shares = cab.shares || {};
    const ownerBadges = Object.keys(shares).map(oId => {
      const owner = state.owners.find(o => o.id === oId);
      return `<span class="badge-cat" style="background: rgba(139, 92, 246, 0.15); color: #a78bfa;">${owner ? owner.name : 'Unknown'}: ${shares[oId]}%</span>`;
    }).join(' ');

    const isInactive = cab.status === 'Inactive';

    return `
      <div class="card" style="${isInactive ? 'opacity: 0.75; border-left: 4px solid var(--accent-danger);' : 'border-left: 4px solid var(--accent-success);'}">
        <div class="card-header" style="border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem; margin-bottom: 1rem;">
          <div>
            <h3 style="font-size: 1.15rem; font-weight: 800; display: flex; align-items: center; gap: 0.5rem;">
              <i class="fa-solid fa-taxi" style="color: var(--accent-primary);"></i> ${cab.plate}
            </h3>
            <span style="font-size: 0.78rem; color: var(--text-muted);">${cab.model} (${cab.color})</span>
          </div>
          <div style="display:flex; align-items:center; gap:0.4rem;">
            <span class="status-pill status-${cab.status.toLowerCase()}">${cab.status}</span>
            <button class="btn btn-xs btn-primary-soft" onclick="App.openEditCabModal('${cab.id}')" title="Edit Cab / Shares">
              <i class="fa-solid fa-gear"></i>
            </button>
            <button class="btn btn-xs btn-danger-soft" onclick="App.openLogExpenseForCabModal('${cab.id}')" title="Log Expense">
              <i class="fa-solid fa-plus"></i>
            </button>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.82rem; margin-bottom: 0.8rem; background: var(--bg-primary); padding: 0.6rem 0.8rem; border-radius: var(--radius-sm);">
          <div>
            <span style="color: var(--text-muted);">Assigned Driver:</span>
            <strong>${driver ? driver.name : 'Unassigned'}</strong>
          </div>
          <div>${ownerBadges}</div>
        </div>

        <div style="background: var(--bg-tertiary); padding: 0.85rem; border-radius: var(--radius-md); margin-bottom: 1rem;">
          <div style="display: flex; justify-content: space-between; font-size: 0.82rem; margin-bottom: 0.35rem;">
            <span><i class="fa-solid fa-hand-holding-dollar text-success"></i> Revenue Collected:</span>
            <strong class="text-success">${Utils.formatINR(revenue)}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.82rem; margin-bottom: 0.35rem;">
            <span><i class="fa-solid fa-building-columns text-warning"></i> EMI Expenses:</span>
            <strong class="text-warning">-${Utils.formatINR(emiExpenses)}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.82rem; margin-bottom: 0.35rem;">
            <span><i class="fa-solid fa-wrench text-danger"></i> Repairs & Service:</span>
            <strong class="text-danger">-${Utils.formatINR(repairExpenses + otherExpenses)}</strong>
          </div>
          <div style="border-top: 1px solid var(--border-color); pt-2; margin-top: 0.4rem; display: flex; justify-content: space-between; font-size: 0.95rem; font-weight: 800;">
            <span>Net Cab Profit:</span>
            <span style="color: var(--accent-primary);">${Utils.formatINR(netProfit)}</span>
          </div>
        </div>

        <div>
          <h4 style="font-size: 0.78rem; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.4rem;">
            Expense History (${cabExpenses.length})
          </h4>
          ${cabExpenses.length ? `
            <div style="max-height: 100px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.3rem;">
              ${cabExpenses.map(e => {
                const ownerPayer = e.paidByOwnerId ? state.owners.find(o => o.id === e.paidByOwnerId) : null;
                return `
                  <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.78rem; background: var(--bg-glass); padding: 0.35rem 0.6rem; border-radius: var(--radius-sm);">
                    <span>
                      <span class="badge-cat badge-${e.category.toLowerCase()}">${e.category}</span>
                      ${ownerPayer ? `<span style="color:var(--accent-warning); font-size:0.7rem;"> (Paid by ${ownerPayer.name})</span>` : ''}
                    </span>
                    <span style="font-weight: 700; color: var(--accent-danger);">${Utils.formatINR(e.amount)}</span>
                  </div>
                `;
              }).join('')}
            </div>
          ` : `<div style="font-size: 0.75rem; color: var(--text-muted);">No expenses logged for this cab.</div>`}
        </div>
      </div>
    `;
  }

  function renderExpensesTableRows(filteredExpenses, state) {
    if (!filteredExpenses.length) {
      return `<tr><td colspan="8" style="text-align:center; color: var(--text-muted); padding: 2rem;">No expense logs found for selected period.</td></tr>`;
    }

    return filteredExpenses.map(exp => {
      const cab = state.cabs.find(c => c.id === exp.cabId);
      const ownerPayer = exp.paidByOwnerId ? state.owners.find(o => o.id === exp.paidByOwnerId) : null;

      return `
        <tr>
          <td>${Utils.formatDate(exp.date)}</td>
          <td><strong>${cab ? cab.plate : 'General'}</strong></td>
          <td><span class="badge-cat badge-${exp.category.toLowerCase()}">${exp.category}</span></td>
          <td style="color: var(--accent-danger); font-weight: 800;">${Utils.formatINR(exp.amount)}</td>
          <td>
            ${ownerPayer ? `
              <span class="badge-cat" style="background: rgba(245, 158, 11, 0.15); color: #f59e0b;"><i class="fa-solid fa-user"></i> ${ownerPayer.name}</span>
            ` : `<span style="color:var(--text-muted)">Fleet Account</span>`}
          </td>
          <td>${exp.vendor || '-'}</td>
          <td style="font-size: 0.78rem; color: var(--text-muted);">${exp.notes || '-'}</td>
          <td>
            <button class="btn btn-xs btn-primary-soft" onclick="App.openEditExpenseModal('${exp.id}')" title="Edit Expense">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button class="btn btn-xs btn-danger-soft" onclick="Store.deleteExpense('${exp.id}')" title="Delete Expense">
              <i class="fa-solid fa-trash"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  return { render };
})();
