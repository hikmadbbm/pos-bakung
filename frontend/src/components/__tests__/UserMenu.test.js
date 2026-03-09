import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import UserMenu from "../UserMenu";
import { ToastProvider } from "../ui/use-toast";
import { api, getAuth, setAuth } from "../../lib/api";
import { useRouter } from "next/navigation";

// Mock dependencies
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

jest.mock("../../lib/api", () => ({
  api: {
    get: jest.fn(),
  },
  getAuth: jest.fn(),
  setAuth: jest.fn(),
}));

describe("UserMenu Component", () => {
  const mockRouter = { push: jest.fn() };

  beforeEach(() => {
    useRouter.mockReturnValue(mockRouter);
    jest.clearAllMocks();
    api.get.mockResolvedValue(null);
  });

  test("renders the user button with default initial 'U' when no user data", () => {
    getAuth.mockReturnValue(null);
    render(
      <ToastProvider>
        <UserMenu />
      </ToastProvider>
    );
    
    const button = screen.getByTestId("user-menu-button");
    expect(button).toBeInTheDocument();
    expect(screen.getByText("U")).toBeInTheDocument();
  });

  test("renders user initials when user data is present", () => {
    getAuth.mockReturnValue({ username: "John Doe" });
    render(
      <ToastProvider>
        <UserMenu />
      </ToastProvider>
    );
    
    expect(screen.getByText("J")).toBeInTheDocument();
  });

  test("renders avatar when user has avatar", () => {
    getAuth.mockReturnValue({ username: "John", avatar: "http://example.com/avatar.png" });
    render(
      <ToastProvider>
        <UserMenu />
      </ToastProvider>
    );
    
    const img = screen.getByAltText("Avatar");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "http://example.com/avatar.png");
  });

  test("opens menu on click", () => {
    getAuth.mockReturnValue({ username: "Admin User", role: "admin" });
    render(
      <ToastProvider>
        <UserMenu />
      </ToastProvider>
    );
    
    const button = screen.getByTestId("user-menu-button");
    fireEvent.click(button);
    
    const popup = screen.getByTestId("user-menu-popup");
    expect(popup).toBeInTheDocument();
    expect(screen.getByText("Admin User")).toBeInTheDocument();
    expect(screen.getByText("admin")).toBeInTheDocument();
  });

  test("closes menu on outside click", () => {
    getAuth.mockReturnValue({ username: "Test" });
    render(
      <ToastProvider>
        <UserMenu />
      </ToastProvider>
    );
    
    // Open menu
    fireEvent.click(screen.getByTestId("user-menu-button"));
    expect(screen.getByTestId("user-menu-popup")).toBeInTheDocument();
    
    // Click outside
    fireEvent.mouseDown(document.body);
    
    expect(screen.queryByTestId("user-menu-popup")).not.toBeInTheDocument();
  });

  test("closes menu on ESC key", () => {
    getAuth.mockReturnValue({ username: "Test" });
    render(
      <ToastProvider>
        <UserMenu />
      </ToastProvider>
    );
    
    // Open menu
    fireEvent.click(screen.getByTestId("user-menu-button"));
    expect(screen.getByTestId("user-menu-popup")).toBeInTheDocument();
    
    // Press ESC
    fireEvent.keyDown(document, { key: "Escape" });
    
    expect(screen.queryByTestId("user-menu-popup")).not.toBeInTheDocument();
  });

  test("calls logout and redirects on sign out click", async () => {
    getAuth.mockReturnValue({ id: 1, username: "Test" });
    render(
      <ToastProvider>
        <UserMenu />
      </ToastProvider>
    );
    
    // Open menu
    fireEvent.click(screen.getByTestId("user-menu-button"));
    
    // Click Logout
    const logoutBtn = screen.getByTestId("logout-button");
    fireEvent.click(logoutBtn);
    
    await waitFor(() => {
      expect(setAuth).toHaveBeenCalledWith(null, null);
      expect(mockRouter.push).toHaveBeenCalledWith("/login");
    });
  });
});
