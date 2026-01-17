/**
 * Mock for react-router-dom
 * Provides minimal router functionality for testing
 */

import React from 'react';

export const BrowserRouter = ({ children }) => <div data-testid="browser-router">{children}</div>;
export const Routes = ({ children }) => <div data-testid="routes">{children}</div>;
export const Route = ({ element }) => <div data-testid="route">{element}</div>;
export const Link = ({ to, children, ...props }) => (
  <a href={to} data-testid="link" {...props}>
    {children}
  </a>
);
export const NavLink = ({ to, children, ...props }) => (
  <a href={to} data-testid="nav-link" {...props}>
    {children}
  </a>
);
export const useNavigate = () => jest.fn();
export const useLocation = () => ({ pathname: '/', search: '', hash: '', state: null });
export const useParams = () => ({});
export const useSearchParams = () => [new URLSearchParams(), jest.fn()];
export const useRouteMatch = () => ({ path: '/', url: '/', params: {}, isExact: true });
export const useHistory = () => ({
  push: jest.fn(),
  replace: jest.fn(),
  goBack: jest.fn(),
  goForward: jest.fn(),
  location: { pathname: '/', search: '', hash: '', state: null },
});
export const Router = BrowserRouter;
export const HashRouter = BrowserRouter;
export const MemoryRouter = BrowserRouter;
export const Switch = Routes;
export const Redirect = ({ to }) => <div data-testid="redirect" data-to={to} />;

export default {
  BrowserRouter,
  Routes,
  Route,
  Link,
  NavLink,
  useNavigate,
  useLocation,
  useParams,
  useSearchParams,
  useRouteMatch,
  useHistory,
  Router,
  HashRouter,
  MemoryRouter,
  Switch,
  Redirect,
};

