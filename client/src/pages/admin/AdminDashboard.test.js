import React from "react";
import { render, screen } from "@testing-library/react";
import AdminDashboard from "./AdminDashboard";

// Danielle Loh, A0257220N
// === MOCK DEPENDENCIES --- //
jest.mock("../../context/auth", () => ({
  useAuth: () => [
    {
      user: {
        name: "Test Admin",
        email: "admin.test@gmail.com",
        phone: "81234567",
      },
    },
  ],
}));

jest.mock("./../../components/Layout", () => ({
  __esModule: true,
  default: ({ children }) => <div data-testid="layout">{children}</div>,
}))

jest.mock("../../components/AdminMenu", () => ({
  __esModule: true,
  default: () => <div data-testid="admin-menu">Admin Menu</div>,
}));

// --- TESTS --- //
describe("AdminDashboard", () => {
  test("renders content inside layout", () => {
    render(<AdminDashboard />);

    expect(screen.getByTestId("layout")).toBeInTheDocument();
  });

  test("renders admin menu component", () => {
    render(<AdminDashboard />);

    expect(screen.getByTestId("admin-menu")).toBeInTheDocument();
  });

  test("renders admin information", () => {
    render(<AdminDashboard />);

    const nameInfoElement = screen.getByRole("heading", {
      level: 3,
      name: /admin name : test admin/i
    });
    const emailInfoElement = screen.getByRole("heading", {
      level: 3,
      name: /admin email : admin.test@gmail.com/i
    });
    const contactInfoElement = screen.getByRole("heading", {
      level: 3,
      name: /admin contact : 81234567/i
    });

    expect(nameInfoElement).toBeInTheDocument();
    expect(emailInfoElement).toBeInTheDocument();
    expect(contactInfoElement).toBeInTheDocument();
  });
});