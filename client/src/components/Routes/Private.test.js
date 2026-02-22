import React from 'react';
import { render, waitFor } from '@testing-library/react';
import axios from 'axios';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import PrivateRoute from './Private';
import { useAuth } from "../../context/auth";



// Mocking the child components to verify which one is rendered
jest.mock("../Spinner", () => () => <div data-testid="spinner">Spinner</div>);
const MockOutlet = () => <div data-testid="outlet">Protected Content</div>;

describe('PrivateRoute Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should render spinner initially when no token is present', async () => {
    // --- Arrange ---
    useAuth.mockReturnValue([{ token: "" }, jest.fn()]);

    // --- Act ---
    const { getByTestId, queryByTestId } = render(
      <MemoryRouter>
        <PrivateRoute />
      </MemoryRouter>
    );

    // --- Assert ---
    await waitFor(() => {
      expect(getByTestId('spinner')).toBeInTheDocument();
      expect(queryByTestId('outlet')).not.toBeInTheDocument();
    });
  });

  // Auth successful
  test('should render outlet when auth check is successful', async () => {
    // --- Arrange ---
    useAuth.mockReturnValue([{ token: "valid-token" }, jest.fn()]);
    
    axios.get.mockResolvedValueOnce({ data: { ok: true } });

    // --- Act ---
    const { getByTestId } = render(
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<PrivateRoute />}>
            <Route path="" element={<MockOutlet />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    // --- Assert ---
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/user-auth");
      expect(getByTestId('outlet')).toBeInTheDocument();
    });
  });

  // Auth fails
  test('should render spinner when auth check fails', async () => {
    // --- Arrange ---
    useAuth.mockReturnValue([{ token: "invalid-token" }, jest.fn()]);
    axios.get.mockResolvedValueOnce({ data: { ok: false } });

    // --- Act ---
    const { getByTestId, queryByTestId } = render(
      <MemoryRouter>
        <PrivateRoute />
      </MemoryRouter>
    );

    // --- Assert ---
    await waitFor(() => {
        expect(getByTestId('spinner')).toBeInTheDocument();
        expect(queryByTestId('outlet')).not.toBeInTheDocument();
    });
  });

});