import React from 'react';
import ReactDOM from 'react-dom/client'; // Import for concurrent mode rendering
import App from './App'; // Import the root App component
import './styles/index.css'; // Import global styles (including Tailwind directives)

// Find the root element in your index.html file
const rootElement = document.getElementById('root');

// Ensure the root element exists before trying to render
if (rootElement) {
  // Create a React root for concurrent rendering
  const root = ReactDOM.createRoot(rootElement);

  // Render the application
  root.render(
    // StrictMode helps catch potential problems in an application during development
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  // Log an error if the root element isn't found
  console.error("Failed to find the root element. Make sure your index.html has an element with id='root'.");
}
