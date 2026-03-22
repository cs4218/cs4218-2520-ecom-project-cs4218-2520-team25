import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import HomePage from "./HomePage";
import axios from "axios";
import toast from "react-hot-toast";
import { MemoryRouter } from "react-router-dom";

// Han Tae Won (A0221684E)

jest.mock("axios");

// mock layout
jest.mock("../components/Layout", () => ({ children }) => <div>{children}</div>);

// mock cart hook
const mockSetCart = jest.fn();
let mockCart = [];

jest.mock("../context/cart", () => ({
  useCart: () => [mockCart, mockSetCart],
}));

// mock router
const mockNavigate = jest.fn();

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

// mock toast
jest.mock("react-hot-toast", () => ({
  success: jest.fn(),
}));

// mock icons
jest.mock("react-icons/ai", () => ({
  AiOutlineReload: () => <span>reload</span>,
}));

describe("HomePage", () => {
  let setItemMock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCart = [];

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

  test("renders banner image", async () => {
    axios.get
      .mockResolvedValueOnce({
        data: { success: true, category: [] },
      })
      .mockResolvedValueOnce({
        data: { total: 0 },
      })
      .mockResolvedValueOnce({
        data: { products: [] },
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
    axios.get
      .mockResolvedValueOnce({
        data: { success: true, category: [] },
      })
      .mockResolvedValueOnce({
        data: { total: 0 },
      })
      .mockResolvedValueOnce({
        data: { products: [] },
      });

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    expect(await screen.findByText("All Products")).toBeInTheDocument();
  });

  test("renders categories and fetched products", async () => {
    axios.get
      .mockResolvedValueOnce({
        data: {
          success: true,
          category: [{ _id: "c1", name: "Phones" }],
        },
      })
      .mockResolvedValueOnce({
        data: { total: 1 },
      })
      .mockResolvedValueOnce({
        data: {
          products: [
            {
              _id: "p1",
              name: "iPhone 15",
              slug: "iphone-15",
              description: "New iPhone with strong battery life and great camera",
              price: 1234,
            },
          ],
        },
      });

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    expect(await screen.findByText("Phones")).toBeInTheDocument();
    expect(await screen.findByText("iPhone 15")).toBeInTheDocument();
    expect(screen.getByText(/\$1,234\.00/)).toBeInTheDocument();
    expect(screen.getByText(/New iPhone with strong battery life/i)).toBeInTheDocument();
  });

  test("clicking More Details navigates to product page", async () => {
    axios.get
      .mockResolvedValueOnce({
        data: { success: true, category: [] },
      })
      .mockResolvedValueOnce({
        data: { total: 1 },
      })
      .mockResolvedValueOnce({
        data: {
          products: [
            {
              _id: "p1",
              name: "iPhone 15",
              slug: "iphone-15",
              description: "New iPhone with strong battery life and great camera",
              price: 1234,
            },
          ],
        },
      });

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    const detailsBtn = await screen.findByRole("button", {
      name: /more details/i,
    });

    fireEvent.click(detailsBtn);

    expect(mockNavigate).toHaveBeenCalledWith("/product/iphone-15");
  });

  test("clicking ADD TO CART updates cart and localStorage", async () => {
    axios.get
      .mockResolvedValueOnce({
        data: { success: true, category: [] },
      })
      .mockResolvedValueOnce({
        data: { total: 1 },
      })
      .mockResolvedValueOnce({
        data: {
          products: [
            {
              _id: "p1",
              name: "iPhone 15",
              slug: "iphone-15",
              description: "New iPhone with strong battery life and great camera",
              price: 1234,
            },
          ],
        },
      });

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    const addBtn = await screen.findByRole("button", {
      name: /add to cart/i,
    });

    fireEvent.click(addBtn);

    expect(mockSetCart).toHaveBeenCalledWith([
      expect.objectContaining({
        _id: "p1",
        name: "iPhone 15",
      }),
    ]);

    const savedCart = JSON.parse(setItemMock.mock.calls[0][1]);
    expect(savedCart).toEqual([
      expect.objectContaining({
        _id: "p1",
        name: "iPhone 15",
      }),
    ]);

    expect(toast.success).toHaveBeenCalledWith("Item Added to cart");
  });

  test("clicking Loadmore fetches and appends next page products", async () => {
    axios.get
      .mockResolvedValueOnce({
        data: { success: true, category: [] },
      })
      .mockResolvedValueOnce({
        data: { total: 3 },
      })
      .mockResolvedValueOnce({
        data: {
          products: [
            {
              _id: "p1",
              name: "iPhone 15",
              slug: "iphone-15",
              description: "New iPhone with strong battery life",
              price: 1234,
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          products: [
            {
              _id: "p2",
              name: "Galaxy S24",
              slug: "galaxy-s24",
              description: "New Samsung flagship phone",
              price: 999,
            },
          ],
        },
      });

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    expect(await screen.findByText("iPhone 15")).toBeInTheDocument();

    const loadMoreBtn = screen.getByRole("button", { name: /loadmore/i });
    fireEvent.click(loadMoreBtn);

    await waitFor(() => {
      expect(screen.getByText("Galaxy S24")).toBeInTheDocument();
    });
  });

  test("clicking RESET FILTERS reloads the page", async () => {
    const reloadMock = jest.fn();

    Object.defineProperty(window, "location", {
      value: { reload: reloadMock },
      writable: true,
      configurable: true,
    });

    axios.get
      .mockResolvedValueOnce({
        data: { success: true, category: [] },
      })
      .mockResolvedValueOnce({
        data: { total: 0 },
      })
      .mockResolvedValueOnce({
        data: { products: [] },
      });

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    const resetBtn = await screen.findByRole("button", {
      name: /reset filters/i,
    });

    fireEvent.click(resetBtn);

    expect(reloadMock).toHaveBeenCalled();
  });
});