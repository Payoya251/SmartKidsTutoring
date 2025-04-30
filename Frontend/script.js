document.addEventListener('DOMContentLoaded', function() {
  // Sidebar functionality
  const toggleButton = document.getElementById('toggle-btn');
  const sidebar = document.getElementById('sidebar');
  
  if (toggleButton && sidebar) {
    toggleButton.addEventListener('click', () => {
      toggleButton.classList.toggle('open');
      sidebar.classList.toggle('show');
      document.body.classList.toggle('sidebar-open');
    });

    const sidebarLinks = sidebar.querySelectorAll('a');
    sidebarLinks.forEach(link => {
      link.addEventListener('click', () => {
        toggleButton.classList.remove('open');
        sidebar.classList.remove('show');
        document.body.classList.remove('sidebar-open');
      });
    });
  }

  // Highlight active link in sidebar
  const currentPath = window.location.pathname.split("/").pop();
  document.querySelectorAll("nav.sidebar a").forEach((link) => {
    if (link.getAttribute("href") === currentPath) {
      link.classList.add("active");
    }
  });

  // Calendar functionality
  const monthYearElement = document.getElementById('month-year');
  const calendarDaysElement = document.getElementById('calendar-days');
  const prevMonthButton = document.getElementById('prev-month');
  const nextMonthButton = document.getElementById('next-month');
  
  let currentDate = new Date();
  
  // Student's scheduled sessions (date format: "MM/DD/YYYY")
  const sessions = {
    "04/28/2024": "Math: 4:00 PM",
    "05/01/2024": "Reading: 5:00 PM",
    "05/15/2024": "Math: 4:00 PM",
    "05/22/2024": "Reading: 5:00 PM"
  };
  
  // Render the calendar
  function renderCalendar() {
    // Auto-update to current month if needed
    const today = new Date();
    if (currentDate.getMonth() !== today.getMonth() || 
        currentDate.getFullYear() !== today.getFullYear()) {
      currentDate = new Date();
    }

    // Get the current month and year
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    // Set the month and year in the header
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];
    monthYearElement.textContent = `${monthNames[currentMonth]} ${currentYear}`;
    
    // Get the first day of the month and the total days in the month
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    // Get the days from the previous month to display
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();
    
    // Clear the calendar
    calendarDaysElement.innerHTML = '';
    
    // Add days from previous month
    for (let i = firstDay - 1; i >= 0; i--) {
      const dayElement = document.createElement('div');
      dayElement.classList.add('prev-month');
      dayElement.textContent = daysInPrevMonth - i;
      calendarDaysElement.appendChild(dayElement);
    }
    
    // Add days from current month
    for (let i = 1; i <= daysInMonth; i++) {
      const dayElement = document.createElement('div');
      dayElement.textContent = i;
      
      // Format date for session checking
      const formattedDate = `${currentMonth + 1}/${i}/${currentYear}`;
      
      // Highlight today's date
      if (i === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()) {
        dayElement.classList.add('today');
      }
      
      // Mark days with sessions
      if (sessions[formattedDate]) {
        dayElement.classList.add('has-session');
        dayElement.title = sessions[formattedDate];
      }
      
      calendarDaysElement.appendChild(dayElement);
    }
    
    // Calculate how many days from next month to display
    const totalCells = firstDay + daysInMonth;
    const remainingCells = totalCells > 35 ? 42 - totalCells : 35 - totalCells;
    
    // Add days from next month
    for (let i = 1; i <= remainingCells; i++) {
      const dayElement = document.createElement('div');
      dayElement.classList.add('next-month');
      dayElement.textContent = i;
      
      // Format date for session checking (next month)
      const nextMonth = currentMonth + 1 > 11 ? 0 : currentMonth + 1;
      const nextYear = currentMonth + 1 > 11 ? currentYear + 1 : currentYear;
      const formattedDate = `${nextMonth + 1}/${i}/${nextYear}`;
      
      // Mark days with sessions in next month
      if (sessions[formattedDate]) {
        dayElement.classList.add('has-session');
        dayElement.title = sessions[formattedDate];
      }
      
      calendarDaysElement.appendChild(dayElement);
    }
  }
  
  // Event listeners for month navigation
  prevMonthButton.addEventListener('click', function() {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
  });
  
  nextMonthButton.addEventListener('click', function() {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
  });
  
  // Initial render
  renderCalendar();
});
