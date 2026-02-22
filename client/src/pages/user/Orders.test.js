import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import Orders from "./Orders";
import { useAuth } from "../../context/auth";

jest.mock("../../components/UserMenu", () => () => <div data-testid="user-menu" />);
jest.mock("moment", () =>
    jest.fn((input) => ({
      fromNow: () => `fromNow:${input}`,
    }))
);

describe("Orders", () => {
  const mockSetAuth = jest.fn();

  const ordersMock = [
    {
      _id: "o1",
      status: "Processing",
      buyer: { name: "Alice" },
      createAt: "2024-01-01T00:00:00.000Z",
      payment: { success: true },
      products: [
        {
          _id: "p1",
          name: "Keyboard",
          description: "abcdefghijklmnopqrstuvwxyz1234567890",
          price: 99,
        },
      ],
    },
    {
      _id: "o2",
      status: "Delivered",
      buyer: { name: "Bob" },
      createAt: "2024-01-02T00:00:00.000Z",
      payment: { success: false },
      products: [
        {
          _id: "p2",
          name: "Mouse",
          description: "short description",
          price: 49,
        },
        {
          _id: "p3",
          name: "Monitor",
          description: "A 27-inch monitor for development",
          price: 299,
        },
      ],
    },
  ];

  const renderOrders = () =>
    render(
      <MemoryRouter>
        <Orders />
      </MemoryRouter>
    );

  beforeEach(() => {
    jest.clearAllMocks();
    axios.get.mockResolvedValue({ data: ordersMock });
    useAuth.mockReturnValue([{ token: "token_123", user: { name: "User" } }, mockSetAuth]);
  });

  test("fetches orders when auth token exists", async () => {
    renderOrders();

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/orders");
    });
  });

  test("does not fetch orders when auth token is missing", async () => {
    useAuth.mockReturnValue([{ token: null, user: null }, mockSetAuth]);

    renderOrders();

    await waitFor(() => {
      expect(screen.getByText(/all orders/i)).toBeInTheDocument();
    });
    expect(axios.get).not.toHaveBeenCalled();
  });

  test("renders order summary rows correctly", async () => {
    renderOrders();

    expect(await screen.findByText("Processing")).toBeInTheDocument();
    expect(screen.getByText("Delivered")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("fromNow:2024-01-01T00:00:00.000Z")).toBeInTheDocument();
    expect(screen.getByText("fromNow:2024-01-02T00:00:00.000Z")).toBeInTheDocument();
    expect(screen.getByText("Success")).toBeInTheDocument();
    expect(screen.getByText("Failed")).toBeInTheDocument();
    expect(screen.getAllByText("1").length).toBeGreaterThan(0);
    expect(screen.getAllByText("2").length).toBeGreaterThan(0);
  });

  test("renders product cards with expected values", async () => {
    renderOrders();

    expect(await screen.findByText("Keyboard")).toBeInTheDocument();
    expect(screen.getByText("Mouse")).toBeInTheDocument();
    expect(screen.getByText("Monitor")).toBeInTheDocument();

    expect(screen.getByText("abcdefghijklmnopqrstuvwxyz1234")).toBeInTheDocument();
    expect(screen.getByText("short description")).toBeInTheDocument();
    expect(screen.getByText("A 27-inch monitor for developm")).toBeInTheDocument();

    expect(screen.getByText("Price : 99")).toBeInTheDocument();
    expect(screen.getByText("Price : 49")).toBeInTheDocument();
    expect(screen.getByText("Price : 299")).toBeInTheDocument();

    const images = screen.getAllByRole("img");
    expect(images).toHaveLength(3);
    expect(images[0]).toHaveAttribute("src", "/api/v1/product/product-photo/p1");
    expect(images[1]).toHaveAttribute("src", "/api/v1/product/product-photo/p2");
    expect(images[2]).toHaveAttribute("src", "/api/v1/product/product-photo/p3");
  });

  test("renders user menu and layout shell", async () => {
    renderOrders();

    await screen.findByText("Processing");
    expect(screen.getByTestId("user-menu")).toBeInTheDocument();
    expect(screen.getByTestId("layout")).toBeInTheDocument();
  });

  test("handles API error gracefully", async () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    axios.get.mockRejectedValue(new Error("Orders API failed"));

    renderOrders();

    await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/orders");
        expect(consoleSpy).toHaveBeenCalled();
    });

    consoleSpy.mockRestore();
  });
});
