import React from "react";
import { render, screen, waitFor, within, fireEvent } from "@testing-library/react";
import axios from "axios";
import toast from "react-hot-toast";
import CreateProduct from "./CreateProduct";

// ---
// MOCK DEPENDENCIES
// ---
jest.mock("axios");

jest.mock("react-hot-toast", () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
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
  const Select = ({ children, onChange, placeholder }) => {
    return (
      <select 
        data-testid="mock-select" 
        onChange={(e) => onChange(e.target.value)}
        defaultValue=""
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

// --- 
// TESTS
// ---
describe('CreateProduct', () => {
  const mockCategories = [
    { _id: "1", name: "Electronics" },
    { _id: "2", name: "Clothing" },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    axios.get.mockResolvedValue({ data: { success: true, category: mockCategories } });
  });

  beforeAll(() => {
    global.URL.createObjectURL = jest.fn(() => "mocked-url");
  });

  // ---
  // TEST RENDERING
  // ---
  test('renders all components and fetches categories on mount', async () => {
    render(<CreateProduct />);

    // wait for categories to load on mount
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
    });

    // layout, heading, admin menu
    expect(screen.getByTestId('layout')).toBeInTheDocument();
    expect(screen.getByTestId('admin-menu')).toBeInTheDocument();
    expect(screen.getByRole('heading', {
      level: 1,
      name: /create product/i,
    })).toBeInTheDocument();

    // selects
    const selects = screen.getAllByTestId("mock-select");
    expect(selects.length).toBe(2);
    expect(within(selects[0]).getByText("Select a category")).toBeInTheDocument();
    expect(within(selects[1]).getByText("Select Shipping")).toBeInTheDocument();

    // inputs
    expect(screen.getByPlaceholderText("write a name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("write a description")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("write a price")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("write a quantity")).toBeInTheDocument();

    const photoLabel = screen.getByText(/upload photo/i);
    expect(photoLabel).toBeInTheDocument();

    // button
    expect(screen.getByText("CREATE PRODUCT")).toBeInTheDocument();
  });

  // ---
  // TEST CHANGE OF INPUTS
  // ---
  test('changing input values updates the fields', async () => {
    render(<CreateProduct />);

    const nameInput = screen.getByPlaceholderText("write a name");
    fireEvent.change(nameInput, { target: { value: "Test Product" } });

    const descriptionInput = screen.getByPlaceholderText("write a description");
    fireEvent.change(descriptionInput, { target: { value: "Test Description" } });

    const priceInput = screen.getByPlaceholderText("write a price");
    fireEvent.change(priceInput, { target: { value: "100" } });

    const quantityInput = screen.getByPlaceholderText("write a quantity");
    fireEvent.change(quantityInput, { target: { value: "100" } });

    expect(nameInput.value).toBe("Test Product");
    expect(descriptionInput.value).toBe("Test Description");
    expect(priceInput.value).toBe("100");
    expect(quantityInput.value).toBe("100");
  });

  test('selecting category and shipping updates state', async () => {
    render(<CreateProduct />);
    await waitFor(() => expect(axios.get).toHaveBeenCalled());

    const categorySelect = screen.getAllByTestId("mock-select")[0];
    fireEvent.change(categorySelect, { target: { value: "1" } });

    const shippingSelect = screen.getAllByTestId("mock-select")[1];
    fireEvent.change(shippingSelect, { target: { value: "1" } });

    expect(categorySelect.value).toBe("1");
    expect(shippingSelect.value).toBe("1");
  });

  test('uploading photo sets file', async () => {
    render(<CreateProduct />);

    const file = new File(["dummy content"], "photo.png", { type: "image/png" });
    const label = screen.getByText(/upload photo/i).closest("label");
    const input = label.querySelector('input[type="file"]');

    fireEvent.change(input, { target: { files: [file] } });

    expect(input.files[0]).toBe(file);
    expect(input.files).toHaveLength(1);
    expect(screen.getByAltText("product_photo")).toHaveAttribute("src", "mocked-url");
  });

  // ---
  // GET ALL CATEGORY
  // ---
  test('getAllCategory: handles errors -> calls console log and toast.error', async () => {
    const mockError = new Error('[getAllCategory] Network error');
    const consoleSpy = jest.spyOn(console, 'log'). mockImplementation(() => {});
    axios.get.mockRejectedValue(mockError);

    render(<CreateProduct />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Something went wrong in getting catgeory");
      expect(consoleSpy).toHaveBeenCalledWith(mockError);
    });

    consoleSpy.mockRestore();
  });

  // ---
  // HANDLE CREATE
  // ---
  test('handleCreate: successful product creation -> calls API, toast.success and navigates', async () => {
    axios.post.mockResolvedValue({ data: { success: true } });

    render(<CreateProduct />);

    fireEvent.change(screen.getByPlaceholderText("write a name"), { target: { value: "Test Product" } });
    fireEvent.change(screen.getByPlaceholderText("write a description"), { target: { value: "Test description" } });
    fireEvent.change(screen.getByPlaceholderText("write a price"), { target: { value: "100" } });
    fireEvent.change(screen.getByPlaceholderText("write a quantity"), { target: { value: "5" } });

    const selects = screen.getAllByTestId("mock-select");
    fireEvent.change(selects[0], { target: { value: "1" } });
    fireEvent.change(selects[1], { target: { value: "1" } });

    fireEvent.click(screen.getByText("CREATE PRODUCT"));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith("Product Created Successfully");
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard/admin/products");
    });
  });

  test('handleCreate: success === false -> calls toast.error', async () => {
    axios.post.mockResolvedValue({ 
      data: { 
        success: false,
        message: 'unsuccessful creation',
      } 
    });

    render(<CreateProduct />);

    fireEvent.change(screen.getByPlaceholderText("write a name"), { target: { value: "Test Product" } });
    fireEvent.change(screen.getByPlaceholderText("write a description"), { target: { value: "Test description" } });
    fireEvent.change(screen.getByPlaceholderText("write a price"), { target: { value: "100" } });
    fireEvent.change(screen.getByPlaceholderText("write a quantity"), { target: { value: "5" } });

    const selects = screen.getAllByTestId("mock-select");
    fireEvent.change(selects[0], { target: { value: "1" } });
    fireEvent.change(selects[1], { target: { value: "1" } });

    fireEvent.click(screen.getByText("CREATE PRODUCT"));
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('unsuccessful creation');
    });
  });

  test('handleCreate: handles errors -> calls console log and toast.error', async () => {
    const mockError = new Error("[handleCreate] Network Error");
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    axios.post.mockRejectedValue(mockError);
    
    render(<CreateProduct />);

    fireEvent.change(screen.getByPlaceholderText("write a name"), { target: { value: "Test Product" } });
    fireEvent.change(screen.getByPlaceholderText("write a description"), { target: { value: "Test description" } });
    fireEvent.change(screen.getByPlaceholderText("write a price"), { target: { value: "100" } });
    fireEvent.change(screen.getByPlaceholderText("write a quantity"), { target: { value: "5" } });

    const selects = screen.getAllByTestId("mock-select");
    fireEvent.change(selects[0], { target: { value: "1" } });
    fireEvent.change(selects[1], { target: { value: "1" } });

    fireEvent.click(screen.getByText("CREATE PRODUCT"));

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(mockError);
      expect(toast.error).toHaveBeenCalledWith("something went wrong");
    });

    consoleSpy.mockRestore()
  });
});
