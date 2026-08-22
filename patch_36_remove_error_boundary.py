#!/usr/bin/env python3
# Run from your project root: python3 patch_36_remove_error_boundary.py
path = 'src/App.jsx'
with open(path) as f:
    content = f.read()

def do_replace(content, old, new, label):
    count = content.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly 1 match, found {count}. Stopping without further changes -- paste this error back and we'll fix it.")
    return content.replace(old, new)

# --- Edit 1: remove the Component import and the whole error boundary class ---
old_class = """import OnboardingCarousel from './components/OnboardingCarousel';
import { Component } from 'react';

// TEMPORARY debugging tool -- shows the actual crash message on screen
// instead of a silent blank page, so we can see mobile errors without
// needing a cable-connected remote debugger. Remove once the real bug
// is found and fixed.
class OnboardingErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: '#fff',
            zIndex: 3000,
            padding: 24,
            fontFamily: 'monospace',
            fontSize: 13,
            overflow: 'auto',
          }}
        >
          <h2 style={{ color: '#c0392b' }}>Onboarding crashed:</h2>
          <p>{this.state.error.message}</p>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{this.state.error.stack}</pre>
          <button onClick={() => window.location.reload()}>Reload</button>
        </div>
      );
    }
    return this.props.children;
  }
}"""

new_class = "import OnboardingCarousel from './components/OnboardingCarousel';"

content = do_replace(content, old_class, new_class, "Edit 1 (remove class + import)")

# --- Edit 2: revert the whole-app wrap opening ---
content = do_replace(
    content,
    """  return (
    <OnboardingErrorBoundary>
    <div className="app">""",
    """  return (
    <div className="app">""",
    "Edit 2 (revert wrap opening)"
)

# --- Edit 3: revert the whole-app wrap closing ---
content = do_replace(
    content,
    """    </div>
    </OnboardingErrorBoundary>
  );
}""",
    """    </div>
  );
}""",
    "Edit 3 (revert wrap closing)"
)

# --- Edit 4: revert the onboarding-specific wrap ---
old_onboarding_wrap = """      {showOnboarding && (
        <OnboardingErrorBoundary>
          <OnboardingCarousel
            totalStairways={totalStairways}
            onDismiss={dismissOnboarding}
          />
        </OnboardingErrorBoundary>
      )}"""

new_onboarding_wrap = """      {showOnboarding && (
        <OnboardingCarousel
          totalStairways={totalStairways}
          onDismiss={dismissOnboarding}
        />
      )}"""

content = do_replace(content, old_onboarding_wrap, new_onboarding_wrap, "Edit 4 (revert onboarding wrap)")

with open(path, 'w') as f:
    f.write(content)

print(f"Done: {path} -- temporary error boundary fully removed, back to clean state.")
