import React from "react";
import { Links, Meta, Outlet, Scripts, ScrollRestoration, isRouteErrorResponse, useRouteError } from "react-router";
import type { ReactNode } from "react";
import { ThemeProvider, themeBootstrap } from "./components/Theme";
import "./style.css";
import "./timeline.css";

export function Layout({ children }: {children: ReactNode}) {
  return <html lang="en"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><meta name="theme-color" content="#f7f6f2"/><Meta/><link rel="icon" href="/petal-mark.svg" type="image/svg+xml"/><Links/></head><body suppressHydrationWarning><script dangerouslySetInnerHTML={{__html:themeBootstrap}}/>{children}<ScrollRestoration/><Scripts/></body></html>;
}
export default function App() { return <ThemeProvider><Outlet/></ThemeProvider>; }
export function ErrorBoundary() {
  const error = useRouteError();
  const missing = isRouteErrorResponse(error) && error.status === 404;
  return <main><h1>{missing ? "Page not found" : "Unable to open the manual"}</h1><p><a href="/">Return to the Petal manual</a></p></main>;
}
