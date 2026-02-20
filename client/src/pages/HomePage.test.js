import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import HomePage from "./HomePage";
import axios from "axios";
import { MemoryRouter } from "react-router-dom";

jest.mock("axios");

// mock layout
jest.mock("../components/Layout", () => ({ children }) => <div>{children}</div>);

// mock cart hook
jest.mock("../context/cart", () => ({
  useCart: () => [[], jest.fn()],
}));

// mock router
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => jest.fn(),
}));

// mock icons
jest.mock("react-icons/ai", () => ({
  AiOutlineReload: () => <span>reload</span>,
}));

describe("HomePage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders banner image", async () => {
    axios.get.mockResolvedValueOnce({
      data: { success: true, category: [] },
    });
    axios.get.mockResolvedValueOnce({
      data: { total: 0 },
    });

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    const banner = await screen.findByAltText("bannerimage");
    expect(banner).toBeInTheDocument();
  });

  test("renders All Products title", async () => {
    axios.get.mockResolvedValueOnce({
      data: { success: true, category: [] },
    });
    axios.get.mockResolvedValueOnce({
      data: { total: 0 },
    });

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    expect(await screen.findByText("All Products")).toBeInTheDocument();
  });
});
