import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminMenu from "./AdminMenu";

// Danielle Loh, A0257220N
describe("AdminMenu", () => {
  test("renders Admin Panel heading", () => {
    render(
      <MemoryRouter>
        <AdminMenu />
      </MemoryRouter>
    );

    const headingElement = screen.getByRole('heading', { 
      level: 4, 
      name: /admin panel/i 
    });

    expect(headingElement).toBeInTheDocument();
  }); 

  test("renders all navlinks", () => {
    render(
      <MemoryRouter>
        <AdminMenu />
      </MemoryRouter>
    );

    const createCategoryLink = screen.getByRole("link", {
      name: /create category/i
    });
    const createProductLink = screen.getByRole("link", {
      name: /create product/i
    });
    const productsLink = screen.getByRole("link", {
      name: /products/i
    });
    const ordersLink = screen.getByRole("link", {
      name: /orders/i
    });

    expect(createCategoryLink).toBeInTheDocument();
    expect(createProductLink).toBeInTheDocument();
    expect(productsLink).toBeInTheDocument();
    expect(ordersLink).toBeInTheDocument();
  });

  test("links have correct routes", () => {
    render(
      <MemoryRouter>
        <AdminMenu />
      </MemoryRouter>
    );

    const createCategoryLink = screen.getByRole("link", {
      name: /create category/i
    });
    const createProductLink = screen.getByRole("link", {
      name: /create product/i
    });
    const productsLink = screen.getByRole("link", {
      name: /products/i
    });
    const ordersLink = screen.getByRole("link", {
      name: /orders/i
    });

    expect(createCategoryLink).toHaveAttribute("href", "/dashboard/admin/create-category");
    expect(createProductLink).toHaveAttribute("href", "/dashboard/admin/create-product");
    expect(productsLink).toHaveAttribute("href", "/dashboard/admin/products");
    expect(ordersLink).toHaveAttribute("href", "/dashboard/admin/orders");
  });
});