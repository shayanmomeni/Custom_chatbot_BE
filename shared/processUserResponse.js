// export function processUserResponse(userMessage, currentStep, activity = null) {
//   const message = userMessage.toLowerCase().trim();

//   const response = {
//     nextMessage: '',
//     nextStep: currentStep,
//     action: 'repeat', // Default action is to repeat the current step
//   };

//   switch (currentStep) {
//     case 'start':
//     case 'awaiting_time_response':
//       if (message === 'yes') {
//         response.nextMessage = 'Where are you?';
//         response.nextStep = 'ask_location';
//         response.action = 'continue';
//       } else if (message === 'no') {
//         response.nextMessage = 'Ah, okay. Why not?';
//         response.nextStep = 'ask_why_no_time';
//         response.action = 'continue';
//       } else {
//         response.nextMessage =
//           "Sorry, I didn't quite catch that. Please answer with 'yes' or 'no'.";
//         response.action = 'repeat';
//       }
//       break;

//     case 'ask_location':
//       if (message && message.length > 1) {
//         response.nextMessage = 'Are you alone? If not, who is with you?';
//         response.nextStep = 'ask_alone';
//         response.action = 'continue';
//       } else {
//         response.nextMessage =
//           "I need to know your location. Please tell me where you are.";
//         response.action = 'repeat';
//       }
//       break;

//     case 'ask_alone':
//       if (message && message.length > 1) {
//         response.nextMessage = 'What are you doing right now?';
//         response.nextStep = 'ask_activity';
//         response.action = 'continue';
//       } else {
//         response.nextMessage =
//           "I understand it's a personal question, but could you share if you're alone or not?";
//         response.action = 'repeat';
//       }
//       break;

//     case 'ask_activity':
//       response.nextMessage = `How often do you do this per week? 
//         a. Every day (at least 7 times)
//         b. Almost daily (5-7 times)
//         c. Often (3-5 times)
//         d. Occasionally (1-2 times)
//         e. Very rarely (less than 1 time)
//         f. Never, this is an exception
//         h. I’m not sure how to answer that.`;
//       response.nextStep = 'ask_frequency';
//       response.action = 'continue';
//       break;

//     case 'ask_frequency':
//       if (['a', 'b', 'c', 'd', 'e', 'f', 'h'].includes(message)) {
//         if (message === 'h') {
//           response.nextMessage = 'Ah, okay. Why not?';
//         } else if (message === 'a') {
//           response.nextMessage = 'Ah, so you do this daily.';
//         } else {
//           response.nextMessage = 'Ah, so not daily.';
//         }
//         response.nextStep = 'ask_routine';
//         response.action = 'continue';
//       } else {
//         response.nextMessage =
//           "I didn't understand. Please choose an option: a, b, c, d, e, f, or h.";
//         response.action = 'repeat';
//       }
//       break;

//     default:
//       response.nextMessage = "Sorry, I didn't understand that.";
//       response.action = 'repeat';
//       break;
//   }

//   return response;
// }
