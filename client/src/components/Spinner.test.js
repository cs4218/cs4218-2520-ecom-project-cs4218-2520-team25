import React from "react";
import * as Router from "react-router-dom";
import { render, screen, act } from "@testing-library/react";
import Spinner from "./Spinner";

// -----------------------------
// Mock react-router-dom
// -----------------------------
const mockNavigate = jest.fn();

jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useLocation: jest.fn(() => ({
    pathname: "/private-page",
  })),
}));

describe("Spinner Component", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockNavigate.mockClear();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  // --------------------------------
  // INITIAL RENDER
  // --------------------------------
  test("renders with initial count of 3", () => {
    render(<Spinner />);
    expect(
      screen.getByText(/redirecting to you in 3 second/i)
    ).toBeInTheDocument();
  });

  test("renders spinner UI", () => {
    render(<Spinner />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  // --------------------------------
  // COUNTDOWN LOGIC
  // --------------------------------
  test("count decreases every second", () => {
    render(<Spinner />);

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(
      screen.getByText(/redirecting to you in 2 second/i)
    ).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(
      screen.getByText(/redirecting to you in 1 second/i)
    ).toBeInTheDocument();
  });

  // --------------------------------
  // REDIRECT LOGIC (DEFAULT PATH)
  // --------------------------------
  test("navigates to /login when countdown reaches 0", () => {
    render(<Spinner />);

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(mockNavigate).toHaveBeenCalledWith("/login", {
      state: "/private-page",
    });
  });

  // --------------------------------
  // CUSTOM PATH
  // --------------------------------
  test("navigates to custom path when provided", () => {
    render(<Spinner path="dashboard" />);

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(mockNavigate).toHaveBeenCalledWith("/dashboard", {
      state: "/private-page",
    });
  });

  // --------------------------------
  // EDGE CASE
  // --------------------------------
  test("does not navigate before countdown reaches 0", () => {
    render(<Spinner />);

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test("handles undefined path and location gracefully", () => {
    // override useLocation for this test
    Router.useLocation.mockReturnValue({ pathname: undefined });

    render(<Spinner path={undefined} />);

    act(() => {
        jest.advanceTimersByTime(3000);
    });

    expect(mockNavigate).toHaveBeenCalledWith("/login", { state: undefined });
  });
});