import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CategoryForm from "./CategoryForm";

// Danielle Loh, A0257220N
describe('CategoryForm', () => {
  let handleSubmitMock;
  let setValueMock;

  beforeEach(() => {
    handleSubmitMock = jest.fn((e) => e.preventDefault());
    setValueMock = jest.fn();
  });

  test("renders input and submit button", () => {
    render(
      <CategoryForm 
        handleSubmit={handleSubmitMock}
        value=""
        setValue={setValueMock}
      />
    );

    const inputElement = screen.getByPlaceholderText("Enter new category");
    const submitButton = screen.getByRole("button", {
      name: /submit/i
    });

    expect(inputElement).toBeInTheDocument();
    expect(submitButton).toBeInTheDocument();
  });

  test('input displays the correct value', () => {
    render(
      <CategoryForm
        handleSubmit={handleSubmitMock}
        value="test category"
        setValue={setValueMock}
      />
    );

    const inputElement = screen.getByPlaceholderText("Enter new category");
    expect(inputElement.value).toBe("test category");
  });

  test("calls setValue on input change", () => {
    render(
      <CategoryForm 
        handleSubmit={handleSubmitMock}
        value=""
        setValue={setValueMock}
      />
    );

    const inputElement = screen.getByPlaceholderText("Enter new category");
    fireEvent.change(inputElement, { target: { value: "test category" } });

    expect(setValueMock).toHaveBeenCalledTimes(1);
    expect(setValueMock).toHaveBeenCalledWith("test category");
  });

  test("calls handleSubmit on form submit", () => {
    render(
      <CategoryForm 
        handleSubmit={handleSubmitMock}
        value="test category"
        setValue={setValueMock}
      />
    );

    const submitButton = screen.getByRole("button", {
      name: /submit/i
    });
    userEvent.click(submitButton);

    expect(handleSubmitMock).toHaveBeenCalledTimes(1);
  });
});