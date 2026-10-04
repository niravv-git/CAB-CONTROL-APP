/* ==========================================================================
   WHEEL UP DASHBOARD - SHEET 1: DASHBOARD VIEW RENDERER
   ========================================================================== */

const SheetDashboard = (function() {
  let revenueChart = null;
  let ownerChart = null;

  function render(container, financialData) {
    const { summary, cabStatsMap, ownerStatsMap } = financialData;
    const state = Store.getState();

    container.innerHTML = `
      <!-- Interlinked Live Formula Banner -->
      <div class="interlinked-formula-card">
        <div class="formula-step">
          <span class="title"><i class="fa-solid fa-hand-holding-dollar"></i> Total Revenue</span>
          <span class="value text-success">${Utils.formatINR(summary.fleetTotalRevenue)}</span>
        </div>
        <div class="formula-operator">-</div>
        <div class="formula-step">
          <span class="title"><i class="fa-solid fa-building-columns"></i> EMI Expenses</span>
          <span class="value text-warning">${Utils.formatINR(summary.fleetTotalEMI)}</span>
        </div>
        <div class="formula-operator">-</div>
        <div class="formula-step">
          <span class="title"><i class="fa-solid fa-wrench"></i> Repairs & Other</span>
          <span class="value text-danger">${Utils.formatINR(summary.fleetTotalExpenses - summary.fleetTotalEMI)}</span>
        </div>
        <div class="formula-operator">=</div>
        <div class="formula-step">
          <span class="title"><i class="fa-solid fa-coins"></i> Fleet Net Profit</span>
          <span class="value text-info" style="color: var(--accent-primary);">${Utils.formatINR(summary.fleetTotalNetProfit)}</span>
        </div>
        <div class="formula-operator">➜</div>
        <div class="formula-step">
          <span class="title"><i class="fa-solid fa-users"></i> Owner Payable</span>
          <span class="value" style="color: var(--accent-warning);">${Utils.formatINR(summary.totalPayableToOwners)}</span>
        </div>
      </div>

      <!-- KPI Grid -->
      <div class="kpi-grid">
        <div class="kpi-card revenue">
          <div class="kpi-icon"><i class="fa-solid fa-hand-holding-dollar"></i></div>
          <div class="kpi-data">
            <span class="kpi-label">Driver Revenue Recv</span>
            <span class="kpi-value">${Utils.formatINR(summary.fleetTotalRevenue)}</span>
            <span class="kpi-sub">From ${financialData.filteredRevenues.length} receipts</span>
          </div>
        </div>

        <div class="kpi-card expense">
          <div class="kpi-icon"><i class="fa-solid fa-receipt"></i></div>
          <div class="kpi-data">
            <span class="kpi-label">Total Cab Expenses</span>
            <span class="kpi-value">${Utils.formatINR(summary.fleetTotalExpenses)}</span>
            <span class="kpi-sub">EMI: ${Utils.formatINR(summary.fleetTotalEMI)} | Repairs: ${Utils.formatINR(summary.fleetTotalRepairs)}</span>
          </div>
        </div>

        <div class="kpi-card profit">
          <div class="kpi-icon"><i class="fa-solid fa-chart-line"></i></div>
          <div class="kpi-data">
            <span class="kpi-label">Net Fleet Profit</span>
            <span class="kpi-value">${Utils.formatINR(summary.fleetTotalNetProfit)}</span>
            <span class="kpi-sub">Shared among ${summary.totalOwners} owners</span>
          </div>
        </div>

        <div class="kpi-card payable">
          <div class="kpi-icon"><i class="fa-solid fa-money-bill-transfer"></i></div>
          <div class="kpi-data">
            <span class="kpi-label">Owner Payable Balance</span>
            <span class="kpi-value" style="color: var(--accent-warning);">${Utils.formatINR(summary.totalPayableToOwners)}</span>
            <span class="kpi-sub">Paid to Owners: ${Utils.formatINR(summary.totalPaidToOwners)}</span>
          </div>
        </div>
      </div>

      <!-- Charts Row -->
      <div class="charts-grid">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><i class="fa-solid fa-chart-column"></i> Revenue vs Expenses vs Net Profit</h3>
            <span class="badge badge-cat">Period Financial Breakdown</span>
          </div>
          <div class="chart-container">
            <canvas id="dashboard-revenue-chart"></canvas>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><i class="fa-solid fa-chart-pie"></i> Owner Profit & Payable Split</h3>
          </div>
          <div class="chart-container">
            <canvas id="dashboard-owner-chart"></canvas>
          </div>
        </div>
      </div>

      <!-- Active Fleet & Allocation Table -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i class="fa-solid fa-taxi"></i> Fleet Overview & Live Driver Allocations</h3>
          <button class="btn btn-sm btn-primary-soft" onclick="App.openModal('add-cab')">
            <i class="fa-solid fa-plus"></i> Add New Cab
          </button>
        </div>
        
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Cab Info</th>
                <th>Assigned Driver</th>
                <th>Owners & Share</th>
                <th>Driver Revenue</th>
                <th>Expenses (EMI + Repairs)</th>
                <th>Net Profit</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${renderFleetTableRows(cabStatsMap, state)}
            </tbody>
          </table>
        </div>
      </div>
    `;

    initCharts(financialData);
  }

  function renderFleetTableRows(cabStatsMap, state) {
    const cabs = Object.values(cabStatsMap);
    if (!cabs.length) {
      return `<tr><td colspan="8" style="text-align:center; color: var(--text-muted); padding: 2rem;">No cabs found in fleet.</td></tr>`;
    }

    return cabs.map(cStat => {
      const { cab, revenue, expensesTotal, emiExpenses, repairExpenses, netProfit, assignedDriverId } = cStat;
      const driver = state.drivers.find(d => d.id === assignedDriverId);
      
      // Render owners pill
      const shares = cab.shares || {};
      const ownerPills = Object.keys(shares).map(oId => {
        const owner = state.owners.find(o => o.id === oId);
        const name = owner ? owner.name : 'Unknown';
        return `<span class="badge-cat" style="background: rgba(139, 92, 246, 0.15); color: #a78bfa;">${name} (${shares[oId]}%)</span>`;
      }).join(' ');

      return `
        <tr>
          <td>
            <strong>${cab.plate}</strong>
            <div style="font-size: 0.78rem; color: var(--text-muted);">${cab.model}</div>
          </td>
          <td>
            ${driver ? `
              <div><strong>${driver.name}</strong></div>
              <div style="font-size: 0.78rem; color: var(--text-muted);">${driver.phone}</div>
            ` : `<span style="color: var(--text-muted); italic">Unassigned</span>`}
          </td>
          <td>${ownerPills || '<span style="color: var(--text-muted)">No Owner Share</span>'}</td>
          <td style="color: var(--accent-success); font-weight: 700;">${Utils.formatINR(revenue)}</td>
          <td>
            <div>${Utils.formatINR(expensesTotal)}</div>
            <div style="font-size: 0.72rem; color: var(--text-muted);">EMI: ${Utils.formatINR(emiExpenses)} | Rep: ${Utils.formatINR(repairExpenses)}</div>
          </td>
          <td style="color: var(--accent-primary); font-weight: 800;">${Utils.formatINR(netProfit)}</td>
          <td><span class="status-pill status-${cab.status.toLowerCase()}">${cab.status}</span></td>
          <td>
            <button class="btn btn-xs btn-primary-soft" onclick="App.openEditCabModal('${cab.id}')" title="Edit Cab & Ownership Share">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button class="btn btn-xs btn-success-soft" onclick="App.openLogExpenseModal('${cab.id}')" title="Log Cab Expense">
              <i class="fa-solid fa-plus"></i> Expense
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  function initCharts(financialData) {
    const { summary, ownerStatsMap, cabStatsMap } = financialData;

    // 1. Revenue vs Expenses vs Profit Chart
    const ctx1 = document.getElementById('dashboard-revenue-chart');
    if (ctx1) {
      if (revenueChart) revenueChart.destroy();
      
      const cabLabels = Object.values(cabStatsMap).map(c => c.cab.plate);
      const revData = Object.values(cabStatsMap).map(c => c.revenue);
      const expData = Object.values(cabStatsMap).map(c => c.expensesTotal);
      const profitData = Object.values(cabStatsMap).map(c => c.netProfit);

      revenueChart = new Chart(ctx1, {
        type: 'bar',
        data: {
          labels: cabLabels,
          datasets: [
            { label: 'Driver Revenue', data: revData, backgroundColor: '#10b981', borderRadius: 4 },
            { label: 'Expenses (EMI+Repairs)', data: expData, backgroundColor: '#ef4444', borderRadius: 4 },
            { label: 'Net Profit', data: profitData, backgroundColor: '#38bdf8', borderRadius: 4 }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: '#94a3b8', font: { family: 'Inter', size: 12 } } }
          },
          scales: {
            x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
            y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
          }
        }
      });
    }

    // 2. Owner Split Chart
    const ctx2 = document.getElementById('dashboard-owner-chart');
    if (ctx2) {
      if (ownerChart) ownerChart.destroy();

      const owners = Object.values(ownerStatsMap);
      const labels = owners.map(o => o.owner.name);
      const earnedData = owners.map(o => o.earnedProfit);

      ownerChart = new Chart(ctx2, {
        type: 'doughnut',
        data: {
          labels: labels,
          datasets: [{
            data: earnedData,
            backgroundColor: ['#38bdf8', '#8b5cf6', '#f59e0b', '#10b981', '#ec4899'],
            borderWidth: 2,
            borderColor: '#1e293b'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { color: '#94a3b8', font: { family: 'Inter', size: 11 } } }
          }
        }
      });
    }
  }

  return { render };
})();
