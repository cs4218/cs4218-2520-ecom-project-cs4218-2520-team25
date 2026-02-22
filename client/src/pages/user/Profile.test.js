// Kailashwaran, A0253385Y; Entire file

import React from "react";
import { render, fireEvent, waitFor, screen } from "@testing-library/react";
import axios from "axios";
import { MemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom/extend-expect";
import toast from "react-hot-toast";
import Profile from "./Profile";
import { useAuth } from "../../context/auth";

const mockSetAuth = jest.fn();

jest.mock("../../components/UserMenu", () => () => <div data-testid="user-menu" />);

describe("Profile Component", () => {
  const mockUser = {
    name: "John Doe",
    email: "john@example.com",
    phone: "1234567890",
    address: "123 Main St",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue([{ user: mockUser }, mockSetAuth]);
    
    // Stub LocalStorage
    const localStorageMock = {
      getItem: jest.fn().mockReturnValue(JSON.stringify({ user: mockUser })),
      setItem: jest.fn(),
    };
    Object.defineProperty(window, "localStorage", { value: localStorageMock, writable: true });
  });

  test("should hydrate form fields with user data from context on mount", () => {
    // --- Arrange & Act ---
    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    );

    // --- Assert ---
    expect(screen.getByPlaceholderText("Enter Your Name")).toHaveValue(mockUser.name);
    expect(screen.getByPlaceholderText("Enter Your Email")).toHaveValue(mockUser.email);
    expect(screen.getByPlaceholderText("Enter Your Phone")).toHaveValue(mockUser.phone);
    expect(screen.getByPlaceholderText("Enter Your Address")).toHaveValue(mockUser.address);
  });

  // Update profile
  test("should update profile successfully and refresh context/localStorage", async () => {
    // --- Arrange ---
    const updatedUser = { ...mockUser, name: "John Smith" };
    axios.put.mockResolvedValueOnce({ data: { updatedUser } });

    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    );

    // --- Act ---
    fireEvent.change(screen.getByPlaceholderText("Enter Your Name"), {
      target: { value: "John Smith" },
    });
    fireEvent.click(screen.getByText("UPDATE"));

    // --- Assert ---
    await waitFor(() => {
      expect(axios.put).toHaveBeenCalledWith("/api/v1/auth/profile", expect.objectContaining({
        name: "John Smith",
      }));
    });

    expect(mockSetAuth).toHaveBeenCalledWith(expect.objectContaining({ user: updatedUser }));
    expect(localStorage.setItem).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith("Profile Updated Successfully");
  });

  // Update failed
  test("should display error toast on API failure", async () => {
    // --- Arrange ---
    axios.put.mockRejectedValueOnce(new Error("Update Failed"));

    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    );

    // --- Act ---
    fireEvent.click(screen.getByText("UPDATE"));

    // --- Assert ---
    await waitFor(() => expect(axios.put).toHaveBeenCalled());
    expect(toast.error).toHaveBeenCalledWith("Something went wrong");
  });
});