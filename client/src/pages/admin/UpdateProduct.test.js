import React from "react";
import { render, screen, waitFor, within, fireEvent } from "@testing-library/react";
import axios from "axios";
import toast from "react-hot-toast";
import UpdateProduct from "./UpdateProduct";

// --- MOCK DEPENDENCIES ---
jest.mock("axios");

jest.mock("react-hot-toast", () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ slug: "test-product" }),
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
  const Select = ({ children, onChange, placeholder, value }) => {
    return (
      <select 
        data-testid="mock-select" 
        onChange={(e) => onChange(e.target.value)}
        value={value || ""}
      >
        <option value="" disabled>{placeholder}</option>
        {children}
      </select>
    );
  };
  Select.Option = ({ children, value }) => (
    <option value={value}>{children}</option>
  ); 
  return { Select };
});

beforeAll(() => {
  global.URL.createObjectURL = jest.fn(() => "mock-url");
});

// ---
// MOCK CONSTANTS
// ---
const mockProduct = {
  data: {
    product: {
      _id: "123",
      name: "Test Name",
      description: "This is a test description",
      price: 100,
      quantity: 1000,
      shipping: "1",
      category: { _id: "cat1" },
    },
  },
};

const mockCategories = {
  data: {
    success: true,
    category: [{ _id: "cat1", name: "Electronics" }],
  },
};

