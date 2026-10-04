/* ==========================================================================
   WHEEL UP DASHBOARD - SHEET 2: OWNERS & PROFIT SHARING VIEW RENDERER
   ========================================================================== */

const SheetOwners = (function() {

  function render(container, financialData) {
    const { ownerStatsMap, summary } = financialData;
    const ownersList = Object.values(ownerStatsMap);

    container.innerHTML = `
      <!-- Owners Header -->
      <div class="card" style="background: linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(139, 92, 246, 0.15)); border: 1px solid rgba(139, 92, 246, 0.3);">
        <div class="card-header">
          <div>
            <h2 class="card-title" style="font-size: 1.25rem;"><i class="fa-solid fa-user-tie" style="color: #a78bfa;"></i> Owners Profit Sharing & Ledger</h2>
            <p style="font-size: 0.82rem; color: var(--text-muted); margin-top: 0.2rem;">
              Track per-cab ownership %, direct revenues, out-of-pocket expense reimbursements, payouts made, and pending payable balances.
            </p>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <button class="btn btn-sm btn-success" onclick="App.openModal('log-payout')">
              <i class="fa-solid fa-money-bill-transfer"></i> Log Owner Payout
            </button>
            <button class="btn btn-sm btn-primary-soft" onclick="App.openModal('add-owner')">
              <i class="fa-solid fa-user-plus"></i> Add Owner
            </button>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-top: 0.5rem;">
          <div style="background: rgba(0,0,0,0.2); padding: 0.9rem; border-radius: var(--radius-md);">
            <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Total Fleet Net Profit</div>
            <div style="font-size: 1.3rem; font-weight: 800; color: var(--accent-primary);">${Utils.formatINR(summary.fleetTotalNetProfit)}</div>
          </div>
          <div style="background: rgba(0,0,0,0.2); padding: 0.9rem; border-radius: var(--radius-md);">
            <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Total Payouts Paid</div>
            <div style="font-size: 1.3rem; font-weight: 800; color: var(--accent-success);">${Utils.formatINR(summary.totalPaidToOwners)}</div>
          </div>
          <div style="background: rgba(0,0,0,0.2); padding: 0.9rem; border-radius: var(--radius-md);">
            <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Total Pending Payable Balance</div>
            <div style="font-size: 1.3rem; font-weight: 800; color: var(--accent-warning);">${Utils.formatINR(summary.totalPayableToOwners)}</div>
          </div>
        </div>
      </div>

      <!-- Owners Grid Cards -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 1.25rem;">
        ${ownersList.map(oStat => renderOwnerCard(oStat, financialData)).join('')}
      </div>
    `;
  }

  function renderOwnerCard(oStat, financialData) {
    const { owner, totalEarned, earnedProfitFromCabs, directIncome, outOfPocketExpenses, payoutsPaid, payableBalance, cabBreakdown } = oStat;
    const state = Store.getState();
    const ownerPayouts = state.payouts.filter(p => p.ownerId === owner.id);

    return `
      <div class="card">
        <div class="card-header" style="border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem; margin-bottom: 1rem;">
          <div>
            <h3 style="font-size: 1.1rem; font-weight: 700;">${owner.name}</h3>
            <span style="font-size: 0.78rem; color: var(--text-muted);"><i class="fa-solid fa-phone"></i> ${owner.phone || 'N/A'}</span>
          </div>
          <div style="text-align: right;">
            <button class="btn btn-xs btn-success-soft" onclick="App.openLogPayoutForOwnerModal('${owner.id}')">
              <i class="fa-solid fa-hand-holding-dollar"></i> Pay Owner
            </button>
            <button class="btn btn-xs btn-secondary-soft" onclick="App.openEditOwnerModal('${owner.id}')">
              <i class="fa-solid fa-pen"></i> Edit Owner
            </button>
          </div>
        </div>

        <!-- Financial Balance Grid -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; background: var(--bg-tertiary); padding: 0.75rem; border-radius: var(--radius-md); margin-bottom: 1rem;">
          <div>
            <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">Total Profit Earned</div>
            <div style="font-size: 1.05rem; font-weight: 700; color: var(--accent-primary);">${Utils.formatINR(totalEarned)}</div>
            ${directIncome > 0 ? `<div style="font-size:0.7rem; color:var(--accent-success)">Direct Income: +${Utils.formatINR(directIncome)}</div>` : ''}
          </div>
          <div>
            <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">Out-of-Pocket Paid</div>
            <div style="font-size: 1.05rem; font-weight: 700; color: var(--accent-warning);">${Utils.formatINR(outOfPocketExpenses)}</div>
            <div style="font-size:0.7rem; color:var(--text-muted)">Reimbursement Owed</div>
          </div>
          <div style="grid-column: span 2; border-top: 1px solid var(--border-color); pt-2; margin-top: 0.3rem; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <span style="font-size: 0.75rem; color: var(--text-muted);">Payouts Paid: </span>
              <strong style="color: var(--accent-success);">${Utils.formatINR(payoutsPaid)}</strong>
            </div>
            <div>
              <span style="font-size: 0.75rem; color: var(--text-muted);">Net Payable Due: </span>
              <strong style="font-size: 1.15rem; color: ${payableBalance > 0 ? 'var(--accent-warning)' : 'var(--accent-success)'};">${Utils.formatINR(payableBalance)}</strong>
            </div>
          </div>
        </div>

        <!-- Owned Cabs Breakdown -->
        <div style="margin-bottom: 1rem;">
          <h4 style="font-size: 0.82rem; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.5rem; letter-spacing: 0.04em;">
            <i class="fa-solid fa-car"></i> Owned Cabs & Profit Split
          </h4>
          ${cabBreakdown.length ? `
            <div style="display: flex; flex-direction: column; gap: 0.4rem;">
              ${cabBreakdown.map(cb => `
                <div style="display: flex; align-items: center; justify-content: space-between; background: var(--bg-primary); padding: 0.55rem 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color); font-size: 0.82rem;">
                  <div>
                    <strong>${cb.plate}</strong> <span style="font-size: 0.75rem; color: var(--text-muted);">(${cb.sharePct}% Share)</span>
                  </div>
                  <div style="text-align: right;">
                    <div style="font-weight: 700; color: var(--accent-primary);">${Utils.formatINR(cb.ownerEarnedShare)}</div>
                    <div style="font-size: 0.7rem; color: var(--text-muted);">Cab Profit: ${Utils.formatINR(cb.cabNetProfit)}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : `<div style="font-size: 0.8rem; color: var(--text-muted); italic">No cabs assigned to this owner.</div>`}
        </div>

        <!-- Owner Payout Receipts Log with Edit & Delete -->
        <div>
          <h4 style="font-size: 0.82rem; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.5rem; letter-spacing: 0.04em; display:flex; justify-content:space-between; align-items:center;">
            <span><i class="fa-solid fa-receipt"></i> Owner Payout Receipts Log</span>
            <button class="btn btn-xs btn-success-soft" onclick="App.openLogPayoutForOwnerModal('${owner.id}')">+ Add Payout</button>
          </h4>
          ${ownerPayouts.length ? `
            <div style="max-height: 140px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.35rem;">
              ${ownerPayouts.map(p => `
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.78rem; background: var(--bg-glass); padding: 0.45rem 0.65rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
                  <div>
                    <i class="fa-solid fa-calendar-day text-muted"></i> <strong>${Utils.formatDate(p.date)}</strong>
                    <span style="color:var(--text-muted); font-size:0.72rem;"> (${p.mode})</span>
                  </div>
                  <div style="display:flex; align-items:center; gap:0.5rem;">
                    <span style="font-weight: 800; color: var(--accent-success);">${Utils.formatINR(p.amount)}</span>
                    <button class="btn btn-xs btn-primary-soft" onclick="App.openEditOwnerPayoutModal('${p.id}')" title="Edit Payout"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn btn-xs btn-danger-soft" onclick="Store.deleteOwnerPayout('${p.id}')" title="Delete Payout"><i class="fa-solid fa-trash"></i></button>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : `<div style="font-size: 0.78rem; color: var(--text-muted);">No payouts recorded yet.</div>`}
        </div>
      </div>
    `;
  }

  return { render };
})();
