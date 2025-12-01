import { render, screen } from '@testing-library/react';
import App from './App';

// Simple validation test to ensure the application component tree renders successfully.
test('renders learn react link', () => {
  render(<App />);
  // getByText queries DOM elements strictly; throws exception if element is missing
  const linkElement = screen.getByText(/learn react/i);
  expect(linkElement).toBeInTheDocument(); // Asserts that the element exists in virtual DOM tree
});
