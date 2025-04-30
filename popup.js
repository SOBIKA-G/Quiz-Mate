
document.getElementById("extract-btn").addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length === 0) return; // Ensure tab exists

    chrome.scripting.executeScript(
      {
        target: { tabId: tabs[0].id },
        files: ["content.js"],
      },
      () => {
        if (chrome.runtime.lastError) {
          console.error("Error injecting content script:", chrome.runtime.lastError.message);
          return;
        }

        chrome.tabs.sendMessage(tabs[0].id, { action: "extractText" }, (response) => {
          if (chrome.runtime.lastError) {
            console.error("Error sending message:", chrome.runtime.lastError.message);
            return;
          }
          console.log("Content extracted successfully");
        });
      }
    );
  });
});

document.getElementById("generate-quiz").addEventListener("click", async () => {
  chrome.storage.local.get("extractedText", async (data) => {
      if (!data.extractedText) {
          document.getElementById("quiz").innerText = "No content available to generate quiz.";
          return;
      }

      const apiKey = "AIzaSyAMoF2HFB_y5GJ8eyjktix28wQ0oqbjk5A";
      const promptText = `Generate a multiple-choice quiz with 10 questions from the following content. For each question, provide a JSON array with fields: question, options (an array of 4 options), and answers (an array of correct options). The response should be a valid JSON array. If an option contains an HTML tag, encode it properly as a string by escaping the angle brackets (e.g., represent <a> as "&lt;a&gt;") to prevent it from being interpreted as an actual HTML element. Additionally, do not generate questions related to links or types of links (such as hyperlinks, anchor tags, or URL-related topics); instead, replace them with new questions from the content.Ensure that the quiz questions are generated based on the key topics of the webpage, identifying the main subjects and concepts covered in the extracted content to make the quiz more relevant and informative. Here is an example of the expected format:

[
{
  "question": "What is the capital of France?",
  "options": ["Paris", "London", "Berlin", "Madrid"],
  "answers": ["Paris"]
},
{
  "question": "Which planet is known as the Red Planet?",
  "options": ["Earth", "Mars", "Jupiter", "Saturn"],
  "answers": ["Mars"]
}
]

Now generate a quiz from the following content:\n${data.extractedText}`;

      const requestBody = {
          contents: [{
              parts: [{ text: promptText }]
          }],
          generationConfig: {
              maxOutputTokens: 1000 // Increase tokens to accommodate 10 questions
          }
      };

      try {
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(requestBody)
          });

          const result = await response.json();
          if (result.candidates && result.candidates.length > 0) {
              const quizText = result.candidates[0].content.parts[0].text;

              // Preprocess the response to remove Markdown code blocks
              const cleanedQuizText = quizText.replace(/```json|```/g, "").trim();

              try {
                  const quizData = JSON.parse(cleanedQuizText);
                  createQuizPopup(quizData);
              } catch (error) {
                  console.error("Error parsing quiz data:", error);
                  document.getElementById("quiz").innerText = "Failed to parse quiz data. Response format is invalid.";
              }
          } else {
              document.getElementById("quiz").innerText = "No quiz generated.";
          }
      } catch (error) {
          console.error("Error calling Gemini API:", error);
          document.getElementById("quiz").innerText = "Failed to generate quiz.";
      }
  });
});

function createQuizPopup(quizData) {
// Create the overlay container
const overlay = document.createElement('div');
overlay.id = 'quiz-popup-overlay';
overlay.style.position = 'fixed';
overlay.style.top = '0';
overlay.style.left = '0';
overlay.style.width = '100%';
overlay.style.height = '100%';
overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)'; // Semi-transparent black background
overlay.style.backdropFilter = 'blur(5px)'; // Blur effect
overlay.style.zIndex = '1000';
overlay.style.display = 'flex';
overlay.style.justifyContent = 'center';
overlay.style.alignItems = 'center';

