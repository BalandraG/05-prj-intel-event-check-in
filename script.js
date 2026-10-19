// Get all DOM elements
const form = document.getElementById("checkInForm");
const nameInput = document.getElementById("attendeeName");
const teamSelect = document.getElementById("teamSelect");
const attendeeCount = document.getElementById("attendeeCount");
// The bar inside the progress container that fills up
const progressBar = document.getElementById("progressBar");
// The paragraph where the welcome message will appear
const greeting = document.getElementById("greeting");
const attendeeList = document.getElementById("attendeeList");
const attendeeListEmpty = document.getElementById("attendeeListEmpty");
const resetBtn = document.getElementById("resetBtn");

// Track attendance
let count = 0;
let attendees = [];
const maxCount = 50;
const storageKey = "intelSummitAttendance";

// Read the current counts instead of keeping a second set of counters.
function getAttendanceData() {
  return {
    count: count,
    waterCount: parseInt(document.getElementById("waterCount").textContent),
    zeroCount: parseInt(document.getElementById("zeroCount").textContent),
    powerCount: parseInt(document.getElementById("powerCount").textContent),
    attendees: attendees,
  };
}

function renderAttendees() {
  attendeeList.textContent = "";
  attendeeListEmpty.hidden = attendees.length > 0;
  const teamIcons = { water: "\u{1F30A}", zero: "\u{1F33F}", power: "\u26A1" };

  for (const attendee of attendees) {
    const item = document.createElement("li");
    item.className = "attendee-card";

    // textContent keeps names as plain text, even if they contain HTML.
    const nameLabel = document.createElement("span");
    nameLabel.className = "attendee-name";
    nameLabel.textContent = attendee.name;

    // Match the team cards, with the icon between the name and team.
    const teamIcon = document.createElement("span");
    teamIcon.className = "attendee-icon";
    teamIcon.textContent = teamIcons[attendee.team];
    teamIcon.setAttribute("aria-hidden", "true");

    const teamLabel = document.createElement("span");
    teamLabel.className = "attendee-team";
    teamLabel.textContent = teamSelect.querySelector(
      `option[value="${attendee.team}"]`,
    ).textContent;

    item.append(nameLabel, teamIcon, teamLabel);
    attendeeList.appendChild(item);
  }
}

function updateProgressBar() {
  // Math.min keeps the value at 100 or lower, so the bar never overflows.
  const percentage = Math.min(Math.round((count / maxCount) * 100), 100) + "%";
  console.log(`Progress: ${percentage}`);
  progressBar.style.width = percentage;
}

function showCelebration() {
  const { waterCount, zeroCount, powerCount } = getAttendanceData();
  let teamAnnouncement = "";

  // Check ties first so every team tied for the highest count is named.
  if (waterCount === zeroCount && zeroCount === powerCount) {
    teamAnnouncement =
      "Team Water Wise, Team Net Zero, and Team Renewables are tied for the highest turnout!";
  } else if (waterCount === zeroCount && waterCount > powerCount) {
    teamAnnouncement =
      "Team Water Wise and Team Net Zero are tied for the highest turnout!";
  } else if (waterCount === powerCount && waterCount > zeroCount) {
    teamAnnouncement =
      "Team Water Wise and Team Renewables are tied for the highest turnout!";
  } else if (zeroCount === powerCount && zeroCount > waterCount) {
    teamAnnouncement =
      "Team Net Zero and Team Renewables are tied for the highest turnout!";
  } else if (waterCount > zeroCount && waterCount > powerCount) {
    teamAnnouncement = "Team Water Wise has the highest turnout!";
  } else if (zeroCount > powerCount) {
    teamAnnouncement = "Team Net Zero has the highest turnout!";
  } else {
    teamAnnouncement = "Team Renewables has the highest turnout!";
  }

  greeting.textContent = `Congratulations! We've reached ${maxCount} attendees! ${teamAnnouncement}`;
  greeting.classList.add("success-message", "celebration-message");
  greeting.style.display = "block";
}

function saveAttendance() {
  try {
    // JSON.stringify turns the object into text that localStorage can store.
    localStorage.setItem(storageKey, JSON.stringify(getAttendanceData()));
  } catch (error) {
    console.error("Could not save attendance:", error);
    greeting.textContent +=
      " Attendance could not be saved and may be lost when you refresh.";
  }
}

