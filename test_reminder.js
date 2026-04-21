import fetch from "node-fetch";
const response = await fetch('http://localhost:5000/api/employee-numbers/send-reminders', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
});
const result = await response.json();
console.log(result);
