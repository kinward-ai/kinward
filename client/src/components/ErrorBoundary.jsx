import { Component } from "react";

/**
 * ErrorBoundary — catches any React render error and shows a
 * friendly recovery screen instead of a white page.
 *
 * Class component required — React has no hook equivalent for
 * componentDidCatch / getDerivedStateFromError.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("[kinward] UI crash caught by ErrorBoundary:", error, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div style={styles.container}>
        <svg width="48" height="48" viewBox="0 0 24 28" fill="none">
          <path
            d="M12 1L2 5.5V12.5C2 19.5 6.5 25.5 12 27C17.5 25.5 22 19.5 22 12.5V5.5L12 1Z"
            stroke="#D4622B"
            strokeWidth="2"
            fill="none"
          />
          <circle cx="12" cy="13" r="2" fill="#D4622B" />
        </svg>

        <h1 style={styles.title}>Something went wrong</h1>
        <p style={styles.body}>
          Kinward hit an unexpected error. Your data is safe — nothing was lost.
        </p>

        {this.state.error && (
          <pre style={styles.errorBox}>
            {this.state.error.message || "Unknown error"}
          </pre>
        )}

        <div style={styles.buttons}>
          <button style={styles.primaryBtn} onClick={this.handleReload}>
            Reload Kinward
          </button>
          <button style={styles.secondaryBtn} onClick={this.handleReset}>
            Try to recover
          </button>
        </div>

        <p style={styles.hint}>
          If this keeps happening, check the browser console (F12) and the server terminal for details.
        </p>
      </div>
    );
  }
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    width: "100vw",
    background: "#FAF6F1",
    fontFamily: "'Lora', Georgia, serif",
    padding: 32,
    gap: 16,
    textAlign: "center",
  },
  title: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 20,
    fontWeight: 500,
    color: "#2C2C2C",
    letterSpacing: 2,
    marginTop: 8,
  },
  body: {
    fontSize: 15,
    color: "#6B6B6B",
    maxWidth: 420,
    lineHeight: 1.6,
  },
  errorBox: {
    background: "#FFFDF9",
    border: "1px solid #E8E4DF",
    borderRadius: 10,
    padding: "12px 20px",
    fontSize: 12,
    fontFamily: "'DM Mono', monospace",
    color: "#C44B4B",
    maxWidth: 480,
    overflow: "auto",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  buttons: {
    display: "flex",
    gap: 12,
    marginTop: 8,
  },
  primaryBtn: {
    padding: "10px 28px",
    background: "#D4622B",
    color: "white",
    border: "none",
    borderRadius: 10,
    fontFamily: "'DM Mono', monospace",
    fontSize: 14,
    cursor: "pointer",
  },
  secondaryBtn: {
    padding: "10px 28px",
    background: "transparent",
    color: "#D4622B",
    border: "1px solid #D4622B",
    borderRadius: 10,
    fontFamily: "'DM Mono', monospace",
    fontSize: 14,
    cursor: "pointer",
  },
  hint: {
    fontSize: 12,
    color: "#6B6B6B",
    fontFamily: "'DM Mono', monospace",
    marginTop: 8,
    maxWidth: 400,
  },
};
