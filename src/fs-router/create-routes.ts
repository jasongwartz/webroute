import { FSRouterFormattedRoute } from "./format";
import { isCompiledRoute } from "../route/handler";
import { route } from "../../dist";
import { AnyRequestHandlerModified } from "../util";
import { AnyCompiledRoute, HttpMethod } from "../route/handler/types";
import { Log } from "../internal/logger";
export type * from "./format";
export { NextJS } from "./formats/nextjs";

const AllMethods: HttpMethod[] = [
  "delete",
  "get",
  "head",
  "options",
  "patch",
  "post",
  "put",
];

export const createRoutes = (
  path: FSRouterFormattedRoute & { relativePath: string },
  mod: any
): AnyCompiledRoute[] => {
  const { relativePath, pathMatch } = path;
  Log("Module", mod);
  Log("Path", path.relativePath, `(${pathMatch})`);

  const isPathMethodless =
    path.methods === "*" ||
    (path.methods.length === 1 && path.methods[0] === "*");

  const _default = mod.default;

  const handlers: Record<string, any> = {
    default: mod.default,
  };

  for (const method of AllMethods) {
    const methodUpper = method.toUpperCase();

    // Precedence defined here.
    // Using _default in case of synthetic default imports
    handlers[method] =
      mod[methodUpper] ??
      mod[method] ??
      _default?.[methodUpper] ??
      _default?.[method];
  }

  const routes: AnyCompiledRoute[] = [];

  // Rules:
  // - .methods() is always ignored, unless default export
  // - When there is more than one handler, both are registered
  for (const method in handlers) {
    const handler = handlers[method];

    if (handler == null) {
      continue;
    }

    Log("Method", method);

    if (typeof handler !== "function") {
      Log("Handler is not function.");
      continue;
    }

    let compiled = route(pathMatch).method(
      method === "default" ? "all" : method
    );
    let handlerFn = handler as AnyRequestHandlerModified;

    if (isCompiledRoute(handler)) {
      // Copy existing fields over
      if (handler._def.meta) {
        compiled = compiled.meta(handler._def.meta);
      }
      if (handler._def.body) {
        compiled = compiled.body(handler._def.body.schema);
      }
      if (handler._def.query) {
        compiled = compiled.query(handler._def.query.schema);
      }
      if (handler._def.params) {
        compiled = compiled.params(handler._def.params.schema);
      }
      if (handler._def.output) {
        compiled = compiled.output(handler._def.output.schema);
      }
      if (handler._def.rawHandler) {
        handlerFn = handler._def.rawHandler;
      }
      if (method === "default" && handler._def.methods) {
        compiled = compiled.method(handler._def.methods);
      }

      if (handler._def.path != null) {
        console.warn(
          `[${relativePath}] Handler for '${method}' method specifies a route path which will be ignored for the path derived from the file system.`
        );
      }

      if (handler._def.methods && handler._def.methods.length > 0) {
        if (method === "default") {
          for (const specifiedMethod of handler._def.methods) {
            if (handlers[specifiedMethod] != null) {
              console.info(
                `[${relativePath}] Both default and a named export will handle the ${specifiedMethod} method.`
              );
            }
          }
        } else {
          console.warn(
            `[${relativePath}] Handler for '${method}' method specifies .methods() which will be ignored in favour of '${method}'.`
          );
        }
      }
    }

    if (!isPathMethodless) {
      for (const method of compiled._def.methods ?? []) {
        if (!path.methods.includes(method)) {
          console.warn(
            `[${relativePath}] Router format only expects methods including ${path.methods}, but method ${method} was provided.`
          );
        }
      }
    }

    routes.push(compiled.handle(handlerFn));
  }

  return routes;
};