function restoreAttendance() {
  let savedAttendance;

  try {
    const savedData = localStorage.getItem(storageKey);
    if (savedData === null) {
      return;
    }

    // JSON.parse turns the stored text back into an object.
    savedAttendance = JSON.parse(savedData);

    // Only accept whole, nonnegative counts whose team totals match attendance.
    if (
      savedAttendance === null ||
      typeof savedAttendance !== "object" ||
      Array.isArray(savedAttendance) ||
      !Number.isSafeInteger(savedAttendance.count) ||
      savedAttendance.count < 0 ||
      !Number.isSafeInteger(savedAttendance.waterCount) ||
      savedAttendance.waterCount < 0 ||
      !Number.isSafeInteger(savedAttendance.zeroCount) ||
      savedAttendance.zeroCount < 0 ||
      !Number.isSafeInteger(savedAttendance.powerCount) ||
      savedAttendance.powerCount < 0 ||
      savedAttendance.waterCount +
        savedAttendance.zeroCount +
        savedAttendance.powerCount !==
        savedAttendance.count
    ) {
      throw new Error("Saved attendance counts are invalid or do not match.");
    }
  } catch (error) {
    console.error("Could not restore attendance:", error);
    greeting.textContent =
      "Saved attendance could not be restored. Starting at zero; new check-ins will try to save again.";
    greeting.style.display = "block";
    return;
  }

  count = savedAttendance.count;
  attendeeCount.textContent = count;
  document.getElementById("waterCount").textContent =
    savedAttendance.waterCount;
  document.getElementById("zeroCount").textContent = savedAttendance.zeroCount;
  document.getElementById("powerCount").textContent =
    savedAttendance.powerCount;
  updateProgressBar();

  // A refresh at or above the goal should still show the celebration.
  if (count >= maxCount) {
    showCelebration();
  }

  // Older saves have counts but no names. Keep those counts and start an empty list.
  if (savedAttendance.attendees !== undefined) {
    try {
      if (!Array.isArray(savedAttendance.attendees)) {
        throw new Error("Saved attendees must be a list.");
      }

      const recordedTeamCounts = { water: 0, zero: 0, power: 0 };
      for (const attendee of savedAttendance.attendees) {
        if (
          attendee === null ||
          typeof attendee !== "object" ||
          Array.isArray(attendee) ||
          typeof attendee.name !== "string" ||
          attendee.name.trim() === "" ||
          !["water", "zero", "power"].includes(attendee.team)
        ) {
          throw new Error("A saved attendee has an invalid name or team.");
        }
        recordedTeamCounts[attendee.team]++;
      }

      // Recorded names may be fewer than the totals, but never more.
      if (
        recordedTeamCounts.water > savedAttendance.waterCount ||
        recordedTeamCounts.zero > savedAttendance.zeroCount ||
        recordedTeamCounts.power > savedAttendance.powerCount
      ) {
        throw new Error("Saved attendees exceed the team attendance counts.");
      }

      attendees = savedAttendance.attendees;
    } catch (error) {
      console.error("Could not restore the attendee list:", error);
      greeting.textContent +=
        " Saved attendee names could not be restored. Attendance counts have been kept.";
      greeting.style.display = "block";
    }
  }

  renderAttendees();
}

// Handle form submission
form.addEventListener("submit", function (e) {
  // Stop the page from reloading when the form is submitted
  e.preventDefault();

  // Get form values (trim removes extra spaces before and after the name)
  const name = nameInput.value.trim();
  const team = teamSelect.value;
  const teamName = teamSelect.selectedOptions[0].text;

  console.log(name, teamName);

  // If the name was only spaces, stop here and ask for a real name
  if (name === "") {
    nameInput.focus();
    return;
  }

  //Increment count
  count++;
  attendeeCount.textContent = count;
  console.log("Total check-ins: ", count);

  // Update progress bar
  updateProgressBar();

  // Update team counter
  const teamCounter = document.getElementById(team + "Count");
  teamCounter.textContent = parseInt(teamCounter.textContent) + 1;

  // Keep the actual check-in name and team for display and saving.
  attendees.push({ name: name, team: team });
  renderAttendees();

  // Show welcome message
  const message = `Welcome, ${name} from ${teamName}!`;
  console.log(message);

  // Put the message on the page (textContent safely shows the name as plain text)
  greeting.textContent = message;
  // Normal check-ins return to the smaller greeting style.
  greeting.classList.remove("celebration-message");
  // Add the styling for a success message
  greeting.classList.add("success-message");
  // Make the greeting visible (it is hidden by default in style.css)
  greeting.style.display = "block";

  // Keep celebrating once the attendance goal has been reached.
  if (count >= maxCount) {
    showCelebration();
  }

  saveAttendance();
  form.reset();
});

// Handle the Reset button
resetBtn.addEventListener("click", function () {
  // Ask first so attendance isn't erased by an accidental click
  if (
    !confirm(
      "Reset all attendance counts and the attendee list? This cannot be undone.",
    )
  ) {
    return;
  }

  // Set every counter and the attendee list back to empty
  count = 0;
  attendees = [];
  attendeeCount.textContent = count;
  document.getElementById("waterCount").textContent = 0;
  document.getElementById("zeroCount").textContent = 0;
  document.getElementById("powerCount").textContent = 0;
  updateProgressBar();
  renderAttendees();

  // Hide any greeting or celebration message
  greeting.textContent = "";
  greeting.classList.remove("celebration-message");
  greeting.style.display = "none";
  form.reset();

  // Remove the saved data so a refresh also starts at zero
  try {
    localStorage.removeItem(storageKey);
  } catch (error) {
    console.error("Could not clear saved attendance:", error);
  }
});

restoreAttendance();
