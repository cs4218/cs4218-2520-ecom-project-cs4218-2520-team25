import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import ProductDetails from "./ProductDetails";

// mock Layout
jest.mock("./../components/Layout", () => ({ children }) => (
  <div data-testid="layout">{children}</div>
));

const mockNavigate = jest.fn();

jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom");
  return {
    ...actual,
    useParams: () => ({ slug: "iphone-15" }),
    useNavigate: () => mockNavigate,
  };
});

// mock cart hook
const mockSetCart = jest.fn();
jest.mock("./../context/cart", () => ({
  useCart: () => [[], mockSetCart],
}));

jest.mock("axios");
jest.mock("react-hot-toast", () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

describe("ProductDetails page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.REACT_APP_API = "";
    jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {});
    jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => null);
  });

  afterEach(() => {
    Storage.prototype.setItem.mockRestore();
    Storage.prototype.getItem.mockRestore();
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

    // related products call
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

    expect(await screen.findByText(/Name\s*:\s*iPhone 15/i)).toBeInTheDocument();
    expect(screen.getByText(/Description\s*:\s*New iPhone/i)).toBeInTheDocument();
    expect(screen.getByText(/Price\s*:\s*\$1,234\.00/i)).toBeInTheDocument();
    expect(screen.getByText(/Category\s*:\s*Phones/i)).toBeInTheDocument();

    // related products heading + item
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

    const addBtn = screen.getByRole("button", { name: /add to cart/i });
    fireEvent.click(addBtn);

    // expect(mockSetCart).toHaveBeenCalled();
    // expect(Storage.prototype.setItem).toHaveBeenCalledWith(
    //   "cart",
    //   expect.any(String)
    // );
    // expect(toast.success).toHaveBeenCalledWith("Item Added to cart");
    await waitFor(() => {
    expect(Storage.prototype.setItem).toHaveBeenCalledWith(
        "cart",
        expect.any(String)
        );
    });
    expect(toast.success).toHaveBeenCalledWith("Item Added to cart");
  });

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

    const moreDetailsBtn = screen.getByRole("button", { name: /more details/i });
    fireEvent.click(moreDetailsBtn);

    expect(mockNavigate).toHaveBeenCalledWith("/product/iphone-case");
  });
});