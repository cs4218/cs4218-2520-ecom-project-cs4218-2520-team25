import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import axios from "axios";
import toast from "react-hot-toast";
import { useAuth } from "../../context/auth";
import AdminOrders from "./AdminOrders";

jest.mock("axios");

jest.mock("react-hot-toast", () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

jest.mock("../../context/auth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("./../../components/Layout", () => ({
  __esModule: true,
  default: ({ children }) => <div data-testid="layout">{children}</div>,
}));

jest.mock("./../../components/AdminMenu", () => ({
  __esModule: true,
  default: () => <div data-testid="admin-menu">Admin Menu</div>,
}));

jest.mock("antd", () => {
  const React = require("react");

  const Select = ({ children, onChange, value, defaultValue, placeholder }) => {
    return (
      <select
        data-testid="mock-select"
        onChange={(e) => onChange && onChange(e.target.value)}
        value={value}
        defaultValue={defaultValue}
      >
        {placeholder && <option value="" disabled>{placeholder}</option>}
        {children}
      </select>
    );
  };

  Select.Option = ({ children, value }) => (
    <option value={value}>{children}</option>
  );

  return { Select };
});

const ordersMock = [
  {
    _id: "1",
    status: "Not Process",
    buyer: { name: "John Doe" },
    createdAt: new Date(),
    payment: { success: true },
    products: [{ _id: "p1", name: "Product1", description: "Desc1", price: 10 }],
  },
  {
    _id: "2",
    status: "Processing",
    buyer: { name: "Jane Smith" },
    createdAt: new Date(),
    payment: { success: false },
    products: [{ _id: "p2", name: "Product2", description: "Desc2", price: 20 }],
  },
];

describe("AdminOrders", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue([{ token: "fake-token" }, jest.fn()]);
    axios.get.mockResolvedValue({ data: ordersMock });
  });

  test('renders components, fetches and enders orders', async () => {
    render(<AdminOrders />);

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    });

    expect(screen.getByTestId('layout')).toBeInTheDocument();
    expect(screen.getByTestId('admin-menu')).toBeInTheDocument();
    expect(screen.getByRole('heading', {
      level: 1,
      name: /all orders/i,
    })).toBeInTheDocument();
  });

  test("renders product info for each order", async () => {
    render(<AdminOrders />);

    await waitFor(() => screen.getByText("Product1"));
    expect(screen.getByText("Product1")).toBeInTheDocument();
    expect(screen.getByText("Desc1")).toBeInTheDocument();
    expect(screen.getByText("Price : 10")).toBeInTheDocument();

    expect(screen.getByText("Product2")).toBeInTheDocument();
    expect(screen.getByText("Desc2")).toBeInTheDocument();
    expect(screen.getByText("Price : 20")).toBeInTheDocument();
  });

  test("getOrders: handles errors", async () => {
    const mockError = new Error('[getOrders] Network error');
    const consoleSpy = jest.spyOn(console, 'log'). mockImplementation(() => {});
    axios.get.mockRejectedValue(mockError);

    render(<AdminOrders />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to fetch orders");
      expect(consoleSpy).toHaveBeenCalledWith(mockError);
    });

    consoleSpy.mockRestore();
  });

  test("handleChange: calls API when status is changed", async () => {
    const singleOrderMock = [
      {
        _id: "1",
        status: "Not Process",
        buyer: { name: "John Doe" },
        createdAt: new Date(),
        payment: { success: true },
        products: [
          { _id: "p1", name: "Product1", description: "Desc1", price: 10 },
        ],
      },
    ];
    axios.get.mockResolvedValueOnce({ data: singleOrderMock });

    axios.put.mockResolvedValue({ data: { success: true } });

    render(<AdminOrders />);
    await waitFor(() => screen.getByText("John Doe"));

    const select = await screen.findByTestId("mock-select");
    fireEvent.change(select, { target: { value: "Processing" } });

    await waitFor(() => {
      expect(axios.put).toHaveBeenCalledWith(
        "/api/v1/auth/order-status/1",
        { status: "Processing" }
      );
    });

    await waitFor(() => {
      expect(select.value).toBe("Processing");
    });
  });

  test("handleChange: handles errors", async () => {
    const singleOrderMock = [
      {
        _id: "1",
        status: "Not Process",
        buyer: { name: "John Doe" },
        createdAt: new Date(),
        payment: { success: true },
        products: [
          { _id: "p1", name: "Product1", description: "Desc1", price: 10 },
        ],
      },
    ];
    axios.get.mockResolvedValueOnce({ data: singleOrderMock });

    const mockError = new Error('[handleChange] Network error');
    const consoleSpy = jest.spyOn(console, 'log'). mockImplementation(() => {});
    axios.put.mockRejectedValue(mockError);

    render(<AdminOrders />);
    await waitFor(() => screen.getByText("John Doe"));

    const select = await screen.findByTestId("mock-select");
    fireEvent.change(select, { target: { value: "Processing" } });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to update status");
      expect(consoleSpy).toHaveBeenCalledWith(mockError);
    });

    consoleSpy.mockRestore();
  });
});
