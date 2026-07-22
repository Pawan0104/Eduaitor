import { Component } from "react";
import { useLocation } from "react-router-dom";

class ErrorBoundaryInner extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, path: props.path };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  static getDerivedStateFromProps(props, state) {
    if (props.path !== state.path) {
      return { error: null, path: props.path };
    }
    return null;
  }

  componentDidCatch(error, info) {
    console.error("App crash:", error, info);
  }

  render() {
    if (this.state.error) {
      const msg = this.state.error?.message || String(this.state.error);
      const stack = this.state.error?.stack || "";
      return (
        <div
          style={{
            padding: 24,
            fontFamily: "ui-monospace, monospace",
            color: "#7f1d1d",
            background: "#fef2f2",
            minHeight: "100vh",
            whiteSpace: "pre-wrap",
          }}
        >
          <h1 style={{ fontSize: 18, marginBottom: 12 }}>UI crashed</h1>
          <p style={{ marginBottom: 12 }}>{msg}</p>
          <pre style={{ fontSize: 11, overflow: "auto" }}>{stack}</pre>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            style={{
              marginTop: 16,
              padding: "8px 14px",
              borderRadius: 8,
              border: "1px solid #fecaca",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/** Resets when the route changes so one bad page doesn't blank the whole app. */
export default function ErrorBoundary({ children }) {
  const location = useLocation();
  return (
    <ErrorBoundaryInner path={location.pathname + location.search}>
      {children}
    </ErrorBoundaryInner>
  );
}
