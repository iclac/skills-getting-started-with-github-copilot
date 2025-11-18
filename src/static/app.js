document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        const participantsHtml = details.participants && details.participants.length
          ? `<div class="participants"><strong>Participants:</strong><ul>${details.participants
              .map((p) => `<li><span class="participant-email">${p}</span><button class="remove-participant" data-activity="${name}" data-email="${p}" aria-label="Remove participant">✖</button></li>`)
              .join("")}</ul></div>`
          : `<div class="participants"><strong>Participants:</strong><p class="no-participants">No participants yet</p></div>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p class="availability"><strong>Availability:</strong> ${spotsLeft} spots left</p>
          ${participantsHtml}
        `;

        // Attach handlers for remove buttons
        const removeButtons = activityCard.querySelectorAll('.remove-participant');
        removeButtons.forEach((btn) => {
          btn.addEventListener('click', async (e) => {
            const email = btn.dataset.email;
            const activityName = btn.dataset.activity;

            try {
              const resp = await fetch(`/activities/${encodeURIComponent(activityName)}/participants?email=${encodeURIComponent(email)}`, { method: 'DELETE' });

              if (resp.ok) {
                // Update local details and UI
                details.participants = (details.participants || []).filter((p) => p !== email);

                // Remove list item
                const li = btn.closest('li');
                if (li) li.remove();

                // If none left, replace list with fallback text
                const participantsContainer = activityCard.querySelector('.participants');
                const ul = participantsContainer && participantsContainer.querySelector('ul');
                if (!ul || (ul && ul.children.length === 0)) {
                  participantsContainer.innerHTML = `<strong>Participants:</strong><p class="no-participants">No participants yet</p>`;
                }

                // Update availability
                const availabilityP = activityCard.querySelector('.availability');
                if (availabilityP) {
                  const newSpotsLeft = details.max_participants - (details.participants ? details.participants.length : 0);
                  availabilityP.innerHTML = `<strong>Availability:</strong> ${newSpotsLeft} spots left`;
                }
              } else {
                const result = await resp.json().catch(() => ({}));
                alert(result.detail || 'Failed to remove participant');
              }
            } catch (err) {
              console.error(err);
              alert('Error removing participant');
            }
          });
        });

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Update UI for the activity card
        const selectedActivity = activity;
        // Find the card for the selected activity
        const activityCards = document.querySelectorAll('.activity-card');
        activityCards.forEach(card => {
          const title = card.querySelector('h4');
          if (title && title.textContent === selectedActivity) {
            // Find participants container
            const participantsContainer = card.querySelector('.participants');
            if (participantsContainer) {
              // If fallback text, replace with list
              let ul = participantsContainer.querySelector('ul');
              if (!ul) {
                participantsContainer.innerHTML = `<strong>Participants:</strong><ul></ul>`;
                ul = participantsContainer.querySelector('ul');
              }
              // Add new participant
              const li = document.createElement('li');
              li.innerHTML = `<span class="participant-email">${email}</span><button class="remove-participant" data-activity="${selectedActivity}" data-email="${email}" aria-label="Remove participant">✖</button>`;
              ul.appendChild(li);

              // Attach remove handler
              const btn = li.querySelector('.remove-participant');
              btn.addEventListener('click', async (e) => {
                try {
                  const resp = await fetch(`/activities/${encodeURIComponent(selectedActivity)}/participants?email=${encodeURIComponent(email)}`, { method: 'DELETE' });
                  if (resp.ok) {
                    li.remove();
                    if (ul.children.length === 0) {
                      participantsContainer.innerHTML = `<strong>Participants:</strong><p class="no-participants">No participants yet</p>`;
                    }
                    // Update availability
                    const availabilityP = card.querySelector('.availability');
                    if (availabilityP) {
                      // We don't have the new count, so just decrement
                      const match = availabilityP.textContent.match(/(\d+)/);
                      if (match) {
                        const newSpots = parseInt(match[1], 10) + 1;
                        availabilityP.innerHTML = `<strong>Availability:</strong> ${newSpots} spots left`;
                      }
                    }
                  } else {
                    alert('Failed to remove participant');
                  }
                } catch (err) {
                  alert('Error removing participant');
                }
              });
            }
            // Update availability
            const availabilityP = card.querySelector('.availability');
            if (availabilityP) {
              const match = availabilityP.textContent.match(/(\d+)/);
              if (match) {
                const newSpots = parseInt(match[1], 10) - 1;
                availabilityP.innerHTML = `<strong>Availability:</strong> ${newSpots} spots left`;
              }
            }
          }
        });
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
