import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import CategoryProduct from "./CategoryProduct";

// Han Tae Won (A0221684E)

// mock Layout
jest.mock("./../components/Layout", () => ({ children }) => (
  <div data-testid="layout">{children}</div>
));

const mockNavigate = jest.fn();

jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom");
  return {
    ...actual,
    useParams: () => ({ slug: "phones" }),
    useNavigate: () => mockNavigate,
  };
});

// cart hook
const mockSetCart = jest.fn();
jest.mock("./../context/cart", () => ({
  useCart: () => [[], mockSetCart],
}));

jest.mock("axios");
jest.mock("react-hot-toast", () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

describe("CategoryProduct page", () => {
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

  test("fetches category products by slug and renders heading + cards", async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        category: { name: "Phones" },
        products: [
          {
            _id: "p1",
            name: "iPhone 15",
            description: "New iPhone",
            price: 1234,
            slug: "iphone-15",
          },
        ],
      },
    });

  render(
    <MemoryRouter>
      <CategoryProduct />
    </MemoryRouter>
  );

  // wait for API + render
  await waitFor(() =>
    expect(axios.get).toHaveBeenCalledWith(
      "/api/v1/product/product-category/phones"
    )
  );

await screen.findByText("iPhone 15");

    expect(await screen.findByText("Category - Phones")).toBeInTheDocument();
    expect(screen.getByText("iPhone 15")).toBeInTheDocument();
    // expect(screen.getByText("$1234")).toBeInTheDocument();
    expect(screen.getByText("$1,234.00")).toBeInTheDocument();
  });

  test("More Details navigates to product page", async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        category: { name: "Phones" },
        products: [
          {
            _id: "p1",
            name: "iPhone 15",
            description: "New iPhone",
            price: 1234,
            slug: "iphone-15",
          },
        ],
      },
    });

    render(
      <MemoryRouter>
        <CategoryProduct />
      </MemoryRouter>
    );

    await screen.findByText("iPhone 15");

    const moreBtn = screen.getByRole("button", { name: /more details/i });
    fireEvent.click(moreBtn);

    expect(mockNavigate).toHaveBeenCalledWith("/product/iphone-15");
  });
});