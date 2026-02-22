// Kailashwaran, A0253385Y; Entire file


import React from "react";
import { render, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "./auth";
import axios from "axios";

jest.unmock("./auth");
jest.mock("axios");

// Helper component to "Act" on the hook logic
const TestComponent = () => {
  const [auth] = useAuth();
  return (
    <div>
      <span data-testid="user">{auth?.user?.name || "no-user"}</span>
      <span data-testid="token">{auth?.token || "no-token"}</span>
    </div>
  );
};

describe("AuthProvider & useAuth Hook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // initial state
  test("should initialize with null user and empty token", () => {
    // --- Arrange & Act ---
    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // --- Assert ---
    expect(getByTestId("user").textContent).toBe("no-user");
    expect(getByTestId("token").textContent).toBe("no-token");
  });

  // Token exists
  test("should hydrate state from localStorage on mount", async () => {
    // --- Arrange ---
    const mockAuthData = {
      user: { name: "Kailash" },
      token: "secret-token-123",
    };
    
    localStorage.getItem.mockReturnValueOnce(JSON.stringify(mockAuthData));

    // --- Act ---
    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // --- Assert ---
    await waitFor(() => {
      expect(getByTestId("user").textContent).toBe("Kailash");
      expect(getByTestId("token").textContent).toBe("secret-token-123");
    });
  });

});