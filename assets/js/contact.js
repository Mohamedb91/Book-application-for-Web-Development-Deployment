// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getDatabase, ref, set, get, child} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBlf-TL6vaD42MUt6m1wwdgrWEgKqYDrwU",
  authDomain: "portfolio-fd525.firebaseapp.com",
  databaseURL: "https://portfolio-fd525-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "portfolio-fd525",
  storageBucket: "portfolio-fd525.appspot.com",
  messagingSenderId: "383850805413",
  appId: "1:383850805413:web:a8c8dd4fb53204217db54c"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig); 

// Reference to the database
var db = getDatabase(app);

document.addEventListener('DOMContentLoaded', function() {
  document.querySelector('form#portfolio').addEventListener('submit', function(e){
      e.preventDefault(); // Prevent the form from submitting normally
      set(ref(db, 'user/' + document.getElementById("full_name").value), {
          full_name:  document.getElementById("full_name").value,
          email:  document.getElementById("email").value,
          phone_number:  document.getElementById("phone_number").value,
          subject:  document.getElementById("subject").value,
          message:  document.getElementById("message").value
      });
      alert("Message Received, Thank you.");
    });
});