// Create the popup box
const popupBox = document.createElement('div');
popupBox.style.backgroundColor = '#BB9AB1'; // AA60C8 Dark blue-gray background
popupBox.style.color = 'black'; // Light gray text color
popupBox.style.padding = '30px';
popupBox.style.borderRadius = '10px';
popupBox.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.3)';
popupBox.style.maxWidth = '100%'; // 50-60% of the screen width
popupBox.style.width = '100%';
popupBox.style.maxHeight = '100%'; // 70-80% of the screen height
popupBox.style.overflowY = 'auto'; // Enable vertical scrolling
popupBox.style.fontFamily = 'Poppins, sans-serif';

// Add quiz title
const quizTitle = document.createElement('h1');
quizTitle.textContent = 'Quiz';
quizTitle.style.color = '#4F0341';
quizTitle.style.textAlign = 'center';
quizTitle.style.marginTop = '0';
popupBox.appendChild(quizTitle);

// Add quiz questions
quizData.forEach((question, index) => {
  console.log(`Question ${index + 1}: ${question.question}`);
  console.log("Options:", question.options);
  console.log("Correct Answer(s):", question.answers);

  const questionDiv = document.createElement('div');
  questionDiv.innerHTML = `
    <p><strong style="color:#4F0341; font-size: 16px;"><br>Question ${index + 1}: </strong> <br> ${question.question} <br> </p>`;
  // Add options

  question.options.forEach((option, optIndex) => {
    const optionLabel = document.createElement('label');
    optionLabel.innerHTML = `
      <input type="radio" name="question${index}" value="${option}">
      ${option}
    `;
    questionDiv.appendChild(optionLabel);
    questionDiv.appendChild(document.createElement('br'));
  });

  popupBox.appendChild(questionDiv);
});

// Add submit button
const submitButton = document.createElement('button');
submitButton.textContent = 'Submit';
submitButton.style.marginTop = '20px';
submitButton.style.marginBottom = '10px';
submitButton.style.padding = '10px 20px';
submitButton.style.backgroundColor = '#41886c'; // Green color
submitButton.style.color = 'white';
submitButton.style.border = 'none';
submitButton.style.borderRadius = '5px';
submitButton.style.cursor = 'pointer';
submitButton.addEventListener('click', () => evaluateQuiz(quizData, overlay));
popupBox.appendChild(submitButton);

// Add close button
const closeButton = document.createElement('button');
closeButton.textContent = 'Close';
closeButton.style.marginLeft = '10px';
closeButton.style.padding = '10px 20px';
closeButton.style.backgroundColor = '#AF1740'; // Red color
closeButton.style.color = 'white';
closeButton.style.border = 'none';
closeButton.style.borderRadius = '5px';
closeButton.style.cursor = 'pointer';
closeButton.addEventListener('click', () => overlay.remove());
popupBox.appendChild(closeButton);

// Append the popup box to the overlay
overlay.appendChild(popupBox);

// Append the overlay to the body
document.body.appendChild(overlay);
}

function evaluateQuiz(quizData, overlay) {
  let score = 0;
  let userAnswers = [];

  quizData.forEach((question, index) => {
      const selectedOptions = Array.from(
          overlay.querySelectorAll(`input[name="question${index}"]:checked`)
      ).map(input => input.value);

      const isCorrect = selectedOptions.every(option => question.answers.includes(option)) &&
          selectedOptions.length === question.answers.length;

      if (isCorrect) score++;

      userAnswers.push({ question, selectedOptions, isCorrect });
  });

  // Generate feedback based on score
  let feedbackMessage;
  const percentage = (score / quizData.length) * 100;

  if (percentage >= 80) {
      feedbackMessage = "Excellent! You have a strong grasp of the content. Keep it up!";
  } else if (percentage >= 50) {
      feedbackMessage = "Good effort! You have a decent understanding but can improve further.";
  } else {
      feedbackMessage = "Needs improvement. Consider reviewing the material again for a better grasp.";
  }

  alert(`You scored ${score} out of ${quizData.length}.\n\n${feedbackMessage}`);

  // Display the correct answers in a separate popup
  showCorrectAnswersPopup(userAnswers);
}

