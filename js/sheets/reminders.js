/* ==========================================================================
   WHEEL UP DASHBOARD - SHEET 5: REMINDERS & CALENDAR VIEW RENDERER
   ========================================================================== */

const SheetReminders = (function() {

  function render(container, financialData) {
    const state = Store.getState();
    const reminders = state.reminders || [];
    const pendingCount = reminders.filter(r => r.status === 'Pending').length;

    container.innerHTML = `
      <!-- Reminders Header -->
      <div class="card" style="background: linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(245, 158, 11, 0.15)); border: 1px solid rgba(245, 158, 11, 0.3);">
        <div class="card-header">
          <div>
            <h2 class="card-title" style="font-size: 1.25rem;"><i class="fa-solid fa-calendar-check" style="color: var(--accent-warning);"></i> Reminders & Alert Calendar</h2>
            <p style="font-size: 0.82rem; color: var(--text-muted); margin-top: 0.2rem;">
              Set and track critical due dates for Cab EMIs, driver rent payments, vehicle insurance, fitness expiries, and owner payouts.
            </p>
          </div>
          <div>
            <button class="btn btn-sm btn-primary" onclick="App.openModal('add-reminder')">
              <i class="fa-solid fa-bell-plus"></i> Set New Reminder
            </button>
          </div>
        </div>

        <div style="display: flex; gap: 1rem; margin-top: 0.5rem;">
          <div style="background: rgba(0,0,0,0.2); padding: 0.75rem 1.2rem; border-radius: var(--radius-md);">
            <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">Total Active Reminders</div>
            <div style="font-size: 1.3rem; font-weight: 800; color: var(--accent-warning);">${pendingCount} Pending</div>
          </div>
        </div>
      </div>

      <!-- Reminders Table List -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i class="fa-solid fa-list-check"></i> Action Items & Due Dates</h3>
          <button class="btn btn-sm btn-primary-soft" onclick="App.openModal('add-reminder')">
            <i class="fa-solid fa-plus"></i> Add Item
          </button>
        </div>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Title / Task</th>
                <th>Category</th>
                <th>Due Date</th>
                <th>Priority</th>
                <th>Related Entity</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${renderRemindersTableRows(reminders, state)}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderRemindersTableRows(reminders, state) {
    if (!reminders.length) {
      return `<tr><td colspan="7" style="text-align:center; color: var(--text-muted); padding: 2rem;">No reminders scheduled.</td></tr>`;
    }

    return reminders.map(rem => {
      let entityName = '-';
      if (rem.entityType === 'Cab' && rem.entityId) {
        const cab = state.cabs.find(c => c.id === rem.entityId);
        entityName = cab ? `Cab: ${cab.plate}` : rem.entityId;
      } else if (rem.entityType === 'Driver' && rem.entityId) {
        const driver = state.drivers.find(d => d.id === rem.entityId);
        entityName = driver ? `Driver: ${driver.name}` : rem.entityId;
      } else if (rem.entityType === 'Owner' && rem.entityId) {
        const owner = state.owners.find(o => o.id === rem.entityId);
        entityName = owner ? `Owner: ${owner.name}` : rem.entityId;
      }

      const isCompleted = rem.status === 'Completed';

      return `
        <tr>
          <td>
            <strong style="${isCompleted ? 'text-decoration: line-through; opacity: 0.6;' : ''}">${rem.title}</strong>
          </td>
          <td><span class="badge-cat" style="background: rgba(245, 158, 11, 0.15); color: #f59e0b;">${rem.category || 'General'}</span></td>
          <td><i class="fa-solid fa-calendar-day"></i> ${Utils.formatDate(rem.dueDate)}</td>
          <td>
            <span class="badge-cat" style="background: ${rem.priority === 'High' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(56, 189, 248, 0.15)'}; color: ${rem.priority === 'High' ? '#ef4444' : '#38bdf8'};">
              ${rem.priority || 'Medium'}
            </span>
          </td>
          <td style="font-size: 0.82rem; color: var(--text-muted);">${entityName}</td>
          <td>
            <span class="status-pill status-${isCompleted ? 'completed' : 'pending'}">${rem.status || 'Pending'}</span>
          </td>
          <td>
            ${!isCompleted ? `
              <button class="btn btn-xs btn-success-soft" onclick="App.toggleReminderStatus('${rem.id}', 'Completed')" title="Mark Completed">
                <i class="fa-solid fa-check"></i> Complete
              </button>
            ` : `
              <button class="btn btn-xs btn-secondary-soft" onclick="App.toggleReminderStatus('${rem.id}', 'Pending')" title="Mark Pending">
                <i class="fa-solid fa-rotate-left"></i> Reopen
              </button>
            `}
            <button class="btn btn-xs btn-danger-soft" onclick="Store.deleteReminder('${rem.id}')" title="Delete Reminder">
              <i class="fa-solid fa-trash"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  return { render };
})();
