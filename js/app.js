/* ==========================================================================
   WHEEL UP DASHBOARD - MAIN APPLICATION CONTROLLER & MODAL ENGINE
   ========================================================================== */

const App = (function() {
  let activeSheet = 'dashboard';
  let activePreset = 'this-month';
  let customStartDate = null;
  let customEndDate = null;

  function init() {
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const sheet = btn.getAttribute('data-sheet');
        if (sheet) {
          switchSheet(sheet);
          toggleMobileSidebar(false);
        }
      });
    });

    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

    const presetSelect = document.getElementById('period-preset-select');
    const customBox = document.getElementById('custom-date-range-box');
    const applyBtn = document.getElementById('apply-date-range-btn');

    if (presetSelect) {
      presetSelect.addEventListener('change', (e) => {
        activePreset = e.target.value;
        if (activePreset === 'custom') {
          customBox.classList.remove('hidden');
        } else {
          customBox.classList.add('hidden');
          renderCurrentSheet();
        }
      });
    }

    if (applyBtn) {
      applyBtn.addEventListener('click', () => {
        customStartDate = document.getElementById('start-date-input').value;
        customEndDate = document.getElementById('end-date-input').value;
        renderCurrentSheet();
      });
    }

    Store.subscribe(() => {
      renderCurrentSheet();
      updateSidebarBadges();
    });

    renderCurrentSheet();
    updateSidebarBadges();
  }

  function toggleMobileSidebar(open) {
    const sidebar = document.getElementById('app-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (!sidebar || !overlay) return;

    if (open === undefined) {
      open = !sidebar.classList.contains('mobile-open');
    }

    sidebar.classList.toggle('mobile-open', open);
    overlay.classList.toggle('active', open);
  }

  function switchSheet(sheetName) {
    activeSheet = sheetName;
    
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-sheet') === sheetName);
    });

    document.querySelectorAll('.sheet-view').forEach(view => {
      view.classList.toggle('active', view.id === `sheet-${sheetName}`);
    });

    const headings = {
      dashboard: { title: 'Dashboard Overview', sub: 'Comprehensive fleet metrics, revenue vs expense breakdown & profit sharing' },
      owners: { title: 'Owners & Profit Sharing', sub: 'Per-cab ownership shares, net profit calculations & owner payout balances' },
      cabs: { title: 'Cabs & Expense Manager', sub: 'Fleet management, vehicle insurance/fitness logs & EMI/repair expenses' },
      drivers: { title: 'Drivers & Revenue Log', sub: 'Driver profiles, cab allocations & driver rent payment receipts' },
      reminders: { title: 'Reminders & Calendar', sub: 'Action items for EMI clearances, rent due dates, and document renewals' }
    };

    const h = headings[sheetName] || headings.dashboard;
    document.getElementById('page-heading').textContent = h.title;
    document.getElementById('page-subheading').textContent = h.sub;

    renderCurrentSheet();
  }

  function renderCurrentSheet() {
    const range = Utils.getDateRangeForPreset(activePreset, customStartDate, customEndDate);
    const displayPill = document.getElementById('active-period-display');
    if (displayPill) {
      displayPill.innerHTML = `<i class="fa-solid fa-filter"></i> ${range.label}`;
    }

    const financialData = Utils.computeInterlinkedFinancials(range.startDate, range.endDate);
    const container = document.getElementById(`sheet-${activeSheet}`);
    if (!container) return;

    switch (activeSheet) {
      case 'dashboard':
        SheetDashboard.render(container, financialData);
        break;
      case 'owners':
        SheetOwners.render(container, financialData);
        break;
      case 'cabs':
        SheetCabs.render(container, financialData);
        break;
      case 'drivers':
        SheetDrivers.render(container, financialData);
        break;
      case 'reminders':
        SheetReminders.render(container, financialData);
        break;
    }
  }

  function updateSidebarBadges() {
    const state = Store.getState();
    const range = Utils.getDateRangeForPreset(activePreset, customStartDate, customEndDate);
    const fin = Utils.computeInterlinkedFinancials(range.startDate, range.endDate);

    const payableBadge = document.getElementById('nav-payable-badge');
    const cabsCount = document.getElementById('nav-cabs-count');
    const driversCount = document.getElementById('nav-drivers-count');
    const remindersBadge = document.getElementById('nav-reminders-badge');

    if (payableBadge) payableBadge.textContent = Utils.formatINR(fin.summary.totalPayableToOwners);
    if (cabsCount) cabsCount.textContent = state.cabs.length;
    if (driversCount) driversCount.textContent = state.drivers.length;
    if (remindersBadge) {
      const pending = (state.reminders || []).filter(r => r.status === 'Pending').length;
      remindersBadge.textContent = pending;
    }
  }

  function toggleTheme() {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme');
    const next = current === 'light' ? 'dark' : 'light';
    html.setAttribute('data-theme', next);
    document.getElementById('theme-text').textContent = next === 'light' ? 'Light Mode' : 'Dark Mode';
  }

  // --- Modal Engine ---
  function openModal(modalType, extraData = {}) {
    const overlay = document.getElementById('global-modal-overlay');
    const titleEl = document.getElementById('modal-title');
    const bodyEl = document.getElementById('modal-body');

    const state = Store.getState();
    const todayStr = new Date().toISOString().slice(0, 10);
    let html = '';

    switch (modalType) {
      case 'log-revenue':
      case 'edit-revenue':
        const editRev = extraData.revenueId ? state.revenues.find(r => r.id === extraData.revenueId) : null;
        titleEl.textContent = editRev ? `Edit Revenue Receipt: ${editRev.id}` : 'Receive Driver Rent / Revenue';
        
        const revType = editRev ? (editRev.revenueType || 'Driver Rent') : 'Driver Rent';

        html = `
          <form onsubmit="App.handleSaveRevenue(event, '${editRev ? editRev.id : ''}')">
            <div class="form-group">
              <label>Revenue Type *</label>
              <select name="revenueType" class="form-control" onchange="App.toggleRevenueTypeFields(this.value)">
                <option value="Driver Rent" ${revType === 'Driver Rent' ? 'selected' : ''}>Driver Rent Collection</option>
                <option value="Direct Income" ${revType === 'Direct Income' ? 'selected' : ''}>Direct / Non-Driver Income (Claim, Scrap, Bonus)</option>
              </select>
            </div>

            <div class="form-row">
              <div class="form-group" id="revenue-driver-group" style="${revType === 'Direct Income' ? 'display:none;' : ''}">
                <label>Select Driver *</label>
                <select name="driverId" class="form-control" onchange="App.autoFillCabForDriver(this.value)">
                  <option value="">-- Choose Driver --</option>
                  ${state.drivers.map(d => `<option value="${d.id}" ${editRev && editRev.driverId === d.id ? 'selected' : (extraData.driverId === d.id ? 'selected' : '')}>${d.name} (${d.phone})</option>`).join('')}
                </select>
              </div>

              <div class="form-group" id="revenue-owner-group" style="${revType === 'Direct Income' ? '' : 'display:none;'}">
                <label>Allocate Directly to Owner (Optional)</label>
                <select name="directOwnerId" class="form-control">
                  <option value="">-- Split Across Cab Owners --</option>
                  ${state.owners.map(o => `<option value="${o.id}" ${editRev && editRev.directOwnerId === o.id ? 'selected' : ''}>${o.name}</option>`).join('')}
                </select>
              </div>

              <div class="form-group">
                <label>Select Cab (Optional)</label>
                <select name="cabId" id="modal-cab-select" class="form-control">
                  <option value="">-- None / General --</option>
                  ${state.cabs.map(c => `<option value="${c.id}" ${editRev && editRev.cabId === c.id ? 'selected' : ''}>${c.plate} - ${c.model}</option>`).join('')}
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Amount Received (₹) *</label>
                <input type="number" name="amount" class="form-control" value="${editRev ? editRev.amount : ''}" placeholder="18000" required min="1">
              </div>
              <div class="form-group">
                <label>Date of Receipt *</label>
                <input type="date" name="date" class="form-control" value="${editRev ? editRev.date : todayStr}" required>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Payment Mode</label>
                <select name="mode" class="form-control">
                  <option value="UPI" ${editRev && editRev.mode === 'UPI' ? 'selected' : ''}>UPI / GPay / PhonePe</option>
                  <option value="Cash" ${editRev && editRev.mode === 'Cash' ? 'selected' : ''}>Cash</option>
                  <option value="Bank Transfer" ${editRev && editRev.mode === 'Bank Transfer' ? 'selected' : ''}>Bank Transfer / IMPS</option>
                </select>
              </div>
              <div class="form-group">
                <label>Period (Month)</label>
                <input type="text" name="period" class="form-control" value="${editRev ? editRev.period : new Date().toISOString().slice(0,7)}">
              </div>
            </div>

            <div class="form-group">
              <label>Notes / Payment Ref</label>
              <input type="text" name="notes" class="form-control" value="${editRev ? editRev.notes || '' : ''}" placeholder="Monthly rent / Insurance refund notes">
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:1rem;">
              ${editRev ? `<button type="button" class="btn btn-xs btn-danger-soft" onclick="Store.deleteRevenue('${editRev.id}'); App.closeModal();">Delete Receipt</button>` : '<div></div>'}
              <div style="display:flex; gap:0.5rem;">
                <button type="button" class="btn btn-secondary-soft" onclick="App.closeModal()">Cancel</button>
                <button type="submit" class="btn btn-success"><i class="fa-solid fa-check"></i> Save Revenue</button>
              </div>
            </div>
          </form>
        `;
        break;

      case 'log-expense':
      case 'edit-expense':
        const editExp = extraData.expenseId ? state.expenses.find(e => e.id === extraData.expenseId) : null;
        titleEl.textContent = editExp ? `Edit Expense: ${editExp.id}` : 'Log Cab Expense (EMI, Repairs, etc.)';

        html = `
          <form onsubmit="App.handleSaveExpense(event, '${editExp ? editExp.id : ''}')">
            <div class="form-row">
              <div class="form-group">
                <label>Select Cab *</label>
                <select name="cabId" class="form-control" required>
                  <option value="">-- Choose Cab --</option>
                  ${state.cabs.map(c => `<option value="${c.id}" ${editExp && editExp.cabId === c.id ? 'selected' : (extraData.cabId === c.id ? 'selected' : '')}>${c.plate} - ${c.model}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label>Expense Category *</label>
                <select name="category" class="form-control" required>
                  <option value="EMI" ${editExp && editExp.category === 'EMI' ? 'selected' : ''}>Vehicle Loan EMI</option>
                  <option value="Repairs" ${editExp && editExp.category === 'Repairs' ? 'selected' : ''}>Repairs & Parts</option>
                  <option value="Servicing" ${editExp && editExp.category === 'Servicing' ? 'selected' : ''}>Routine Servicing</option>
                  <option value="Fuel" ${editExp && editExp.category === 'Fuel' ? 'selected' : ''}>Fuel</option>
                  <option value="Insurance" ${editExp && editExp.category === 'Insurance' ? 'selected' : ''}>Insurance Renewal</option>
                  <option value="Permit" ${editExp && editExp.category === 'Permit' ? 'selected' : ''}>Permit / Tax Fee</option>
                  <option value="Cleaning" ${editExp && editExp.category === 'Cleaning' ? 'selected' : ''}>Washing & Cleaning</option>
                  <option value="Other" ${editExp && editExp.category === 'Other' ? 'selected' : ''}>Other Expense</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Amount (₹) *</label>
                <input type="number" name="amount" class="form-control" value="${editExp ? editExp.amount : ''}" placeholder="12000" required min="1">
              </div>
              <div class="form-group">
                <label>Expense Date *</label>
                <input type="date" name="date" class="form-control" value="${editExp ? editExp.date : todayStr}" required>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Paid By (Payment Source)</label>
                <select name="paidByOwnerId" class="form-control">
                  <option value="">Fleet Business Account</option>
                  ${state.owners.map(o => `<option value="${o.id}" ${editExp && editExp.paidByOwnerId === o.id ? 'selected' : ''}>Paid by ${o.name} (Out of Pocket)</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label>Vendor / Mechanic Name</label>
                <input type="text" name="vendor" class="form-control" value="${editExp ? editExp.vendor || '' : ''}" placeholder="HDFC Loan / Garage Name">
              </div>
            </div>

            <div class="form-group">
              <label>Notes</label>
              <input type="text" name="notes" class="form-control" value="${editExp ? editExp.notes || '' : ''}" placeholder="Oct loan EMI / Brake replacement">
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:1rem;">
              ${editExp ? `<button type="button" class="btn btn-xs btn-danger-soft" onclick="Store.deleteExpense('${editExp.id}'); App.closeModal();">Delete Expense</button>` : '<div></div>'}
              <div style="display:flex; gap:0.5rem;">
                <button type="button" class="btn btn-secondary-soft" onclick="App.closeModal()">Cancel</button>
                <button type="submit" class="btn btn-danger-soft" style="background:var(--accent-danger); color:#fff;"><i class="fa-solid fa-check"></i> Save Expense</button>
              </div>
            </div>
          </form>
        `;
        break;

      case 'log-payout':
      case 'edit-payout':
        const editPayout = extraData.payoutId ? state.payouts.find(p => p.id === extraData.payoutId) : null;
        titleEl.textContent = editPayout ? `Edit Owner Payout: ${editPayout.id}` : 'Log Owner Payout (Distribute Profit)';

        html = `
          <form onsubmit="App.handleSaveOwnerPayout(event, '${editPayout ? editPayout.id : ''}')">
            <div class="form-row">
              <div class="form-group">
                <label>Select Owner *</label>
                <select name="ownerId" class="form-control" required>
                  <option value="">-- Choose Owner --</option>
                  ${state.owners.map(o => `<option value="${o.id}" ${editPayout && editPayout.ownerId === o.id ? 'selected' : (extraData.ownerId === o.id ? 'selected' : '')}>${o.name}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label>Payout Amount (₹) *</label>
                <input type="number" name="amount" class="form-control" value="${editPayout ? editPayout.amount : ''}" placeholder="2000" required min="1">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Payout Date *</label>
                <input type="date" name="date" class="form-control" value="${editPayout ? editPayout.date : todayStr}" required>
              </div>
              <div class="form-group">
                <label>Payment Mode</label>
                <select name="mode" class="form-control">
                  <option value="UPI" ${editPayout && editPayout.mode === 'UPI' ? 'selected' : ''}>UPI Transfer</option>
                  <option value="Bank Transfer" ${editPayout && editPayout.mode === 'Bank Transfer' ? 'selected' : ''}>Bank Transfer / NEFT</option>
                  <option value="Cash" ${editPayout && editPayout.mode === 'Cash' ? 'selected' : ''}>Cash</option>
                  <option value="Cheque" ${editPayout && editPayout.mode === 'Cheque' ? 'selected' : ''}>Cheque</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label>Reference # / Notes</label>
              <input type="text" name="refNo" class="form-control" value="${editPayout ? editPayout.refNo || '' : ''}" placeholder="Transaction Ref / Bank Ref">
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:1rem;">
              ${editPayout ? `<button type="button" class="btn btn-xs btn-danger-soft" onclick="Store.deleteOwnerPayout('${editPayout.id}'); App.closeModal();">Delete Payout</button>` : '<div></div>'}
              <div style="display:flex; gap:0.5rem;">
                <button type="button" class="btn btn-secondary-soft" onclick="App.closeModal()">Cancel</button>
                <button type="submit" class="btn btn-success"><i class="fa-solid fa-check"></i> Save Payout</button>
              </div>
            </div>
          </form>
        `;
        break;

      case 'add-cab':
      case 'edit-cab':
        const editCab = extraData.cabId ? state.cabs.find(c => c.id === extraData.cabId) : null;
        titleEl.textContent = editCab ? `Edit Cab: ${editCab.plate}` : 'Add New Cab to Fleet';
        const currentShares = editCab ? editCab.shares || {} : {};
        const sharesInputsHtml = state.owners.map(o => `
          <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.4rem;">
            <span style="flex:1; font-size:0.85rem;">${o.name}:</span>
            <input type="number" min="0" max="100" class="form-control owner-share-input" data-owner-id="${o.id}" value="${currentShares[o.id] || 0}" style="width:90px;" placeholder="50">%
          </div>
        `).join('');

        html = `
          <form onsubmit="App.handleSaveCab(event, '${editCab ? editCab.id : ''}')">
            <div class="form-row">
              <div class="form-group">
                <label>Vehicle Plate # *</label>
                <input type="text" name="plate" class="form-control" value="${editCab ? editCab.plate : ''}" placeholder="MH-02-CB-1001" required>
              </div>
              <div class="form-group">
                <label>Vehicle Model *</label>
                <input type="text" name="model" class="form-control" value="${editCab ? editCab.model : ''}" placeholder="Swift Dzire 2023" required>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Status</label>
                <select name="status" class="form-control">
                  <option value="Active" ${editCab && editCab.status === 'Active' ? 'selected' : ''}>Active</option>
                  <option value="Maintenance" ${editCab && editCab.status === 'Maintenance' ? 'selected' : ''}>Maintenance</option>
                  <option value="Inactive" ${editCab && editCab.status === 'Inactive' ? 'selected' : ''}>Inactive</option>
                </select>
              </div>
              <div class="form-group">
                <label>Vehicle Color</label>
                <input type="text" name="color" class="form-control" value="${editCab ? editCab.color : 'White'}" placeholder="White">
              </div>
            </div>

            <div style="background:var(--bg-primary); padding:0.9rem; border-radius:var(--radius-md); border:1px solid var(--border-color); margin-bottom:1rem;">
              <label style="font-size:0.85rem; font-weight:700; color:var(--accent-primary); display:block; margin-bottom:0.5rem;">
                <i class="fa-solid fa-users"></i> Ownership Share Ratio (%)
              </label>
              ${sharesInputsHtml}
              <small style="font-size:0.75rem; color:var(--text-muted);">Total shares sum to 100%.</small>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:1rem;">
              ${editCab ? `<button type="button" class="btn btn-xs btn-danger-soft" onclick="Store.deleteCab('${editCab.id}'); App.closeModal();">Delete Cab</button>` : '<div></div>'}
              <div style="display:flex; gap:0.5rem;">
                <button type="button" class="btn btn-secondary-soft" onclick="App.closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary"><i class="fa-solid fa-check"></i> Save Cab</button>
              </div>
            </div>
          </form>
        `;
        break;

      case 'add-driver':
      case 'edit-driver':
        const editDriver = extraData.driverId ? state.drivers.find(d => d.id === extraData.driverId) : null;
        titleEl.textContent = editDriver ? `Edit Driver: ${editDriver.name}` : 'Add New Driver';
        html = `
          <form onsubmit="App.handleSaveDriver(event, '${editDriver ? editDriver.id : ''}')">
            <div class="form-row">
              <div class="form-group">
                <label>Full Name *</label>
                <input type="text" name="name" class="form-control" value="${editDriver ? editDriver.name : ''}" required placeholder="Ramesh Kumar">
              </div>
              <div class="form-group">
                <label>Phone Number *</label>
                <input type="text" name="phone" class="form-control" value="${editDriver ? editDriver.phone : ''}" required placeholder="+91 99000 11122">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Driving License #</label>
                <input type="text" name="license" class="form-control" value="${editDriver ? editDriver.license : ''}" placeholder="DL-0420210098">
              </div>
              <div class="form-group">
                <label>Status</label>
                <select name="status" class="form-control">
                  <option value="Active" ${editDriver && editDriver.status === 'Active' ? 'selected' : ''}>Active</option>
                  <option value="Inactive" ${editDriver && editDriver.status === 'Inactive' ? 'selected' : ''}>Inactive</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label>Agreed Monthly Target (₹)</label>
              <input type="number" name="agreedMonthlyRate" class="form-control" value="${editDriver ? editDriver.agreedMonthlyRate || 18000 : 18000}">
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:1rem;">
              ${editDriver ? `<button type="button" class="btn btn-xs btn-danger-soft" onclick="Store.deleteDriver('${editDriver.id}'); App.closeModal();">Delete Driver</button>` : '<div></div>'}
              <div style="display:flex; gap:0.5rem;">
                <button type="button" class="btn btn-secondary-soft" onclick="App.closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary"><i class="fa-solid fa-check"></i> Save Driver</button>
              </div>
            </div>
          </form>
        `;
        break;

      case 'add-owner':
      case 'edit-owner':
        const editOwner = extraData.ownerId ? state.owners.find(o => o.id === extraData.ownerId) : null;
        titleEl.textContent = editOwner ? `Edit Owner: ${editOwner.name}` : 'Add Business Owner';
        html = `
          <form onsubmit="App.handleSaveOwner(event, '${editOwner ? editOwner.id : ''}')">
            <div class="form-group">
              <label>Owner Full Name *</label>
              <input type="text" name="name" class="form-control" value="${editOwner ? editOwner.name : ''}" required placeholder="Rajesh Sharma">
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Phone Number</label>
                <input type="text" name="phone" class="form-control" value="${editOwner ? editOwner.phone : ''}" placeholder="+91 98765 43210">
              </div>
              <div class="form-group">
                <label>Email Address</label>
                <input type="email" name="email" class="form-control" value="${editOwner ? editOwner.email : ''}" placeholder="rajesh@fleet.com">
              </div>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:1rem;">
              ${editOwner ? `<button type="button" class="btn btn-xs btn-danger-soft" onclick="Store.deleteOwner('${editOwner.id}'); App.closeModal();">Delete Owner</button>` : '<div></div>'}
              <div style="display:flex; gap:0.5rem;">
                <button type="button" class="btn btn-secondary-soft" onclick="App.closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary"><i class="fa-solid fa-check"></i> Save Owner</button>
              </div>
            </div>
          </form>
        `;
        break;

      case 'allocate-driver':
        titleEl.textContent = 'Assign Driver to Cab (Date-wise Allocation)';
        html = `
          <form onsubmit="App.handleSaveAllocation(event)">
            <div class="form-group">
              <label>Select Cab *</label>
              <select name="cabId" class="form-control" required>
                <option value="">-- Choose Cab --</option>
                ${state.cabs.map(c => `<option value="${c.id}">${c.plate} - ${c.model}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Select Driver *</label>
              <select name="driverId" class="form-control" required>
                <option value="">-- Choose Driver --</option>
                ${state.drivers.map(d => `<option value="${d.id}">${d.name}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Allocation Start Date *</label>
              <input type="date" name="startDate" class="form-control" value="${todayStr}" required>
            </div>
            <div class="form-group">
              <label>Notes</label>
              <input type="text" name="notes" class="form-control" placeholder="Oct shift assignment">
            </div>

            <div style="display:flex; justify-content:flex-end; gap:0.5rem; margin-top:1rem;">
              <button type="button" class="btn btn-secondary-soft" onclick="App.closeModal()">Cancel</button>
              <button type="submit" class="btn btn-primary"><i class="fa-solid fa-check"></i> Assign Cab</button>
            </div>
          </form>
        `;
        break;

      case 'add-reminder':
        titleEl.textContent = 'Set New Reminder / Due Date Alert';
        html = `
          <form onsubmit="App.handleSaveReminder(event)">
            <div class="form-group">
              <label>Reminder Title *</label>
              <input type="text" name="title" class="form-control" placeholder="Cab 1 EMI Clearance" required>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Category *</label>
                <select name="category" class="form-control" required>
                  <option value="EMI Due">EMI Due</option>
                  <option value="Rent Due">Rent Due</option>
                  <option value="License Expiry">License Expiry</option>
                  <option value="Insurance Expiry">Insurance Expiry</option>
                  <option value="Service Due">Vehicle Service</option>
                  <option value="Owner Payout">Owner Payout</option>
                </select>
              </div>
              <div class="form-group">
                <label>Due Date *</label>
                <input type="date" name="dueDate" class="form-control" value="${todayStr}" required>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Priority</label>
                <select name="priority" class="form-control">
                  <option value="High">High Priority</option>
                  <option value="Medium" selected>Medium Priority</option>
                  <option value="Low">Low Priority</option>
                </select>
              </div>
              <div class="form-group">
                <label>Link to Cab</label>
                <select name="entityId" class="form-control">
                  <option value="">-- None / General --</option>
                  ${state.cabs.map(c => `<option value="${c.id}">Cab: ${c.plate}</option>`).join('')}
                </select>
              </div>
            </div>

            <div style="display:flex; justify-content:flex-end; gap:0.5rem; margin-top:1rem;">
              <button type="button" class="btn btn-secondary-soft" onclick="App.closeModal()">Cancel</button>
              <button type="submit" class="btn btn-primary"><i class="fa-solid fa-bell"></i> Save Reminder</button>
            </div>
          </form>
        `;
        break;
    }

    bodyEl.innerHTML = html;
    overlay.classList.add('active');
  }

  function toggleRevenueTypeFields(val) {
    const driverGrp = document.getElementById('revenue-driver-group');
    const ownerGrp = document.getElementById('revenue-owner-group');
    if (val === 'Direct Income') {
      if (driverGrp) driverGrp.style.display = 'none';
      if (ownerGrp) ownerGrp.style.display = 'flex';
    } else {
      if (driverGrp) driverGrp.style.display = 'flex';
      if (ownerGrp) ownerGrp.style.display = 'none';
    }
  }

  function closeModal() {
    document.getElementById('global-modal-overlay').classList.remove('active');
  }

  function autoFillCabForDriver(driverId) {
    if (!driverId) return;
    const state = Store.getState();
    const alloc = state.allocations.find(a => a.driverId === driverId && !a.endDate);
    if (alloc) {
      const select = document.getElementById('modal-cab-select');
      if (select) select.value = alloc.cabId;
    }
  }

  function handleSaveRevenue(e, existingId) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = {
      revenueType: fd.get('revenueType'),
      driverId: fd.get('revenueType') === 'Driver Rent' ? fd.get('driverId') : null,
      directOwnerId: fd.get('revenueType') === 'Direct Income' ? fd.get('directOwnerId') : null,
      cabId: fd.get('cabId') || null,
      amount: Number(fd.get('amount')),
      date: fd.get('date'),
      mode: fd.get('mode'),
      period: fd.get('period'),
      notes: fd.get('notes'),
      status: 'Paid'
    };

    if (existingId) {
      Store.updateRevenue(existingId, data);
      showToast('Revenue Receipt Updated!', 'success');
    } else {
      Store.addRevenue(data);
      showToast('Revenue Receipt Saved!', 'success');
    }
    closeModal();
  }

  function handleSaveExpense(e, existingId) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = {
      cabId: fd.get('cabId'),
      category: fd.get('category'),
      amount: Number(fd.get('amount')),
      date: fd.get('date'),
      paidByOwnerId: fd.get('paidByOwnerId') || null,
      vendor: fd.get('vendor'),
      notes: fd.get('notes')
    };

    if (existingId) {
      Store.updateExpense(existingId, data);
      showToast('Expense Receipt Updated!', 'warning');
    } else {
      Store.addExpense(data);
      showToast('Expense Saved & Owner Reimbursements Recalculated!', 'warning');
    }
    closeModal();
  }

  function handleSaveOwnerPayout(e, existingId) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = {
      ownerId: fd.get('ownerId'),
      amount: Number(fd.get('amount')),
      date: fd.get('date'),
      mode: fd.get('mode'),
      refNo: fd.get('refNo')
    };

    if (existingId) {
      Store.updateOwnerPayout(existingId, data);
      showToast('Owner Payout Updated!', 'success');
    } else {
      Store.addOwnerPayout(data);
      showToast('Owner Payout Saved & Balance Updated!', 'success');
    }
    closeModal();
  }

  function handleSaveCab(e, existingId) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const sharesMap = {};
    document.querySelectorAll('.owner-share-input').forEach(input => {
      const oId = input.getAttribute('data-owner-id');
      const val = Number(input.value || 0);
      if (val > 0) sharesMap[oId] = val;
    });

    const cabData = {
      plate: fd.get('plate'),
      model: fd.get('model'),
      status: fd.get('status'),
      color: fd.get('color'),
      shares: sharesMap
    };

    if (existingId) {
      Store.updateCab(existingId, cabData);
      showToast('Cab Details & Shares Updated!', 'success');
    } else {
      Store.addCab(cabData);
      showToast('New Cab Added to Fleet!', 'success');
    }
    closeModal();
  }

  function handleSaveDriver(e, existingId) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = {
      name: fd.get('name'),
      phone: fd.get('phone'),
      license: fd.get('license'),
      status: fd.get('status') || 'Active',
      agreedMonthlyRate: Number(fd.get('agreedMonthlyRate') || 18000)
    };

    if (existingId) {
      Store.updateDriver(existingId, data);
      showToast('Driver Details Updated!', 'success');
    } else {
      Store.addDriver(data);
      showToast('New Driver Added!', 'success');
    }
    closeModal();
  }

  function handleSaveOwner(e, existingId) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = {
      name: fd.get('name'),
      phone: fd.get('phone'),
      email: fd.get('email')
    };

    if (existingId) {
      Store.updateOwner(existingId, data);
      showToast('Owner Details Updated!', 'success');
    } else {
      Store.addOwner(data);
      showToast('New Owner Added!', 'success');
    }
    closeModal();
  }

  function handleSaveAllocation(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = {
      cabId: fd.get('cabId'),
      driverId: fd.get('driverId'),
      startDate: fd.get('startDate'),
      endDate: null,
      notes: fd.get('notes')
    };
    Store.addAllocation(data);
    closeModal();
    showToast('Driver Assigned to Cab!', 'success');
  }

  function handleSaveReminder(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = {
      title: fd.get('title'),
      category: fd.get('category'),
      dueDate: fd.get('dueDate'),
      priority: fd.get('priority'),
      entityType: fd.get('entityId') ? 'Cab' : 'General',
      entityId: fd.get('entityId') || null,
      status: 'Pending'
    };
    Store.addReminder(data);
    closeModal();
    showToast('Reminder Scheduled!', 'success');
  }

  function toggleReminderStatus(id, newStatus) {
    Store.updateReminder(id, { status: newStatus });
    showToast(`Reminder marked as ${newStatus}`, 'success');
  }

  function openEditCabModal(cabId) { openModal('edit-cab', { cabId }); }
  function openLogExpenseModal(cabId) { openModal('log-expense', { cabId }); }
  function openLogExpenseForCabModal(cabId) { openModal('log-expense', { cabId }); }
  function openEditExpenseModal(expenseId) { openModal('edit-expense', { expenseId }); }
  function openLogPayoutForOwnerModal(ownerId) { openModal('log-payout', { ownerId }); }
  function openEditOwnerPayoutModal(payoutId) { openModal('edit-payout', { payoutId }); }
  function openEditDriverModal(driverId) { openModal('edit-driver', { driverId }); }
  function openLogRevenueForDriverModal(driverId) { openModal('log-revenue', { driverId }); }
  function openEditRevenueModal(revenueId) { openModal('edit-revenue', { revenueId }); }
  function openEditOwnerModal(ownerId) { openModal('edit-owner', { ownerId }); }

  function printReceipt(revenueId) {
    const state = Store.getState();
    const rev = state.revenues.find(r => r.id === revenueId);
    if (!rev) return;
    const driver = rev.driverId ? state.drivers.find(d => d.id === rev.driverId) : null;
    const cab = rev.cabId ? state.cabs.find(c => c.id === rev.cabId) : null;
    const directOwner = rev.directOwnerId ? state.owners.find(o => o.id === rev.directOwnerId) : null;

    const receiptHtml = `
      <html>
      <head>
        <title>Payment Receipt - ${rev.id}</title>
        <style>
          body { font-family: sans-serif; padding: 20px; line-height: 1.5; color: #1e293b; }
          .receipt-box { border: 2px solid #0284c7; padding: 25px; max-width: 450px; margin: auto; border-radius: 8px; }
          .header { text-align: center; border-bottom: 1px dashed #ccc; padding-bottom: 15px; margin-bottom: 15px; }
          .header h2 { margin: 0; color: #0284c7; }
          .row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
          .amount { font-size: 22px; font-weight: bold; color: #10b981; text-align: center; margin: 15px 0; background: #f0fdf4; padding: 10px; border-radius: 6px; }
          .footer { text-align: center; font-size: 12px; color: #64748b; margin-top: 20px; border-top: 1px dashed #ccc; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="receipt-box">
          <div class="header">
            <h2>WHEEL UP FLEET MANAGER</h2>
            <p>Official Revenue Receipt (${rev.revenueType || 'Driver Rent'})</p>
          </div>
          <div class="row"><span>Receipt ID:</span> <strong>${rev.id}</strong></div>
          <div class="row"><span>Date:</span> <strong>${Utils.formatDate(rev.date)}</strong></div>
          ${driver ? `<div class="row"><span>Driver Name:</span> <strong>${driver.name}</strong></div>` : ''}
          ${directOwner ? `<div class="row"><span>Owner Allocated:</span> <strong>${directOwner.name}</strong></div>` : ''}
          ${cab ? `<div class="row"><span>Cab Vehicle #:</span> <strong>${cab.plate}</strong></div>` : ''}
          <div class="row"><span>Payment Mode:</span> <strong>${rev.mode}</strong></div>

          <div class="amount">Amount Received: ${Utils.formatINR(rev.amount)}</div>

          <div class="footer">
            <p>Thank you for your payment!</p>
            <p>Wheel Up Fleet Systems • Computer Generated Receipt</p>
          </div>
        </div>
        <script>window.print();</script>
      </body>
      </html>
    `;

    const win = window.open('', '_blank');
    win.document.write(receiptHtml);
    win.document.close();
  }

  function showToast(msg, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fa-solid fa-check-circle"></i> ${msg}`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  document.addEventListener('DOMContentLoaded', init);

  return {
    init,
    toggleMobileSidebar,
    openModal,
    closeModal,
    toggleRevenueTypeFields,
    autoFillCabForDriver,
    handleSaveRevenue,
    handleSaveExpense,
    handleSaveOwnerPayout,
    handleSaveCab,
    handleSaveDriver,
    handleSaveOwner,
    handleSaveAllocation,
    handleSaveReminder,
    toggleReminderStatus,
    openEditCabModal,
    openLogExpenseModal,
    openLogExpenseForCabModal,
    openEditExpenseModal,
    openLogPayoutForOwnerModal,
    openEditOwnerPayoutModal,
    openEditDriverModal,
    openLogRevenueForDriverModal,
    openEditRevenueModal,
    openEditOwnerModal,
    printReceipt,
    renderCurrentSheet,
    showToast
  };
})();
