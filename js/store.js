/* ==========================================================================
   WHEEL UP DASHBOARD - CENTRAL REACTIVE STORE & LOCAL STORAGE PERSISTENCE
   ========================================================================== */

const Store = (function() {
  const STORAGE_KEY = 'wheelup_fleet_db_v1';
  let state = null;
  let listeners = [];

  const seedData = {
    owners: [
      { id: 'owner-1', name: 'Rajesh Sharma', phone: '+91 98765 43210', email: 'rajesh@fleet.com', notes: 'Lead Partner' },
      { id: 'owner-2', name: 'Amit Verma', phone: '+91 98123 45678', email: 'amit@fleet.com', notes: 'Co-Owner' }
    ],
    cabs: [
      {
        id: 'cab-1',
        plate: 'MH-02-CB-1001',
        model: 'Swift Dzire (2023)',
        color: 'White',
        status: 'Active',
        shares: { 'owner-1': 50, 'owner-2': 50 },
        fitnessExpiry: '2027-05-15',
        insuranceExpiry: '2026-11-20'
      },
      {
        id: 'cab-2',
        plate: 'MH-01-AX-4599',
        model: 'Ertiga CNG (2024)',
        color: 'Silver',
        status: 'Active',
        shares: { 'owner-1': 100 },
        fitnessExpiry: '2028-01-10',
        insuranceExpiry: '2026-12-05'
      },
      {
        id: 'cab-3',
        plate: 'MH-04-DZ-8822',
        model: 'WagonR (2022)',
        color: 'Grey',
        status: 'Inactive',
        shares: { 'owner-2': 100 },
        fitnessExpiry: '2026-10-30',
        insuranceExpiry: '2026-10-18'
      }
    ],
    drivers: [
      { id: 'driver-1', name: 'Ramesh Kumar', phone: '+91 99000 11122', license: 'DL-0420210098', status: 'Active', agreedMonthlyRate: 18000 },
      { id: 'driver-2', name: 'Suresh Patil', phone: '+91 99000 33344', license: 'DL-0120198877', status: 'Active', agreedMonthlyRate: 22000 },
      { id: 'driver-3', name: 'Dinesh Yadav', phone: '+91 99000 55566', license: 'DL-0220205544', status: 'Inactive', agreedMonthlyRate: 16000 }
    ],
    allocations: [
      { id: 'alloc-1', cabId: 'cab-1', driverId: 'driver-1', startDate: '2026-10-01', endDate: null, notes: 'Oct Allocation' },
      { id: 'alloc-2', cabId: 'cab-2', driverId: 'driver-2', startDate: '2026-10-01', endDate: null, notes: 'Oct Allocation' }
    ],
    revenues: [
      { id: 'rev-1', cabId: 'cab-1', driverId: 'driver-1', revenueType: 'Driver Rent', amount: 18000, date: '2026-10-04', period: '2026-10', mode: 'UPI', status: 'Paid', notes: 'Monthly rent payment received' },
      { id: 'rev-2', cabId: 'cab-2', driverId: 'driver-2', revenueType: 'Driver Rent', amount: 22000, date: '2026-10-03', period: '2026-10', mode: 'Bank Transfer', status: 'Paid', notes: 'Monthly rent payment received' },
      { id: 'rev-3', cabId: 'cab-1', driverId: null, revenueType: 'Direct Income', directOwnerId: 'owner-1', amount: 3000, date: '2026-10-04', period: '2026-10', mode: 'Bank Transfer', status: 'Paid', notes: 'Insurance Claim Refund' }
    ],
    expenses: [
      { id: 'exp-1', cabId: 'cab-1', category: 'EMI', amount: 12000, date: '2026-10-01', vendor: 'HDFC Auto Loan', paidByOwnerId: null, notes: 'Monthly Vehicle Loan EMI' },
      { id: 'exp-2', cabId: 'cab-1', category: 'Repairs', amount: 2000, date: '2026-10-03', vendor: 'Surya Garage', paidByOwnerId: 'owner-1', notes: 'Brake pads - Paid by Rajesh out of pocket' },
      { id: 'exp-3', cabId: 'cab-2', category: 'EMI', amount: 14000, date: '2026-10-01', vendor: 'ICICI Auto Loan', paidByOwnerId: null, notes: 'Monthly EMI' },
      { id: 'exp-4', cabId: 'cab-2', category: 'Servicing', amount: 1500, date: '2026-10-04', vendor: 'Maruti Service', paidByOwnerId: null, notes: 'Routine checkup' }
    ],
    payouts: [
      { id: 'payout-1', ownerId: 'owner-1', amount: 1500, date: '2026-10-04', mode: 'UPI', refNo: 'UPI/998811', notes: 'Advance profit share transfer' }
    ],
    reminders: [
      { id: 'rem-1', title: 'Cab 1 Loan EMI Clearance', category: 'EMI Due', entityType: 'Cab', entityId: 'cab-1', dueDate: '2026-10-10', status: 'Pending', priority: 'High' },
      { id: 'rem-2', title: 'Driver Ramesh License Renewal Check', category: 'License Expiry', entityType: 'Driver', entityId: 'driver-1', dueDate: '2026-10-15', status: 'Pending', priority: 'Medium' }
    ]
  };

  function init() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        state = JSON.parse(raw);
      } catch (e) {
        state = JSON.parse(JSON.stringify(seedData));
        save();
      }
    } else {
      state = JSON.parse(JSON.stringify(seedData));
      save();
    }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    notify();
  }

  function notify() {
    listeners.forEach(fn => fn(state));
  }

  function subscribe(listenerFn) {
    listeners.push(listenerFn);
  }

  function getState() {
    if (!state) init();
    return state;
  }

  // --- CRUD Functions ---
  function addCab(cab) {
    cab.id = 'cab-' + Date.now();
    if (!cab.shares) cab.shares = {};
    state.cabs.unshift(cab);
    save();
    return cab;
  }

  function updateCab(id, updatedData) {
    const idx = state.cabs.findIndex(c => c.id === id);
    if (idx !== -1) {
      state.cabs[idx] = { ...state.cabs[idx], ...updatedData };
      save();
    }
  }

  function deleteCab(id) {
    state.cabs = state.cabs.filter(c => c.id !== id);
    save();
  }

  function addDriver(driver) {
    driver.id = 'driver-' + Date.now();
    state.drivers.unshift(driver);
    save();
    return driver;
  }

  function updateDriver(id, updatedData) {
    const idx = state.drivers.findIndex(d => d.id === id);
    if (idx !== -1) {
      state.drivers[idx] = { ...state.drivers[idx], ...updatedData };
      save();
    }
  }

  function deleteDriver(id) {
    state.drivers = state.drivers.filter(d => d.id !== id);
    save();
  }

  function addOwner(owner) {
    owner.id = 'owner-' + Date.now();
    state.owners.unshift(owner);
    save();
    return owner;
  }

  function updateOwner(id, updatedData) {
    const idx = state.owners.findIndex(o => o.id === id);
    if (idx !== -1) {
      state.owners[idx] = { ...state.owners[idx], ...updatedData };
      save();
    }
  }

  function deleteOwner(id) {
    state.owners = state.owners.filter(o => o.id !== id);
    state.cabs.forEach(cab => {
      if (cab.shares && cab.shares[id]) delete cab.shares[id];
    });
    save();
  }

  function addRevenue(rev) {
    rev.id = 'rev-' + Date.now();
    state.revenues.unshift(rev);
    save();
    return rev;
  }

  function updateRevenue(id, updatedData) {
    const idx = state.revenues.findIndex(r => r.id === id);
    if (idx !== -1) {
      state.revenues[idx] = { ...state.revenues[idx], ...updatedData };
      save();
    }
  }

  function deleteRevenue(id) {
    state.revenues = state.revenues.filter(r => r.id !== id);
    save();
  }

  function addExpense(exp) {
    exp.id = 'exp-' + Date.now();
    state.expenses.unshift(exp);
    save();
    return exp;
  }

  function updateExpense(id, updatedData) {
    const idx = state.expenses.findIndex(e => e.id === id);
    if (idx !== -1) {
      state.expenses[idx] = { ...state.expenses[idx], ...updatedData };
      save();
    }
  }

  function deleteExpense(id) {
    state.expenses = state.expenses.filter(e => e.id !== id);
    save();
  }

  function addOwnerPayout(payout) {
    payout.id = 'payout-' + Date.now();
    state.payouts.unshift(payout);
    save();
    return payout;
  }

  function updateOwnerPayout(id, updatedData) {
    const idx = state.payouts.findIndex(p => p.id === id);
    if (idx !== -1) {
      state.payouts[idx] = { ...state.payouts[idx], ...updatedData };
      save();
    }
  }

  function deleteOwnerPayout(id) {
    state.payouts = state.payouts.filter(p => p.id !== id);
    save();
  }

  function addAllocation(alloc) {
    alloc.id = 'alloc-' + Date.now();
    state.allocations.forEach(a => {
      if (a.cabId === alloc.cabId && !a.endDate) a.endDate = alloc.startDate;
    });
    state.allocations.unshift(alloc);
    save();
    return alloc;
  }

  function addReminder(rem) {
    rem.id = 'rem-' + Date.now();
    if (!rem.status) rem.status = 'Pending';
    state.reminders.unshift(rem);
    save();
    return rem;
  }

  function updateReminder(id, updatedData) {
    const idx = state.reminders.findIndex(r => r.id === id);
    if (idx !== -1) {
      state.reminders[idx] = { ...state.reminders[idx], ...updatedData };
      save();
    }
  }

  function deleteReminder(id) {
    state.reminders = state.reminders.filter(r => r.id !== id);
    save();
  }

  function exportData() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `wheelup_fleet_backup_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const importedState = JSON.parse(e.target.result);
        if (importedState.cabs && importedState.drivers && importedState.owners) {
          state = importedState;
          save();
          alert('Fleet Data Restored Successfully!');
        } else {
          alert('Invalid backup file format.');
        }
      } catch (err) {
        alert('Error parsing JSON backup file.');
      }
    };
    reader.readAsText(file);
  }

  function resetToDemo() {
    if (confirm('Reset to demo sample data?')) {
      state = JSON.parse(JSON.stringify(seedData));
      save();
    }
  }

  init();

  return {
    getState,
    subscribe,
    addCab,
    updateCab,
    deleteCab,
    addDriver,
    updateDriver,
    deleteDriver,
    addOwner,
    updateOwner,
    deleteOwner,
    addRevenue,
    updateRevenue,
    deleteRevenue,
    addExpense,
    updateExpense,
    deleteExpense,
    addOwnerPayout,
    updateOwnerPayout,
    deleteOwnerPayout,
    addAllocation,
    addReminder,
    updateReminder,
    deleteReminder,
    exportData,
    importData,
    resetToDemo
  };
})();
