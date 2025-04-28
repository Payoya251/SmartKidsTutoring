<script>
  document.addEventListener('DOMContentLoaded', function () {
    // Sidebar toggle logic
    const toggleButton = document.getElementById('toggle-btn');
    const sidebar = document.getElementById('sidebar');

    if (toggleButton && sidebar) {
      toggleButton.addEventListener('click', () => {
        toggleButton.classList.toggle('open');
        sidebar.classList.toggle('show');
      });

      const sidebarLinks = sidebar.querySelectorAll('a');
      sidebarLinks.forEach(link => {
        link.addEventListener('click', () => {
          toggleButton.classList.remove('open');
          sidebar.classList.remove('show');
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

    // Smooth scroll for anchor links
    const links = document.querySelectorAll("a[href^='#']");
    links.forEach((link) => {
      link.addEventListener("click", function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute("href"));
        if (target) {
          target.scrollIntoView({ behavior: "smooth" });
        }
      });
    });

    // Dark mode support
    const prefersDark = localStorage.getItem("darkMode") === "enabled";
    if (prefersDark) {
      document.body.classList.add("dark-mode");
    }

    const toggleDarkMode = document.getElementById("darkModeToggle");
    if (toggleDarkMode) {
      toggleDarkMode.addEventListener("click", function () {
        document.body.classList.toggle("dark-mode");
        localStorage.setItem("darkMode", document.body.classList.contains("dark-mode") ? "enabled" : "disabled");
      });
    }

    // Handle other form submissions (not signup)
    const forms = document.querySelectorAll("form");
    forms.forEach((form) => {
      if (form.id !== "signupForm") { // Exclude signupForm
        form.addEventListener("submit", function (e) {
          e.preventDefault();
          alert("Form submitted!");
          form.reset();
          form.classList.add("submitted");
          setTimeout(() => form.classList.remove("submitted"), 1000);
        });
      }
    });

    // Real signup form handler
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
      signupForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Stop traditional submit

        const formData = new FormData(signupForm);
        const userData = {
          name: formData.get('name'),
          email: formData.get('email'),
          username: formData.get('username'),
          password: formData.get('password')
        };

        try {
          const response = await fetch('/api/signup', { // Use relative URL unless you are deployed
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
          });

          const result = await response.json();

          if (response.ok) {
            alert('Account created successfully!');
            window.location.href = 'Login.html'; // Redirect after signup
          } else {
            alert(result.message || 'Error creating account');
          }
        } catch (error) {
          console.error('Error:', error);
          alert('Failed to connect to server');
        }
      });
    }
  });
</script>
