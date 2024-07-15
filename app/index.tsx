import { render } from "@hono/hono/jsx/dom";
import App from "./pages/app.tsx";

render(<App />, document.getElementById("app"));