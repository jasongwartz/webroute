import { createBuilder } from "./handler";
import { RouteMeta } from "./handler/types";
export { registerRoutes } from "./register-routes";
export { type DiscoveredRoute, discoverRoutes } from "./discover-routes";

// Export all types
export type * from "./handler";
export type * from "./handler/types";
export type * from "./parser";
export type * from "./parser/types";
export type * from "./discover-routes";
export type * from "./register-routes";

export type DefaultConfig = {
  $types: {
    meta: RouteMeta;
    ctx: {};
  };
};

export const route = <TPath extends string>(path?: TPath) =>
  createBuilder<DefaultConfig>({ path });
