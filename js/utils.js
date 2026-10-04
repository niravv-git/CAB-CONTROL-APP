/* ==========================================================================
   WHEEL UP DASHBOARD - UTILITIES & CALCULATION ENGINE
   ========================================================================== */

const Utils = (function() {

  function formatINR(num) {
    if (num === null || num === undefined || isNaN(num)) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(num);
  }

  function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function isDateInRange(dateStr, startDate, endDate) {
    if (!dateStr) return false;
    if (!startDate && !endDate) return true;
    const d = new Date(dateStr);
    d.setHours(0,0,0,0);

    if (startDate) {
      const s = new Date(startDate);
      s.setHours(0,0,0,0);
      if (d < s) return false;
    }
    if (endDate) {
      const e = new Date(endDate);
      e.setHours(23,59,59,999);
      if (d > e) return false;
    }
    return true;
  }

  function getDateRangeForPreset(preset, customStart, customEnd) {
    const today = new Date();
    let s = new Date();
    let e = new Date();

    switch (preset) {
      case 'today':
        return {
          startDate: today.toISOString().slice(0, 10),
          endDate: today.toISOString().slice(0, 10),
          label: `Today (${formatDate(today.toISOString())})`
        };

      case 'this-week': {
        const dayOfWeek = today.getDay();
        const distanceToMon = (dayOfWeek + 6) % 7;
        s.setDate(today.getDate() - distanceToMon);
        e.setDate(s.getDate() + 6);
        return {
          startDate: s.toISOString().slice(0, 10),
          endDate: e.toISOString().slice(0, 10),
          label: `${formatDate(s.toISOString())} - ${formatDate(e.toISOString())}`
        };
      }

      case 'this-month':
        s = new Date(today.getFullYear(), today.getMonth(), 1);
        e = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return {
          startDate: s.toISOString().slice(0, 10),
          endDate: e.toISOString().slice(0, 10),
          label: `${s.toLocaleString('default', { month: 'short' })} ${s.getFullYear()}`
        };

      case 'last-month':
        s = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        e = new Date(today.getFullYear(), today.getMonth(), 0);
        return {
          startDate: s.toISOString().slice(0, 10),
          endDate: e.toISOString().slice(0, 10),
          label: `${s.toLocaleString('default', { month: 'short' })} ${s.getFullYear()}`
        };

      case 'this-quarter': {
        const qMonth = Math.floor(today.getMonth() / 3) * 3;
        s = new Date(today.getFullYear(), qMonth, 1);
        e = new Date(today.getFullYear(), qMonth + 3, 0);
        return {
          startDate: s.toISOString().slice(0, 10),
          endDate: e.toISOString().slice(0, 10),
          label: `Q${Math.floor(today.getMonth() / 3) + 1} ${today.getFullYear()}`
        };
      }

      case 'this-year':
        s = new Date(today.getFullYear(), 0, 1);
        e = new Date(today.getFullYear(), 11, 31);
        return {
          startDate: s.toISOString().slice(0, 10),
          endDate: e.toISOString().slice(0, 10),
          label: `Year ${today.getFullYear()}`
        };

      case 'custom':
        return {
          startDate: customStart || null,
          endDate: customEnd || null,
          label: customStart && customEnd ? `${formatDate(customStart)} - ${formatDate(customEnd)}` : 'Custom Range'
        };

      case 'all-time':
      default:
        return {
          startDate: null,
          endDate: null,
          label: 'All Time Records'
        };
    }
  }

  // Master Interlinking Calculation Engine
  function computeInterlinkedFinancials(startDate, endDate) {
    const state = Store.getState();
    const { cabs, drivers, owners, revenues, expenses, payouts } = state;

    // Filtered collections by date range
    const filteredRevenues = revenues.filter(r => isDateInRange(r.date, startDate, endDate));
    const filteredExpenses = expenses.filter(e => isDateInRange(e.date, startDate, endDate));
    const filteredPayouts = payouts.filter(p => isDateInRange(p.date, startDate, endDate));

    // Cab Sorting: Active first, then Maintenance, then Inactive
    const sortedCabs = [...cabs].sort((a, b) => {
      const order = { 'Active': 1, 'Maintenance': 2, 'Inactive': 3 };
      return (order[a.status] || 9) - (order[b.status] || 9);
    });

    // Driver Sorting: Active first, then Inactive
    const sortedDrivers = [...drivers].sort((a, b) => {
      const order = { 'Active': 1, 'Inactive': 2 };
      return (order[a.status] || 9) - (order[b.status] || 9);
    });

    // Per Cab Financial Map
    const cabStatsMap = {};
    sortedCabs.forEach(cab => {
      cabStatsMap[cab.id] = {
        cab,
        revenue: 0,
        expensesTotal: 0,
        emiExpenses: 0,
        repairExpenses: 0,
        otherExpenses: 0,
        netProfit: 0,
        assignedDriverId: null,
        ownerProfitSplits: {}
      };
    });

    // Aggregate Cab Revenues (Driver Rent + Cab-linked Direct Income)
    filteredRevenues.forEach(rev => {
      if (rev.cabId && cabStatsMap[rev.cabId]) {
        cabStatsMap[rev.cabId].revenue += Number(rev.amount || 0);
      }
    });

    // Aggregate Cab Expenses
    filteredExpenses.forEach(exp => {
      if (exp.cabId && cabStatsMap[exp.cabId]) {
        const amt = Number(exp.amount || 0);
        cabStatsMap[exp.cabId].expensesTotal += amt;
        const cat = (exp.category || '').toLowerCase();
        if (cat === 'emi') cabStatsMap[exp.cabId].emiExpenses += amt;
        else if (cat.includes('repair')) cabStatsMap[exp.cabId].repairExpenses += amt;
        else cabStatsMap[exp.cabId].otherExpenses += amt;
      }
    });

    // Compute Net Profit per Cab & Owner Share Splits
    let fleetTotalRevenue = 0;
    let fleetTotalExpenses = 0;
    let fleetTotalEMI = 0;
    let fleetTotalRepairs = 0;
    let fleetTotalNetProfit = 0;

    Object.values(cabStatsMap).forEach(cStat => {
      cStat.netProfit = cStat.revenue - cStat.expensesTotal;

      fleetTotalRevenue += cStat.revenue;
      fleetTotalExpenses += cStat.expensesTotal;
      fleetTotalEMI += cStat.emiExpenses;
      fleetTotalRepairs += cStat.repairExpenses;
      fleetTotalNetProfit += cStat.netProfit;

      const shares = cStat.cab.shares || {};
      Object.keys(shares).forEach(ownerId => {
        const percent = shares[ownerId] || 0;
        const ownerShareAmt = (cStat.netProfit * percent) / 100;
        cStat.ownerProfitSplits[ownerId] = ownerShareAmt;
      });
    });

    // Per Owner Ledger Map
    const ownerStatsMap = {};
    owners.forEach(owner => {
      ownerStatsMap[owner.id] = {
        owner,
        earnedProfitFromCabs: 0,
        directIncome: 0,
        totalEarned: 0,
        outOfPocketExpenses: 0,
        payoutsPaid: 0,
        payableBalance: 0,
        cabBreakdown: []
      };
    });

    // Populate Owner Profit Shares from Cabs
    Object.values(cabStatsMap).forEach(cStat => {
      const shares = cStat.cab.shares || {};
      Object.keys(shares).forEach(ownerId => {
        if (ownerStatsMap[ownerId]) {
          const pct = shares[ownerId];
          const shareProfit = (cStat.netProfit * pct) / 100;
          ownerStatsMap[ownerId].earnedProfitFromCabs += shareProfit;

          ownerStatsMap[ownerId].cabBreakdown.push({
            cabId: cStat.cab.id,
            plate: cStat.cab.plate,
            model: cStat.cab.model,
            sharePct: pct,
            cabRevenue: cStat.revenue,
            cabExpenses: cStat.expensesTotal,
            cabNetProfit: cStat.netProfit,
            ownerEarnedShare: shareProfit
          });
        }
      });
    });

    // Add Direct Income for specific Owners
    filteredRevenues.forEach(rev => {
      if (rev.revenueType === 'Direct Income' && rev.directOwnerId && ownerStatsMap[rev.directOwnerId]) {
        ownerStatsMap[rev.directOwnerId].directIncome += Number(rev.amount || 0);
      }
    });

    // Add Owner Out-Of-Pocket Expenses
    filteredExpenses.forEach(exp => {
      if (exp.paidByOwnerId && ownerStatsMap[exp.paidByOwnerId]) {
        ownerStatsMap[exp.paidByOwnerId].outOfPocketExpenses += Number(exp.amount || 0);
      }
    });

    // Aggregate Payouts Paid to Owners
    let totalPaidToOwners = 0;
    filteredPayouts.forEach(pay => {
      if (ownerStatsMap[pay.ownerId]) {
        const amt = Number(pay.amount || 0);
        ownerStatsMap[pay.ownerId].payoutsPaid += amt;
        totalPaidToOwners += amt;
      }
    });

    // Final Owner Payable Balances Calculation
    let totalPayableToOwners = 0;
    Object.values(ownerStatsMap).forEach(oStat => {
      oStat.totalEarned = oStat.earnedProfitFromCabs + oStat.directIncome;
      // Formula: Payable Balance = Total Earned + Out of Pocket Reimbursements - Payouts Paid
      oStat.payableBalance = (oStat.totalEarned + oStat.outOfPocketExpenses) - oStat.payoutsPaid;
      totalPayableToOwners += oStat.payableBalance;
    });

    // Driver Map
    const driverStatsMap = {};
    sortedDrivers.forEach(drv => {
      driverStatsMap[drv.id] = {
        driver: drv,
        totalPaid: 0,
        revenueEntriesCount: 0,
        assignedCab: null
      };
    });

    filteredRevenues.forEach(rev => {
      if (rev.driverId && driverStatsMap[rev.driverId]) {
        driverStatsMap[rev.driverId].totalPaid += Number(rev.amount || 0);
        driverStatsMap[rev.driverId].revenueEntriesCount += 1;
      }
    });

    const activeAllocations = state.allocations.filter(a => !a.endDate);
    activeAllocations.forEach(alloc => {
      if (driverStatsMap[alloc.driverId]) {
        const cab = cabs.find(c => c.id === alloc.cabId);
        driverStatsMap[alloc.driverId].assignedCab = cab;
      }
      if (cabStatsMap[alloc.cabId]) {
        cabStatsMap[alloc.cabId].assignedDriverId = alloc.driverId;
      }
    });

    return {
      filteredRevenues,
      filteredExpenses,
      filteredPayouts,
      sortedCabs,
      sortedDrivers,
      cabStatsMap,
      ownerStatsMap,
      driverStatsMap,
      summary: {
        fleetTotalRevenue,
        fleetTotalExpenses,
        fleetTotalEMI,
        fleetTotalRepairs,
        fleetTotalNetProfit,
        totalPaidToOwners,
        totalPayableToOwners,
        activeAllocationsCount: activeAllocations.length,
        totalCabs: cabs.length,
        totalDrivers: drivers.length,
        totalOwners: owners.length
      }
    };
  }

  return {
    formatINR,
    formatDate,
    isDateInRange,
    getDateRangeForPreset,
    computeInterlinkedFinancials
  };
})();
