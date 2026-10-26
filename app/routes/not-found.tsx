import React from "react";
import { Link } from "react-router";
export function meta() { return [{title:"Page not found — Petal field guide"}]; }
export default function NotFound() { return <main><h1>Page not found</h1><p><Link to="/">Return to the Petal manual</Link></p></main>; }
