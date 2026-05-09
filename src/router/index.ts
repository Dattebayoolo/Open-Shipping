// ============================================================
// HASH-BASED TYPED ROUTER
// ============================================================

export interface Route {
  id: string;
  path: string;
  title: string;
  render: () => void;
}

class Router {
  private routes: Map<string, Route> = new Map();
  private currentRoute: Route | null = null;
  private notFoundHandler?: () => void;

  register(route: Route): void {
    this.routes.set(route.path, route);
  }

  setNotFound(handler: () => void): void {
    this.notFoundHandler = handler;
  }

  navigate(path: string): void {
    window.location.hash = path;
  }

  start(): void {
    window.addEventListener('hashchange', () => this.resolve());
    this.resolve();
  }

  getCurrentPath(): string {
    return window.location.hash.slice(1) || '/';
  }

  private resolve(): void {
    const path = this.getCurrentPath();
    const route = this.routes.get(path);

    if (route) {
      this.currentRoute = route;
      route.render();
      // Update document title
      document.title = `${route.title} — Open Shipping`;
      // Dispatch route change event
      window.dispatchEvent(new CustomEvent('routechange', { detail: route }));
    } else {
      // Default to dashboard
      this.navigate('/');
    }
  }

  getCurrentRoute(): Route | null {
    return this.currentRoute;
  }
}

export const router = new Router();
