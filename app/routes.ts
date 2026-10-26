import { index, route, type RouteConfig } from "@react-router/dev/routes";
export default [index("routes/chapter.tsx"), route(":chapter", "routes/chapter.tsx", {id:"chapter"}), route("*", "routes/not-found.tsx")] satisfies RouteConfig;
