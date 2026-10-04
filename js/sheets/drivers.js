/* ==========================================================================
   WHEEL UP DASHBOARD - SHEET 4: DRIVERS & REVENUE COLLECTION VIEW RENDERER
   ========================================================================== */

const SheetDrivers = (function() {
  let hideInactive = false;

  function render(container, financialData) {
    const { driverStatsMap, filteredRevenues, summary, sortedDrivers } = financialData;
    const state = Store.getState();

    let displayDrivers = sortedDrivers;
    if (hideInactive) {
      displayDrivers = displayDrivers.filter(d => d.status === 'Active');
    }

    container.innerHTML = `
      <!-- Drivers Header -->
      <div class="card" style="background: linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(16, 185, 129, 0.15)); border: 1px solid rgba(16, 185, 129, 0.3);">
        <div class="card-header">
          <div>
            <h2 class="card-title" style="font-size: 1.25rem;"><i class="fa-solid fa-id-card" style="color: var(--accent-success);"></i> Drivers & Revenue Collections</h2>
            <p style="font-size: 0.82rem; color: var(--text-muted); margin-top: 0.2rem;">
              Manage active/inactive drivers, log rent payments & direct income, print receipts, and track rent status.
            </p>
          </div>
          <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
            <label style="font-size:0.82rem; cursor:pointer; display:flex; align-items:center; gap:0.4rem; background:var(--bg-tertiary); padding:0.4rem 0.7rem; border-radius:var(--radius-md);">
              <input type="checkbox" id="hide-inactive-toggle" ${hideInactive ? 'checked' : ''} onchange="SheetDrivers.toggleHideInactive(this.checked)">
              <span>Hide Inactive Drivers</span>
            </label>
            <button class="btn btn-sm btn-success" onclick="App.openModal('log-revenue')">
              <i class="fa-solid fa-hand-holding-dollar"></i> Recv Revenue
            </button>
            <button class="btn btn-sm btn-secondary-soft" onclick="App.openModal('allocate-driver')">
              <i class="fa-solid fa-calendar-plus"></i> Assign Cab
            </button>
            <button class="btn btn-sm btn-primary-soft" onclick="App.openModal('add-driver')">
              <i class="fa-solid fa-user-plus"></i> Add Driver
            </button>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-top: 0.5rem;">
          <div style="background: rgba(0,0,0,0.2); padding: 0.85rem; border-radius: var(--radius-md);">
            <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">Total Fleet Drivers</div>
            <div style="font-size: 1.3rem; font-weight: 800; color: var(--text-main);">${sortedDrivers.length} Drivers</div>
          </div>
          <div style="background: rgba(0,0,0,0.2); padding: 0.85rem; border-radius: var(--radius-md);">
            <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">Total Revenue Received</div>
            <div style="font-size: 1.3rem; font-weight: 800; color: var(--accent-success);">${Utils.formatINR(summary.fleetTotalRevenue)}</div>
          </div>
          <div style="background: rgba(0,0,0,0.2); padding: 0.85rem; border-radius: var(--radius-md);">
            <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">Receipts Count</div>
            <div style="font-size: 1.3rem; font-weight: 800; color: var(--accent-primary);">${filteredRevenues.length} Payments</div>
          </div>
        </div>
      </div>

      <!-- Drivers Grid (Active First, Inactive Last) -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.25rem;">
        ${displayDrivers.map(driver => renderDriverCard(driverStatsMap[driver.id], financialData, state)).join('')}
      </div>

      <!-- Revenue Receipts History Log Table -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i class="fa-solid fa-receipt"></i> Revenue Receipts Log</h3>
          <button class="btn btn-sm btn-success-soft" onclick="App.openModal('log-revenue')">
            <i class="fa-solid fa-plus"></i> Collect Revenue
          </button>
        </div>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Receipt Date</th>
                <th>Revenue Type</th>
                <th>Driver / Source</th>
                <th>Cab Assigned</th>
                <th>Amount Collected</th>
                <th>Mode</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${renderRevenuesTableRows(filteredRevenues, state)}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function toggleHideInactive(val) {
    hideInactive = val;
    App.renderCurrentSheet();
  }

  function renderDriverCard(dStat, financialData, state) {
    if (!dStat) return '';
    const { driver, totalPaid, assignedCab } = dStat;
    const driverRevenues = financialData.filteredRevenues.filter(r => r.driverId === driver.id);
    const agreedTarget = driver.agreedMonthlyRate || 18000;
    const isTargetMet = totalPaid >= agreedTarget;
    const isInactive = driver.status === 'Inactive';

    return `
      <div class="card" style="${isInactive ? 'opacity: 0.75; border-left: 4px solid var(--accent-danger);' : 'border-left: 4px solid var(--accent-success);'}">
        <div class="card-header" style="border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem; margin-bottom: 1rem;">
          <div>
            <h3 style="font-size: 1.1rem; font-weight: 700;">${driver.name}</h3>
            <span style="font-size: 0.78rem; color: var(--text-muted);"><i class="fa-solid fa-phone"></i> ${driver.phone}</span>
          </div>
          <div style="display:flex; align-items:center; gap:0.4rem;">
            <span class="status-pill status-${driver.status.toLowerCase()}">${driver.status}</span>
            <button class="btn btn-xs btn-success-soft" onclick="App.openLogRevenueForDriverModal('${driver.id}')" title="Recv Rent">
              <i class="fa-solid fa-hand-holding-dollar"></i>
            </button>
            <button class="btn btn-xs btn-secondary-soft" onclick="App.openEditDriverModal('${driver.id}')" title="Edit Driver">
              <i class="fa-solid fa-pen"></i>
            </button>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.8rem; background: var(--bg-primary); padding: 0.6rem 0.8rem; border-radius: var(--radius-sm); margin-bottom: 0.8rem;">
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-muted);">Assigned Cab:</span>
            <strong>${assignedCab ? `<i class="fa-solid fa-taxi text-info"></i> ${assignedCab.plate}` : '<span style="color:var(--text-muted)">Unassigned</span>'}</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-muted);">License #:</span>
            <span>${driver.license || 'N/A'}</span>
          </div>
        </div>

        <div style="background: var(--bg-tertiary); padding: 0.75rem; border-radius: var(--radius-md); margin-bottom: 0.8rem;">
          <div style="display: flex; justify-content: space-between; font-size: 0.82rem; margin-bottom: 0.3rem;">
            <span>Agreed Monthly Target:</span>
            <strong>${Utils.formatINR(agreedTarget)}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.82rem; margin-bottom: 0.4rem;">
            <span>Revenue Received:</span>
            <strong class="text-success">${Utils.formatINR(totalPaid)}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.8rem;">
            <span>Status:</span>
            <span class="status-pill status-${isTargetMet ? 'paid' : 'partial'}">${isTargetMet ? 'Target Met' : 'Partial / Pending'}</span>
          </div>
        </div>

        <div>
          <h4 style="font-size: 0.78rem; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.4rem;">
            Payment Receipts (${driverRevenues.length})
          </h4>
          ${driverRevenues.length ? `
            <div style="max-height: 100px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.3rem;">
              ${driverRevenues.map(r => `
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.78rem; background: var(--bg-glass); padding: 0.35rem 0.6rem; border-radius: var(--radius-sm);">
                  <span>${Utils.formatDate(r.date)} (${r.mode})</span>
                  <span style="font-weight: 700; color: var(--accent-success);">${Utils.formatINR(r.amount)}</span>
                </div>
              `).join('')}
            </div>
          ` : `<div style="font-size: 0.75rem; color: var(--text-muted);">No revenue receipts recorded for this period.</div>`}
        </div>
      </div>
    `;
  }

  function renderRevenuesTableRows(filteredRevenues, state) {
    if (!filteredRevenues.length) {
      return `<tr><td colspan="8" style="text-align:center; color: var(--text-muted); padding: 2rem;">No revenue receipts found for selected period.</td></tr>`;
    }

    return filteredRevenues.map(rev => {
      const driver = rev.driverId ? state.drivers.find(d => d.id === rev.driverId) : null;
      const cab = rev.cabId ? state.cabs.find(c => c.id === rev.cabId) : null;
      const directOwner = rev.directOwnerId ? state.owners.find(o => o.id === rev.directOwnerId) : null;

      const isDirect = rev.revenueType === 'Direct Income';

      return `
        <tr>
          <td>${Utils.formatDate(rev.date)}</td>
          <td>
            <span class="badge-cat" style="${isDirect ? 'background:rgba(139, 92, 246, 0.15); color:#a78bfa;' : 'background:rgba(16, 185, 129, 0.15); color:#10b981;'}">
              ${rev.revenueType || 'Driver Rent'}
            </span>
          </td>
          <td>
            ${isDirect ? `
              <strong><i class="fa-solid fa-user-tie"></i> ${directOwner ? directOwner.name : 'Owner Direct'}</strong>
            ` : `
              <strong>${driver ? driver.name : 'Driver Rent'}</strong>
            `}
          </td>
          <td>${cab ? cab.plate : '-'}</td>
          <td style="color: var(--accent-success); font-weight: 800;">${Utils.formatINR(rev.amount)}</td>
          <td><span class="badge-cat" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8;">${rev.mode}</span></td>
          <td style="font-size: 0.78rem; color: var(--text-muted);">${rev.notes || '-'}</td>
          <td>
            <button class="btn btn-xs btn-primary-soft" onclick="App.openEditRevenueModal('${rev.id}')" title="Edit Revenue">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button class="btn btn-xs btn-secondary-soft" onclick="App.printReceipt('${rev.id}')" title="Print Receipt">
              <i class="fa-solid fa-print"></i>
            </button>
            <button class="btn btn-xs btn-danger-soft" onclick="Store.deleteRevenue('${rev.id}')" title="Delete Receipt">
              <i class="fa-solid fa-trash"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  return { render, toggleHideInactive };
})();