// Function to display correct answers in a separate popup
function showCorrectAnswersPopup(userAnswers) {
  // Create overlay for the correct answers popup
  const answerOverlay = document.createElement('div');
  answerOverlay.id = 'answer-popup-overlay';
  answerOverlay.style.position = 'fixed';
  answerOverlay.style.top = '0';
  answerOverlay.style.left = '0';
  answerOverlay.style.width = '100%';
  answerOverlay.style.height = '100%';
  answerOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
  answerOverlay.style.backdropFilter = 'blur(5px)';
  answerOverlay.style.zIndex = '1000';
  answerOverlay.style.display = 'flex';
  answerOverlay.style.justifyContent = 'center';
  answerOverlay.style.alignItems = 'center';

  // Create popup container
  const answerPopup = document.createElement('div');
  answerPopup.style.backgroundColor = '#d9ccd5';
  answerPopup.style.color = 'black';
  answerPopup.style.padding = '20px';
  answerPopup.style.borderRadius = '10px';
  answerPopup.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.3)';
  answerPopup.style.maxWidth = '70%';
  answerPopup.style.maxHeight = '80%';
  answerPopup.style.overflowY = 'auto';
  answerPopup.style.position = 'relative';
  answerPopup.style.fontFamily = 'Poppins, sans-serif';

  // Add Close Button (X)
  const closeButton = document.createElement('span');
  closeButton.innerHTML = '&times;';
  closeButton.style.position = 'absolute';
  closeButton.style.top = '14px';
  closeButton.style.right = '15px';
  closeButton.style.fontSize = '28px';
  closeButton.style.cursor = 'pointer';
  closeButton.style.color = '#4F0341';
  closeButton.addEventListener('click', () => answerOverlay.remove());
  answerPopup.appendChild(closeButton);

  // Title
  const answerTitle = document.createElement('h2');
  answerTitle.textContent = "Correct Answers";
  answerTitle.style.color = '#4F0341';
  answerTitle.style.textAlign = 'center';
  answerPopup.appendChild(answerTitle);

  // Display correct answers
  userAnswers.forEach(({ question, selectedOptions, isCorrect }, index) => {
      const answerDiv = document.createElement('div');
      answerDiv.style.marginBottom = '10px';

      let userAnswerHtml = selectedOptions.map(option => {
          return `<span style="color: ${question.answers.includes(option) ? '#41886c' : '#AF1740'}; font-weight: bold;">${option}</span>`;
      }).join(", ");

      answerDiv.innerHTML = `
          <p style=" font-size: 13px;"><strong style=" font-size: 14px;">Question ${index + 1}:</strong> ${question.question}</p>
          <p style=" font-size: 13px;"><strong><br>Your Answer: </strong> ${userAnswerHtml}</p>
          ${isCorrect?"" : `<p style=" font-size: 13px;"><strong>Correct Answer: </strong><span style="color:#41886c;font-weight:bold;">${question.answers.join(", ").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</span></p>`}
          <hr>
      `;

      answerPopup.appendChild(answerDiv);
  });

  // Append popup to overlay and overlay to document
  answerOverlay.appendChild(answerPopup);
  document.body.appendChild(answerOverlay);
}

document.addEventListener("DOMContentLoaded", function () {
  console.log("Script loaded and DOM fully loaded"); // Debugging check

  let generateQuizBtn = document.getElementById("generate-quiz");
  let progressBar = document.getElementById("quizProgress");
  let quizContainer = document.getElementById("quiz");

  if (!generateQuizBtn) {
      console.error("Generate Quiz button not found!");
      return;
  }

  generateQuizBtn.addEventListener("click", function () {
      console.log("Generate Quiz button clicked!");
      progressBar.style.display = "block"; // Show progress bar
      progressBar.value = 0;
      quizContainer.innerHTML = ""; // Clear previous quiz content

      let progress = 0;
      let interval = setInterval(function () {
          if (progress >= 100) {
              clearInterval(interval);
              progressBar.style.display = "none"; // Hide when complete

              // ✅ Insert Quiz Content Here Instead of Alert
              
          } else {
              progress += 10;
              progressBar.value = progress;
          }
      }, 500);
  });
});
