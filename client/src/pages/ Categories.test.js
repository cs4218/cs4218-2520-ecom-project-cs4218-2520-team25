import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import Categories from "./Categories";

// Mock axios
jest.mock("axios");

// Mock Layout
jest.mock("../components/Layout", () => ({ children }) => (
  <div data-testid="layout">{children}</div>
));

describe("Categories Component - Full Integration Style", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = () =>
    render(
      <MemoryRouter>
        <Categories />
      </MemoryRouter>
    );

  test("renders categories after successful fetch", async () => {
    axios.get.mockResolvedValue({
      data: {
        category: [
          { _id: "1", name: "Electronics", slug: "electronics" },
          { _id: "2", name: "Clothing", slug: "clothing" },
        ],
      },
    });

    renderComponent();

    // Wait for async update
    await waitFor(() => {
      expect(screen.getByText("Electronics")).toBeInTheDocument();
      expect(screen.getByText("Clothing")).toBeInTheDocument();
    });
  });

  test("generates correct link URLs", async () => {
    axios.get.mockResolvedValue({
      data: {
        category: [
          { _id: "1", name: "Electronics", slug: "electronics" },
        ],
      },
    });

    renderComponent();

    const link = await screen.findByRole("link", { name: "Electronics" });

    expect(link).toHaveAttribute("href", "/category/electronics");
  });

  test("renders nothing when API returns empty array", async () => {
    axios.get.mockResolvedValue({
      data: { category: [] },
    });

    renderComponent();

    await waitFor(() => {
      const links = screen.queryAllByRole("link");
      expect(links.length).toBe(0);
    });
  });

  test("handles API error gracefully", async () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    axios.get.mockRejectedValue(new Error("Network Error"));

    renderComponent();

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });

    consoleSpy.mockRestore();
  });

  test("calls correct API endpoint", async () => {
    axios.get.mockResolvedValue({
      data: { category: [] },
    });

    renderComponent();

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        "/api/v1/category/get-category"
      );
    });
  });
});

// Unit test code was written with AI assistance by providing the type of unit test we want to test