describe("UpdateProduct", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    axios.get.mockImplementation((url) => {
      if (url === "/api/v1/product/get-product/test-product") {
        return Promise.resolve(mockProduct);
      }
      if (url === "/api/v1/category/get-category") {
        return Promise.resolve(mockCategories);
      }
      return Promise.reject(new Error("Unknown URL"));
    });
  });

  test('renders all component and fetches categories and product details', async () => {
    render(<UpdateProduct />);

    // wait for fetch on mount
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
      expect(axios.get).toHaveBeenCalledWith("/api/v1/product/get-product/test-product");
    });

    expect(screen.getByTestId('layout')).toBeInTheDocument();
    expect(screen.getByTestId('admin-menu')).toBeInTheDocument();
    expect(screen.getByRole('heading', {
          level: 1,
          name: /update product/i,
    })).toBeInTheDocument();

    const selects = screen.getAllByTestId("mock-select");
    expect(selects.length).toBe(2);

    expect(screen.getByPlaceholderText("write a name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("write a description")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("write a price")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("write a quantity")).toBeInTheDocument();

    expect(screen.getByText("UPDATE PRODUCT")).toBeInTheDocument();
    expect(screen.getByText("DELETE PRODUCT")).toBeInTheDocument();
  });

  test("renders product data after fetch", async () => {
    render(<UpdateProduct />);

    await waitFor(() =>
      expect(axios.get).toHaveBeenCalledWith("/api/v1/product/get-product/test-product")
    );

    const nameInput = await screen.findByDisplayValue(mockProduct.data.product.name);
    const descInput = await screen.findByDisplayValue(mockProduct.data.product.description);
    const priceInput = await screen.findByDisplayValue(String(mockProduct.data.product.price));
    const quantityInput = await screen.findByDisplayValue(String(mockProduct.data.product.quantity));

    expect(nameInput).toBeInTheDocument();
    expect(descInput).toBeInTheDocument();
    expect(priceInput).toBeInTheDocument();
    expect(quantityInput).toBeInTheDocument();

    const categorySelect = screen.getAllByTestId("mock-select")[0];
    expect(categorySelect.value).toBe(mockProduct.data.product.category._id);
  });

  test('changing input values updates the fields', async () => {
    render(<UpdateProduct />);

    await screen.findByDisplayValue(mockProduct.data.product.name);

    const nameInput = screen.getByPlaceholderText("write a name");
    fireEvent.change(nameInput, { target: { value: "New Name" } });
    expect(nameInput.value).toBe("New Name");

    const descriptionInput = screen.getByPlaceholderText("write a description");
    fireEvent.change(descriptionInput, { target: { value: "New description" } });
    expect(descriptionInput.value).toBe("New description");

    const priceInput = screen.getByPlaceholderText("write a price");
    fireEvent.change(priceInput, { target: { value: "200" } });
    expect(priceInput.value).toBe("200");

    const quantityInput = screen.getByPlaceholderText("write a quantity");
    fireEvent.change(quantityInput, { target: { value: "10000" } });
    expect(quantityInput.value).toBe("10000");
  });

  // --- 
  // GET SINGLE PRODUCT
  // ---
  test('getSingleProduct: handles errors -> calls console log and toast.error', async () => {
    const mockError = new Error('[getSingleProduct] Network error');
    const consoleSpy = jest.spyOn(console, 'log'). mockImplementation(() => {});

    axios.get.mockImplementation((url) => {
      if (url === "/api/v1/product/get-product/test-product") {
        return Promise.reject(mockError);
      }
      if (url === "/api/v1/category/get-category") {
        return Promise.resolve(mockCategories);
      }
      return Promise.reject(new Error("Unknown URL"));
    });

    render(<UpdateProduct />);

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/product/get-product/test-product");
    });
    expect(consoleSpy).toHaveBeenCalledWith(mockError);
    expect(toast.error).toHaveBeenCalledWith("Something went wrong in getting product details");

    consoleSpy.mockRestore();
  });

  // ---
  // GET ALL CATEGORY
  // ---
  test('getAllCategory: handles error -> calls console log and toast.error', async () => {
    const mockError = new Error('[getAllCategory] Network error');
    const consoleSpy = jest.spyOn(console, 'log'). mockImplementation(() => {});

    axios.get.mockImplementation((url) => {
      if (url === "/api/v1/product/get-product/test-product") {
        return Promise.resolve(mockProduct);
      }
      if (url === "/api/v1/category/get-category") {
        return Promise.reject(mockError);
      }
      return Promise.reject(new Error("Unknown URL"));
    });

    render(<UpdateProduct />);

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
    });
    expect(consoleSpy).toHaveBeenCalledWith(mockError);
    expect(toast.error).toHaveBeenCalledWith("Something went wrong in getting category");

    consoleSpy.mockRestore();
  });

  // ---
  // HANDLE UPDATE
  // ---
  test("handleUpdate: successful update -> calls toast.success and navigates", async () => {
    axios.put.mockResolvedValueOnce({ data: { success: true } });

    render(<UpdateProduct />);

    await screen.findByDisplayValue(mockProduct.data.product.name);
    const updateButton = screen.getByText("UPDATE PRODUCT");
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Product Updated Successfully");
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard/admin/products");
    })
  });

  test("handleUpdate: success === false -> calls toast.error", async () => {
    axios.put.mockResolvedValueOnce({
      data: {
        success: false,
        message: "unsuccessful update",
      },
    });

    render(<UpdateProduct />);

    await screen.findByDisplayValue(mockProduct.data.product.name);
    const updateButton = screen.getByText("UPDATE PRODUCT");
    fireEvent.click(updateButton);
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("unsuccessful update");
    });
  });

  test("handleUpdate: handles errors -> calls console log and toast.error", async () => {
    const mockError = new Error('[handleUpdate] Network error');
    const consoleSpy = jest.spyOn(console, 'log'). mockImplementation(() => {});
    axios.put.mockRejectedValue(mockError);

    render(<UpdateProduct />);

    await screen.findByDisplayValue(mockProduct.data.product.name);
    const updateButton = screen.getByText("UPDATE PRODUCT");
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("something went wrong");
      expect(consoleSpy).toHaveBeenCalledWith(mockError);
    });

    consoleSpy.mockRestore();
  });

  // ---
  // HANDLE DELETE
  // ---
  test("handleDelete: user cancels deletion -> nothing", async () => {
    window.confirm = jest.fn(() => false);

    render(<UpdateProduct />);

    await screen.findByDisplayValue(mockProduct.data.product.name);
    const deleteButton = screen.getByText("DELETE PRODUCT");
    fireEvent.click(deleteButton);

    expect(axios.delete).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test("handleDelete: successful deletion -> calls toast.success and navigates", async () => {
    window.confirm = jest.fn(() => true);
    axios.delete.mockResolvedValueOnce({ data: { success: true } });

    render(<UpdateProduct />);
    await screen.findByDisplayValue(mockProduct.data.product.name);
    const deleteButton = screen.getByText("DELETE PRODUCT");
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(axios.delete).toHaveBeenCalledWith(`/api/v1/product/delete-product/${mockProduct.data.product._id}`);
      expect(toast.success).toHaveBeenCalledWith("Product Deleted Successfully");
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard/admin/products");
    });
  });

  test("handleDelete: success == false -> calls toast.error", async () => {
    window.confirm = jest.fn(() => true);
    axios.delete.mockResolvedValueOnce({
      data: {
        success: false,
        message: "deletion failed",
      },
    });

    render(<UpdateProduct />);
    await screen.findByDisplayValue(mockProduct.data.product.name);
    const deleteButton = screen.getByText("DELETE PRODUCT");
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("deletion failed");
    });
  });

  test("handleDelete: handles errors -> calls toast.error and console log", async () => {
    const mockError = new Error('[handleDelete] Network error');
    const consoleSpy = jest.spyOn(console, 'log'). mockImplementation(() => {});
    window.confirm = jest.fn(() => true);
    axios.delete.mockRejectedValue(mockError);

    render(<UpdateProduct />);
    await screen.findByDisplayValue(mockProduct.data.product.name);
    const deleteButton = screen.getByText("DELETE PRODUCT");
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Something went wrong");
      expect(consoleSpy).toHaveBeenCalledWith(mockError);
    });

    consoleSpy.mockRestore();
  });
});
