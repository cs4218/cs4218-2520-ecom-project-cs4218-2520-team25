import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import ProductDetails from "./ProductDetails";

// A0221684E Han Tae Won

jest.mock("./../components/Layout", () => ({ children }) => (
  <div data-testid="layout">{children}</div>
));

const mockNavigate = jest.fn();
const mockSetCart = jest.fn();
const mockUseParams = jest.fn();
let mockCart = [];

jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom");
  return {
    ...actual,
    useParams: () => mockUseParams(),
    useNavigate: () => mockNavigate,
  };
});

jest.mock("./../context/cart", () => ({
  useCart: () => [mockCart, mockSetCart],
}));

jest.mock("axios");
jest.mock("react-hot-toast", () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

describe("ProductDetails page", () => {
  let setItemMock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCart = [];
    mockUseParams.mockReturnValue({ slug: "iphone-15" });

    setItemMock = jest.fn();
    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: jest.fn(),
        setItem: setItemMock,
        removeItem: jest.fn(),
        clear: jest.fn(),
      },
      writable: true,
    });
  });

  test("loads product by slug and renders product info", async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        product: {
          _id: "p1",
          name: "iPhone 15",
          description: "New iPhone",
          price: 1234,
          quantity: 5,
          category: { _id: "c1", name: "Phones" },
        },
      },
    });

    axios.get.mockResolvedValueOnce({
      data: {
        products: [
          {
            _id: "p2",
            name: "iPhone Case",
            description: "Case",
            price: 12,
            slug: "iphone-case",
          },
        ],
      },
    });

    render(
      <MemoryRouter>
        <ProductDetails />
      </MemoryRouter>
    );

    await waitFor(() =>
      expect(axios.get).toHaveBeenCalledWith(
        "/api/v1/product/get-product/iphone-15"
      )
    );

    expect(
      await screen.findByText(/Name\s*:\s*iPhone 15/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Description\s*:\s*New iPhone/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Price\s*:\s*\$1,234\.00/i)).toBeInTheDocument();
    expect(screen.getByText(/Category\s*:\s*Phones/i)).toBeInTheDocument();
    expect(screen.getByText("Similar Products ➡️")).toBeInTheDocument();
    expect(await screen.findByText("iPhone Case")).toBeInTheDocument();
  });

  test("Add to Cart adds item and updates localStorage", async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        product: {
          _id: "p1",
          name: "iPhone 15",
          description: "New iPhone",
          price: 1234,
          quantity: 5,
          category: { _id: "c1", name: "Phones" },
        },
      },
    });

    axios.get.mockResolvedValueOnce({
      data: { products: [] },
    });

    render(
      <MemoryRouter>
        <ProductDetails />
      </MemoryRouter>
    );

    await screen.findByText(/Name\s*:\s*iPhone 15/i);
    await screen.findByText(/No Similar Products found/i);

    const addBtn = screen.getByRole("button", { name: /add to cart/i });
    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(mockSetCart).toHaveBeenCalledWith([
        expect.objectContaining({
          _id: "p1",
          name: "iPhone 15",
        }),
      ]);
    });

    const savedCart = JSON.parse(setItemMock.mock.calls[0][1]);

    expect(savedCart).toEqual([
      expect.objectContaining({
        _id: "p1",
        name: "iPhone 15",
      }),
    ]);

    expect(toast.success).toHaveBeenCalledWith("Item Added to cart");
  });
  
  // Owen Yeo Le Yang A0252047L
  test("clicking More Details on a related product navigates to its page", async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        product: {
          _id: "p1",
          name: "iPhone 15",
          description: "New iPhone",
          price: 1234,
          quantity: 5,
          category: { _id: "c1", name: "Phones" },
        },
      },
    });

    axios.get.mockResolvedValueOnce({
      data: {
        products: [
          {
            _id: "p2",
            name: "iPhone Case",
            description: "Case",
            price: 12,
            slug: "iphone-case",
          },
        ],
      },
    });

    render(
      <MemoryRouter>
        <ProductDetails />
      </MemoryRouter>
    );

    await screen.findByText("iPhone Case");

    const moreDetailsBtn = screen.getByRole("button", {
      name: /more details/i,
    });
    fireEvent.click(moreDetailsBtn);

    expect(mockNavigate).toHaveBeenCalledWith("/product/iphone-case");
  });
  
  // Owen Yeo Le Yang A0252047L
  test("does not fetch product when slug is missing", async () => {
    mockUseParams.mockReturnValue({});

    render(
      <MemoryRouter>
        <ProductDetails />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(axios.get).not.toHaveBeenCalled();
    });
  });
  
  // Owen Yeo Le Yang A0252047L
  test("handles product API failure gracefully", async () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    axios.get.mockRejectedValueOnce(new Error("failed to fetch product"));

    render(
      <MemoryRouter>
        <ProductDetails />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
      expect(screen.getByText("Product Details")).toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });
});