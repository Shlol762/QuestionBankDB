import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from './Login';

describe('Login page', () => {
  it('renders login form fields', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    expect(screen.getByLabelText(/Work Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Secure Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign Into Portal/i })).toBeInTheDocument();
  });
});
