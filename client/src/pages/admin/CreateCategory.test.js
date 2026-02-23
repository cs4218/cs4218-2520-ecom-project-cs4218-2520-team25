import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import axios from "axios";
import toast from "react-hot-toast";
import CreateCategory from "./CreateCategory";

// Danielle Loh, A0257220N

// --- MOCK DEPENDENCIES ---
jest.mock("axios");

jest.mock("react-hot-toast", () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

jest.mock("antd", () => ({
  Modal: ({ children, onCancel, open }) => 
    open ? (
      <div data-testid="modal">
        <button data-testid="close-modal" onClick={onCancel}>
          Close
        </button>
        {children}
      </div> 
    ) : null,
}));

jest.mock("./../../components/Layout", () => ({
  __esModule: true,
  default: ({ children }) => <div data-testid="layout">{children}</div>,
}));

jest.mock("./../../components/AdminMenu", () => ({
  __esModule: true,
  default: () => <div data-testid="admin-menu">Admin Menu</div>,
}));

jest.mock("../../components/Form/CategoryForm", () => ({
  __esModule: true,
  default: ({ handleSubmit, value, setValue }) => (
    <form onSubmit={handleSubmit} data-testid="category-form">
      <input
        placeholder="Enter new category"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button type="submit">Submit</button>
    </form>
  ),
}));

// --- test ---
describe("CreateCategory", () => {
  const mockCategories = [
    { _id: "1", name: "Electronics" },
    { _id: "2", name: "Clothing" },
  ];

  beforeEach(() => {
    axios.get.mockResolvedValue({ data: { success: true, category: mockCategories } });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ---
  // RENDERING OF COMPONENTS
  // ---
  test('renders all components (layout, admin menu, heading, category form)', async () => {  
    render(<CreateCategory />);

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalled();
    });

    const heading = screen.getByRole('heading', {
      level: 1,
      name: /manage category/i
    });

    expect(screen.getByTestId('layout')).toBeInTheDocument();
    expect(heading).toBeInTheDocument();
    expect(screen.getByTestId('admin-menu')).toBeInTheDocument();
    expect(screen.getByTestId('category-form')).toBeInTheDocument();
  });

  test('renders table with categories', async () => {
    render(<CreateCategory />);

    await waitFor(() => {
      expect(screen.getByText("Electronics")).toBeInTheDocument();
      expect(screen.getByText("Clothing")).toBeInTheDocument();
    });

    expect(screen.getAllByText("Edit").length).toBe(2);
    expect(screen.getAllByText("Delete").length).toBe(2);
  });

  test('modal closes when onCancel is triggered', async () => {
    render(<CreateCategory />);

    await screen.findByText("Electronics");

    fireEvent.click(screen.getAllByText("Edit")[0]);

    expect(screen.getByTestId("modal")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("close-modal"));

    await waitFor(() => {
      expect(screen.queryByTestId("modal")).not.toBeInTheDocument();
    });
  });

  // ---
  // FETCH ON MOUNT
  // ---
  test('fetches categories on mount', async () => {
    render(<CreateCategory />);

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
    });
  });

  // ---
  // HANDLE SUBMIT
  // ---
  test('handleSubmit: successful submission -> calls toast.success and getAllCategory', async () => {
    const mockData = { data: { success: true } };
    axios.post.mockResolvedValue(mockData);

    render(<CreateCategory />);

    const form = screen.getByTestId('category-form');
    const inputElement = screen.getByPlaceholderText('Enter new category');

    fireEvent.change(inputElement, { target: { value: "test category" } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        "/api/v1/category/create-category", 
        { name: "test category" }
      );
      expect(toast.success).toHaveBeenCalledWith("test category is created");
      expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
    });
  });

  test('handleSubmit: success === false -> calls toast.error', async () => {
    const mockData = { data: { success: false, message: "handle submission failed" } };
    axios.post.mockResolvedValue(mockData);

    render(<CreateCategory />);

    const form = screen.getByTestId('category-form');
    const inputElement = screen.getByPlaceholderText('Enter new category');

    fireEvent.change(inputElement, { target: { value: "test category" } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("handle submission failed");
    });
  });

  test('handleSubmit: handles errors -> console logs error and calls toast.error', async () => {
    const mockError = new Error("[handleSubmit] Network Error");
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    axios.post.mockRejectedValue(mockError);

    render(<CreateCategory />);

    const form = screen.getByTestId('category-form');
    const inputElement = screen.getByPlaceholderText('Enter new category');

    fireEvent.change(inputElement, { target: { value: "test category" } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(mockError);
      expect(toast.error).toHaveBeenCalledWith("something went wrong in input form");
    });

    consoleSpy.mockRestore()
  });

  // ---
  // GETALLCATEGORY
  // ---
  test('getAllCategory: success === false -> does not update categories', async () => {
    axios.get.mockResolvedValue({ data: { success: false } });

    render(<CreateCategory />);

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalled();
    });

    expect(screen.queryByText("Electronics")).not.toBeInTheDocument();
  });

  test('getAllCategory: handles errors -> console logs errors and calls toast.error', async () => {
    const mockError = new Error('[getAllCategory] Network error');
    const consoleSpy = jest.spyOn(console, 'log'). mockImplementation(() => {});
    axios.get.mockRejectedValue(mockError);

    render(<CreateCategory />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Something went wrong in getting category");
      expect(consoleSpy).toHaveBeenCalledWith(mockError);
    });

    consoleSpy.mockRestore();
  });

  // ---
  // UPDATE CATEGORY
  // ---
  test('handleUpdate: successful update -> calls API and toast.success', async () => {
    axios.put.mockResolvedValue({
      data: {
        success: true,
      },
    });

    render(<CreateCategory />);

    await screen.findByText("Electronics");
    
    fireEvent.click(screen.getAllByText("Edit")[0]);

    const modal = screen.getByTestId("modal");
    const input = within(modal).getByPlaceholderText("Enter new category");

    fireEvent.change(input, {
      target: { value: "Updated Cat" },
    });

    const form = within(modal).getByTestId("category-form");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(axios.put).toHaveBeenCalledWith(
        "/api/v1/category/update-category/1",
        { name: "Updated Cat" }
      );
      expect(toast.success).toHaveBeenCalledWith("Updated Cat is updated");
    }); 
  });

  test('handleUpdate: success === fail -> calls toast.error', async () => {
    axios.put.mockResolvedValue({
      data: {
        success: false,
        message: "Update unsuccessful",
      },
    });

    render(<CreateCategory />);

    await screen.findByText("Electronics");

    fireEvent.click(screen.getAllByText("Edit")[0]);

    const modal = screen.getByTestId("modal");
    const input = within(modal).getByPlaceholderText("Enter new category");

    fireEvent.change(input, {
      target: { value: "Updated Cat" },
    });

    const form = within(modal).getByTestId("category-form");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Update unsuccessful");
    }); 
  });

  test('handleUpdate: handle errors -> calls toast.error', async () => {
    const mockError = new Error('[handleUpdate] Network error');
    const consoleSpy = jest.spyOn(console, 'log'). mockImplementation(() => {});
    axios.put.mockRejectedValue(mockError);

    render(<CreateCategory />);

    await screen.findByText("Electronics");

    fireEvent.click(screen.getAllByText("Edit")[0]);

    const modal = screen.getByTestId("modal");
    const input = within(modal).getByPlaceholderText("Enter new category");

    fireEvent.change(input, {
      target: { value: "Updated Cat" },
    });

    const form = within(modal).getByTestId("category-form");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(mockError);
      expect(toast.error).toHaveBeenCalledWith("Something went wrong");
    });

    consoleSpy.mockRestore();
  });

  // ---
  // DELETE CATEGORY
  // ---
  test('handleDelete: successful deletion -> calls API, toast.success, and refetches categories', async () => {
    axios.delete.mockResolvedValue({
      data: { success: true }
    });

    render(<CreateCategory />);

    await screen.findByText("Electronics");

    fireEvent.click(screen.getAllByText("Delete")[0]);

    await waitFor(() => {
      expect(axios.delete).toHaveBeenCalledWith("/api/v1/category/delete-category/1");
      expect(toast.success).toHaveBeenCalledWith("category is deleted");
      expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
    });
  });

  test('handleDelete: success === false -> calls toast.error', async () => {
    axios.delete.mockResolvedValue({
      data: {
        success: false,
        message: "delete failed",
      }
    });

    render(<CreateCategory />);

    await screen.findByText("Electronics");

    fireEvent.click(screen.getAllByText("Delete")[0]);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("delete failed");
    });
  });

  test('handleDelete: handles errors -> console logs, calls toast.error', async () => {
    const mockError = new Error('[handleDelete] Network error');
    const consoleSpy = jest.spyOn(console, 'log'). mockImplementation(() => {});
    axios.delete.mockRejectedValue(mockError);

    render(<CreateCategory />);

    await screen.findByText("Electronics");

    fireEvent.click(screen.getAllByText("Delete")[0]);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(mockError);
      expect(toast.error).toHaveBeenCalledWith("Something went wrong");
    });
  });
});
